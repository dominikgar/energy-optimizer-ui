import { NextResponse } from 'next/server';

// Zabezpieczenie przed cache'owaniem - API zawsze musi zwracać świeże dane
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Ustalenie aktualnej daty dla polskiej strefy czasowej
    const now = new Date();
    const polandTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Warsaw"}));
    
    const year = polandTime.getFullYear();
    const month = String(polandTime.getMonth() + 1).padStart(2, '0');
    const day = String(polandTime.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`; 
    
    // 2. Zapytanie do API PSE
    const params = new URLSearchParams({ "$filter": `business_date eq '${todayStr}'` });
    const targetUrl = `https://api.raporty.pse.pl/api/rce-pln?${params.toString()}`;
    
    const pseRes = await fetch(targetUrl, { 
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });
    
    if (!pseRes.ok) {
      return NextResponse.json({ error: "Błąd komunikacji z PSE API." }, { status: 502 });
    }

    const pseJson = await pseRes.json();
    
    if (!pseJson.value || pseJson.value.length === 0) {
      // Próba pobrania fallback (stary format)
      const fallbackParams = new URLSearchParams({ "$filter": `doba eq '${todayStr}'` });
      const fallbackRes = await fetch(`https://api.raporty.pse.pl/api/rce-pln?${fallbackParams.toString()}`, { cache: 'no-store' });
      
      if (!fallbackRes.ok) {
        return NextResponse.json({ error: "Brak danych giełdowych na ten dzień." }, { status: 404 });
      }
      
      const fallbackJson = await fallbackRes.json();
      if (!fallbackJson.value || fallbackJson.value.length === 0) {
        return NextResponse.json({ error: "Brak danych giełdowych na ten dzień." }, { status: 404 });
      }
      // Jeśli fallback zadziałał, przypisujemy go
      pseJson.value = fallbackJson.value;
    }

    // 3. Ekstrakcja i normalizacja danych
    // POPRAWKA DLA TYPESCRIPTA: Zdefiniowanie typu tablicy
    let pricesArr: { time: string, price: number }[] = [];
    
    pseJson.value.forEach((row: any) => {
      const priceKwh = row.rce_pln / 1000;
      let hour = '??:??';
      
      // Obsługa różnych formatów nazw z PSE (starych i nowych)
      const timeStr = String(row.dtime || row.udtczas || row.udtczas_oreb || row.data_czas || '');
      const timeMatch = timeStr.match(/(\d{2}:\d{2})/);
      
      if (timeMatch) { 
        hour = timeMatch[1]; 
      }
      else if (row.period !== undefined || row.okres !== undefined) {
        const p = parseInt(row.period || row.okres);
        if (p > 25) { 
          const h = Math.floor((p - 1) / 4);
          const m = ((p - 1) % 4) * 15;
          hour = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
        } else { 
          hour = String(p - 1).padStart(2, '0') + ':00'; 
        }
      }
      else if (row.godzina !== undefined) { 
        hour = String(row.godzina).padStart(2, '0') + ':00'; 
      }
      
      pricesArr.push({ time: hour, price: priceKwh });
    });
    
    // 4. Algorytm okna 3-godzinnego
    const isQuarterHourly = pricesArr.length > 30;
    const elementsIn3Hours = isQuarterHourly ? 12 : 3;

    let bestWindowStart = '';
    let bestWindowEnd = '';
    let bestWindowAvgPrice = 9999;

    for (let i = 0; i <= pricesArr.length - elementsIn3Hours; i++) {
      let sum = 0;
      for (let j = 0; j < elementsIn3Hours; j++) {
        sum += pricesArr[i + j].price;
      }
      const avg = sum / elementsIn3Hours;

      if (avg < bestWindowAvgPrice) {
        bestWindowAvgPrice = avg;
        bestWindowStart = pricesArr[i].time;
        
        let endItem = pricesArr[i + elementsIn3Hours - 1]; 
        let endHour = parseInt(endItem.time.split(':')[0]);
        let endMin = parseInt(endItem.time.split(':')[1] || 0);
        
        if (isQuarterHourly) {
            endMin += 15;
            if (endMin >= 60) { endHour += 1; endMin = 0; }
        } else {
            endHour += 1; 
        }
        
        if (endHour >= 24) endHour = 0;
        bestWindowEnd = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
      }
    }

    // 5. Zwrócenie ustandaryzowanego JSONa dla Home Assistanta
    return NextResponse.json({
      status: "success",
      date: todayStr,
      device_type: "heat_pump_or_ev",
      recommended_start: bestWindowStart,
      recommended_end: bestWindowEnd,
      avg_price_pln: Number(bestWindowAvgPrice.toFixed(4)),
      trigger_automation: true,
      data_source: "PSE"
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Wewnętrzny błąd serwera." }, { status: 500 });
  }
}
