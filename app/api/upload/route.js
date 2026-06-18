import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { pool } from '../../../lib/db';
import { parseConsumptionCsv } from '../../../lib/csvConsumptionParser';
import { createRequestId, recordAppEvent } from '../../../lib/appEvents';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const INSERT_CHUNK_SIZE = 2000;

export async function POST(req) {
  const requestId = createRequestId(req);
  let userId = null;

  try {
    ({ userId } = auth());
    if (!userId) {
      return NextResponse.json({ error: 'Brak autoryzacji.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file.text !== 'function') {
      await recordAppEvent({
        level: 'warning',
        source: 'csv-import',
        eventType: 'validation.missing_file',
        message: 'Nie znaleziono poprawnego pliku w żądaniu importu.',
        userId,
        requestId
      });
      return NextResponse.json({ error: 'Nie znaleziono poprawnego pliku.' }, { status: 400 });
    }

    const fileMetadata = {
      file_name: String(file.name || '').slice(0, 240),
      file_size_bytes: Number(file.size || 0)
    };

    if (file.size > MAX_FILE_SIZE_BYTES) {
      await recordAppEvent({
        level: 'warning',
        source: 'csv-import',
        eventType: 'validation.file_too_large',
        message: 'Odrzucono plik przekraczający limit 10 MB.',
        userId,
        requestId,
        metadata: fileMetadata
      });
      return NextResponse.json({ error: 'Plik jest zbyt duży. Maksymalny rozmiar to 10 MB.' }, { status: 413 });
    }

    const fileName = String(file.name || '').toLowerCase();
    if (fileName && !fileName.endsWith('.csv')) {
      await recordAppEvent({
        level: 'warning',
        source: 'csv-import',
        eventType: 'validation.unsupported_extension',
        message: 'Odrzucono plik z rozszerzeniem innym niż CSV.',
        userId,
        requestId,
        metadata: fileMetadata
      });
      return NextResponse.json({ error: 'Obsługiwane są wyłącznie pliki CSV.' }, { status: 400 });
    }

    const result = parseConsumptionCsv(await file.text());
    if (result.error) {
      await recordAppEvent({
        level: 'warning',
        source: 'csv-import',
        eventType: 'validation.parser_error',
        message: result.error,
        userId,
        requestId,
        metadata: fileMetadata
      });
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const parsedData = result.rows.map((row) => ({
      user_id: userId,
      timestamp: row.timestamp,
      value_kwh: row.valueKwh,
      type: 'Pobór'
    }));

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM energy_consumption WHERE user_id = $1', [userId]);

      for (let index = 0; index < parsedData.length; index += INSERT_CHUNK_SIZE) {
        const chunk = parsedData.slice(index, index + INSERT_CHUNK_SIZE);
        const values = [];
        const placeholders = [];
        let parameterIndex = 1;

        for (const row of chunk) {
          placeholders.push(`($${parameterIndex++}, $${parameterIndex++}, $${parameterIndex++}, $${parameterIndex++})`);
          values.push(row.user_id, row.timestamp, row.value_kwh, row.type);
        }

        await client.query(`
          INSERT INTO energy_consumption (user_id, timestamp, value_kwh, type)
          VALUES ${placeholders.join(',')}
          ON CONFLICT (user_id, timestamp)
          DO UPDATE SET value_kwh = EXCLUDED.value_kwh, type = EXCLUDED.type
        `, values);
      }

      await client.query('COMMIT');
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

    await recordAppEvent({
      level: 'info',
      source: 'csv-import',
      eventType: 'import.completed',
      message: `Import zakończony: zapisano ${parsedData.length} rekordów.`,
      userId,
      requestId,
      metadata: {
        ...fileMetadata,
        imported_rows: parsedData.length,
        skipped_rows: result.skippedRows
      }
    });

    return NextResponse.json({
      success: true,
      count: parsedData.length,
      skippedRows: result.skippedRows
    });
  } catch (error) {
    console.error('Upload Error:', error);
    await recordAppEvent({
      level: 'error',
      source: 'csv-import',
      eventType: 'import.failed',
      message: 'Błąd podczas przetwarzania lub zapisu pliku CSV.',
      userId,
      requestId,
      metadata: { error }
    });
    return NextResponse.json({ error: 'Błąd podczas przetwarzania pliku.' }, { status: 500 });
  }
}
