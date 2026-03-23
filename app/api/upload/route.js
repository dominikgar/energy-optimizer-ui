import { Pool } from 'pg';
import { NextResponse } from 'next/server';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json({ error: 'Nie znaleziono pliku.' }, { status: 400 });
    }

    // Odczytujemy zawartość pliku jako tekst
    const text = await file.text();
    const lines = text.split('\n');
    
    // Rozszyfrowujemy nagłówki (Tauron używa średników)
    const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''));
    
    // Szukamy indeksów odpowiednich kolumn
    const dateIdx = headers.findIndex(h => h.toLowerCase().includes('data'));
    const kwhIdx = headers.findIndex(h => h.toLowerCase().includes('wartość kwh'));
    const typeIdx = headers.findIndex(h => h.toLowerCase().includes('rodzaj'));

    if (dateIdx === -1 || kwhIdx === -1) {
      return NextResponse.json({ error: 'Plik ma zły format. Brakuje kolumny Data lub Wartość kWh.' }, { status: 400 });
    }

    let inserted = 0;
    
    // Pętla po wszystkich wierszach (pomijamy nagłówek)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = line.split(';');
      const dateStr = cols[dateIdx]?.trim().replace(/^"|"$/g, '');
      
      // Omijamy puste i zepsute wiersze
      if (!dateStr || dateStr.toLowerCase() === 'nan') continue;
      
      // Zamiana polskiego przecinka na kropkę (np. 0,45 -> 0.45)
      const kwhStr = cols[kwhIdx]?.trim().replace(/^"|"$/g, '').replace(',', '.');
      const kwh = parseFloat(kwhStr);
      
      if (isNaN(kwh)) continue;
      
      const type = typeIdx !== -1 ? cols[typeIdx]?.trim().replace(/^"|"$/g, '') : 'pobór';

      // Przekształcamy datę z "YYYY-MM-DD H:MM" dla bazy danych
      const timestamp = new Date(dateStr).toISOString();

      // Zapis do bazy danych
      await pool.query(`
        INSERT INTO energy_consumption (timestamp, value_kwh, type)
        VALUES ($1, $2, $3)
        ON CONFLICT (timestamp) DO UPDATE SET value_kwh = EXCLUDED.value_kwh;
      `, [timestamp, kwh, type]);
      
      inserted++;
    }

    return NextResponse.json({ success: true, message: `Sukces! Zaimportowano ${inserted} godzin zużycia.` });

  } catch (error) {
    console.error("Błąd podczas wgrywania:", error);
    return NextResponse.json({ error: 'Wystąpił błąd serwera podczas przetwarzania pliku.' }, { status: 500 });
  }
}
