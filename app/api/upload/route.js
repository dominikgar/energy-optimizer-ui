import { Pool } from 'pg';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function POST(request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Musisz być zalogowany.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json({ error: 'Nie znaleziono pliku.' }, { status: 400 });
    }

    // 1. TYMCZASOWA KOMENDA - usuwamy starą tabelę i od razu tworzymy nową
    await pool.query('DROP TABLE IF EXISTS energy_consumption;');
    
    // 2. Tworzymy nową tabelę z kolumną user_id
    await pool.query(`
      CREATE TABLE energy_consumption (
          timestamp TIMESTAMP NOT NULL,
          value_kwh FLOAT NOT NULL,
          type TEXT NOT NULL,
          user_id TEXT NOT NULL,
          UNIQUE(timestamp, user_id)
      );
    `);

    // Reszta kodu do importu...
    const text = await file.text();
    const lines = text.split('\n');
    const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''));
    
    const dateIdx = headers.findIndex(h => h.toLowerCase().includes('data'));
    const kwhIdx = headers.findIndex(h => h.toLowerCase().includes('wartość kwh'));
    const typeIdx = headers.findIndex(h => h.toLowerCase().includes('rodzaj'));

    if (dateIdx === -1 || kwhIdx === -1) {
      return NextResponse.json({ error: 'Plik ma zły format.' }, { status: 400 });
    }

    let inserted = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = line.split(';');
      const dateStr = cols[dateIdx]?.trim().replace(/^"|"$/g, '');
      if (!dateStr || dateStr.toLowerCase() === 'nan') continue;
      
      const kwhStr = cols[kwhIdx]?.trim().replace(/^"|"$/g, '').replace(',', '.');
      const kwh = parseFloat(kwhStr);
      if (isNaN(kwh)) continue;
      
      const type = typeIdx !== -1 ? cols[typeIdx]?.trim().replace(/^"|"$/g, '') : 'pobór';
      const timestamp = new Date(dateStr).toISOString();

      await pool.query(`
        INSERT INTO energy_consumption (timestamp, value_kwh, type, user_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (timestamp, user_id) DO UPDATE SET value_kwh = EXCLUDED.value_kwh;
      `, [timestamp, kwh, type, userId]);
      
      inserted++;
    }

    return NextResponse.json({ success: true, message: `Sukces! Stara tabela zresetowana. Zaimportowano ${inserted} godzin.` });

  } catch (error) {
    console.error("Błąd serwera:", error);
    return NextResponse.json({ error: 'Błąd przetwarzania pliku.' }, { status: 500 });
  }
}
