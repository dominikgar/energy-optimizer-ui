import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function POST(req) {
  try {
    // 1. Autoryzacja
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
    }

    // 2. Pobieranie pliku z żądania
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: "Nie znaleziono pliku." }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

    if (lines.length === 0) {
      return NextResponse.json({ error: "Plik jest pusty." }, { status: 400 });
    }

    // 3. Zgadywanie separatora (szukamy czy jest więcej średników czy przecinków)
    const firstFewLines = lines.slice(0, 5).join('\n');
    const separator = (firstFewLines.match(/;/g) || []).length > (firstFewLines.match(/,/g) || []).length ? ';' : ',';

    // 4. Analiza nagłówków (heurystyka)
    let headerIdx = -1;
    let dateCol = -1;
    let hourCol = -1;
    let valCol = -1;

    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const cols = lines[i].split(separator).map(c => c.toLowerCase().replace(/["']/g, '').trim());
      
      const dIdx = cols.findIndex(c => c.includes('data') || c.includes('czas') || c === 'od');
      const hIdx = cols.findIndex(c => c === 'godzina' || c.includes('godz'));
      const vIdx = cols.findIndex(c => c.includes('zużycie') || c.includes('zuzycie') || c.includes('wartość') || c.includes('wartosc') || c.includes('kwh') || c.includes('pobór') || c.includes('pobor') || c.includes('ilość'));

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
        error: "Nie rozpoznano struktury pliku. Upewnij się, że zawiera kolumny z datą i zużyciem (kWh)." 
      }, { status: 400 });
    }

    // 5. Parsowanie wierszy i ZAAWANSOWANE USUWANIE DUPLIKATÓW
    const parsedDataMap = new Map();
    
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const cols = lines[i].split(separator).map(c => c.replace(/["']/g, '').trim());
      if (cols.length <= valCol) continue; 

      let dateStr = cols[dateCol];
      let hourStr = hourCol !== -1 ? cols[hourCol] : null;
      let valStr = cols[valCol].replace(',', '.'); 

      if (!dateStr || !valStr || isNaN(parseFloat(valStr))) continue;

      // a) Wyciąganie daty
      let datePart = '';
      let dMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (dMatch) {
        datePart = `${dMatch[1]}-${dMatch[2]}-${dMatch[3]}`;
      } else {
        dMatch = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (dMatch) {
          datePart = `${dMatch[3]}-${dMatch[2]}-${dMatch[1]}`;
        }
      }
      
      if (!datePart) continue;

      // b) Wyciąganie czasu i normalizacja matematyczna
      let h = 0, m = 0;
      let tMatch = dateStr.match(/(\d{2}):(\d{2})/);
      
      if (tMatch) {
        h = parseInt(tMatch[1], 10);
        m = parseInt(tMatch[2], 10);
      } else if (hourStr) {
        tMatch = hourStr.match(/(\d{1,2}):(\d{2})/);
        if (tMatch) {
          h = parseInt(tMatch[1], 10);
          m = parseInt(tMatch[2], 10);
        } else if (!isNaN(parseInt(hourStr))) {
          // Format Tauron: 1 do 24.
          let parsedH = parseInt(hourStr, 10);
          h = parsedH - 1; // Przesunięcie 1 -> 00:00
          if (h < 0) h = 0;
        }
      }

      // KRYTYCZNA POPRAWKA: Przerzucamy godziny z błędów formatowania (h >= 24) 
      // na fizycznie kolejny dzień w strefie UTC. Wtedy JS tworzy poprawne klucze, a Postgres nie wariuje.
      let dateObj = new Date(`${datePart}T00:00:00Z`);
      if (h >= 24) {
        dateObj.setUTCDate(dateObj.getUTCDate() + Math.floor(h / 24));
        h = h % 24;
      }
      
      const isoDate = dateObj.toISOString().split('T')[0];
      const timePart = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
      const timestampKey = `${isoDate} ${timePart}`;

      parsedDataMap.set(timestampKey, {
        user_id: userId,
        timestamp: timestampKey,
        value_kwh: parseFloat(valStr),
        type: 'Pobór'
      });
    }

    const parsedData = Array.from(parsedDataMap.values());

    if (parsedData.length === 0) {
      return NextResponse.json({ error: "Nie znaleziono poprawnych danych w pliku." }, { status: 400 });
    }

    // 6. Bezpieczny zapis do Bazy Danych
    const chunkSize = 2000; 

    await pool.query('BEGIN');
    try {
      await pool.query('DELETE FROM energy_consumption WHERE user_id = $1', [userId]);

      for (let i = 0; i < parsedData.length; i += chunkSize) {
        const chunk = parsedData.slice(i, i + chunkSize);
        
        let query = 'INSERT INTO energy_consumption (user_id, timestamp, value_kwh, type) VALUES ';
        let values = [];
        let paramsCount = 1;

        for (const row of chunk) {
          query += `($${paramsCount++}, $${paramsCount++}, $${paramsCount++}, $${paramsCount++}),`;
          values.push(row.user_id, row.timestamp, row.value_kwh, row.type);
        }
        
        query = query.slice(0, -1); 
        query += ' ON CONFLICT (user_id, timestamp) DO UPDATE SET value_kwh = EXCLUDED.value_kwh';
        
        await pool.query(query, values);
      }

      await pool.query('COMMIT'); 
      return NextResponse.json({ success: true, count: parsedData.length });

    } catch (dbError) {
      await pool.query('ROLLBACK'); 
      throw dbError;
    }

  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: "Błąd podczas przetwarzania pliku: " + error.message }, { status: 500 });
  }
}
