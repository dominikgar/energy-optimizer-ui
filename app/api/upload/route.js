import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const INSERT_CHUNK_SIZE = 2000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function POST(req) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Brak autoryzacji.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file.text !== 'function') {
      return NextResponse.json({ error: 'Nie znaleziono poprawnego pliku.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Plik jest zbyt duży. Maksymalny rozmiar to 10 MB.' }, { status: 413 });
    }

    const fileName = String(file.name || '').toLowerCase();
    if (fileName && !fileName.endsWith('.csv')) {
      return NextResponse.json({ error: 'Obsługiwane są wyłącznie pliki CSV.' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return NextResponse.json({ error: 'Plik jest pusty.' }, { status: 400 });
    }

    const firstFewLines = lines.slice(0, 5).join('\n');
    const separator = (firstFewLines.match(/;/g) || []).length > (firstFewLines.match(/,/g) || []).length ? ';' : ',';

    let headerIdx = -1;
    let dateCol = -1;
    let hourCol = -1;
    let valCol = -1;

    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const cols = lines[i].split(separator).map((c) => c.toLowerCase().replace(/["']/g, '').trim());
      const dIdx = cols.findIndex((c) => c.includes('data') || c.includes('czas') || c === 'od');
      const hIdx = cols.findIndex((c) => c === 'godzina' || c.includes('godz'));
      const vIdx = cols.findIndex((c) => c.includes('zużycie') || c.includes('zuzycie') || c.includes('wartość') || c.includes('wartosc') || c.includes('kwh') || c.includes('pobór') || c.includes('pobor') || c.includes('ilość'));

      if (dIdx !== -1 && vIdx !== -1) {
        headerIdx = i;
        dateCol = dIdx;
        hourCol = hIdx;
        valCol = vIdx;
        break;
      }
    }

    if (headerIdx === -1) {
      return NextResponse.json({
        error: 'Nie rozpoznano struktury pliku. Plik musi zawierać kolumny z datą i zużyciem w kWh.'
      }, { status: 400 });
    }

    const parsedDataMap = new Map();
    let skippedRows = 0;

    for (let i = headerIdx + 1; i < lines.length; i++) {
      const cols = lines[i].split(separator).map((c) => c.replace(/["']/g, '').trim());
      if (cols.length <= valCol) {
        skippedRows++;
        continue;
      }

      const dateStr = cols[dateCol];
      const hourStr = hourCol !== -1 ? cols[hourCol] : null;
      const valStr = cols[valCol].replace(',', '.');

      if (!dateStr || !valStr || Number.isNaN(Number.parseFloat(valStr))) {
        skippedRows++;
        continue;
      }

      let datePart = '';
      let dateMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        datePart = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
      } else {
        dateMatch = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (dateMatch) {
          datePart = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
        }
      }

      if (!datePart) {
        skippedRows++;
        continue;
      }

      let hour = 0;
      let minute = 0;
      let timeMatch = dateStr.match(/(\d{1,2}):(\d{2})/);

      if (timeMatch) {
        hour = Number.parseInt(timeMatch[1], 10);
        minute = Number.parseInt(timeMatch[2], 10);
      } else if (hourStr) {
        timeMatch = hourStr.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          hour = Number.parseInt(timeMatch[1], 10);
          minute = Number.parseInt(timeMatch[2], 10);
        } else if (!Number.isNaN(Number.parseInt(hourStr, 10))) {
          const parsedHour = Number.parseInt(hourStr, 10);
          hour = Math.max(0, parsedHour - 1);
        }
      }

      if (minute < 0 || minute > 59 || hour < 0) {
        skippedRows++;
        continue;
      }

      const dateObj = new Date(`${datePart}T00:00:00Z`);
      if (Number.isNaN(dateObj.getTime())) {
        skippedRows++;
        continue;
      }

      if (hour >= 24) {
        dateObj.setUTCDate(dateObj.getUTCDate() + Math.floor(hour / 24));
        hour %= 24;
      }

      const isoDate = dateObj.toISOString().split('T')[0];
      const timePart = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
      const timestampKey = `${isoDate} ${timePart}`;

      parsedDataMap.set(timestampKey, {
        user_id: userId,
        timestamp: timestampKey,
        value_kwh: Number.parseFloat(valStr),
        type: 'Pobór'
      });
    }

    const parsedData = Array.from(parsedDataMap.values());
    if (parsedData.length === 0) {
      return NextResponse.json({ error: 'Nie znaleziono poprawnych danych w pliku.' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM energy_consumption WHERE user_id = $1', [userId]);

      for (let i = 0; i < parsedData.length; i += INSERT_CHUNK_SIZE) {
        const chunk = parsedData.slice(i, i + INSERT_CHUNK_SIZE);
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

    return NextResponse.json({
      success: true,
      count: parsedData.length,
      skippedRows
    });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Błąd podczas przetwarzania pliku.' }, { status: 500 });
  }
}
