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
    
    if (!file) return NextResponse.json({ error: 'Nie znaleziono pliku.' }, { status: 400 });

    const text = await file.text();
    const lines = text.split('\n');
    const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''));
    
    // Szukamy indeksów OBU kolumn: Daty i Godziny
    const dateIdx = headers.findIndex(h => h.toLowerCase().includes('data'));
    const timeIdx = headers.findIndex(h => h.toLowerCase().includes('godz')); 
    const kwhIdx = headers.findIndex(h => h.toLowerCase().includes('wartość') || h.toLowerCase().includes('kwh'));
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

      // Magia z godziną - łączymy w całość
      let timeStr = timeIdx !== -1 ? cols[timeIdx]?.trim().replace(/^"|"$/g, '') : '';
      
      // Tauron czasem ma kaprys wpisać "24:00", co psuje serwery. Zamieniamy to na równe 00:00.
      if (timeStr.startsWith('24:')) {
        timeStr = '00:00:00';
      }
      
      const dateTimeString = timeStr ? `${dateStr} ${timeStr}` : dateStr;
      
      const kwhStr = cols[kwhIdx]?.trim().replace(/^"|"$/g, '').replace(',', '.');
      const kwh = parseFloat(kwhStr);
      if (isNaN(kwh)) continue;
      
      const type = typeIdx !== -1 ? cols[typeIdx]?.trim().replace(/^"|"$/g, '') : 'pobór';
      
      // Bezpieczne konwertowanie na znacznik czasu
      let timestamp;
      try {
        timestamp = new Date(dateTimeString).toISOString();
      } catch (e) {
        continue; // Ignorujemy śmieciowe dane w pliku
      }

      await pool.query(`
        INSERT INTO energy_consumption (timestamp, value_kwh, type, user_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (timestamp, user_id) DO UPDATE SET value_kwh = EXCLUDED.value_kwh;
      `, [timestamp, kwh, type, userId]);
      
      inserted++;
    }

    return NextResponse.json({ success: true, message: `Sukces! Poprawnie zaimportowano ${inserted} kwadransów/godzin.` });

  } catch (error) {
    console.error("Błąd serwera:", error);
    return NextResponse.json({ error: 'Błąd przetwarzania pliku.' }, { status: 500 });
  }
}
