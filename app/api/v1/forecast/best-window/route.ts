import { NextResponse, NextRequest } from 'next/server';
// @ts-ignore
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Funkcja pomocnicza do pobierania i przetwarzania danych z PSE dla konkretnego dnia
async function getDayForecast(targetDateStr: string) {
  let params = new URLSearchParams({ "$filter": `business_date eq '${targetDateStr}'` });
  let pseRes = await fetch(`https://api.raporty.pse.pl/api/rce-pln?${params.toString()}`, { cache: 'no-store', headers: { 'Accept': 'application/json' } });
  
  let pseJson = pseRes.ok ? await pseRes.json() : { value: [] };
  
  if (!pseJson.value || pseJson.value.length === 0) {
    // Fallback na starszy format zapytania PSE
    const fallbackParams = new URLSearchParams({ "$filter": `doba eq '${targetDateStr}'` });
    const fallbackRes = await fetch(`https://api.raporty.pse.pl/api/rce-pln?${fallbackParams.toString()}`, { cache: 'no-store' });
    pseJson = fallbackRes.ok ? await fallbackRes.json() : { value: [] };
  }

  if (!pseJson.value || pseJson.value.length === 0) {
    return null; // Brak danych na ten dzień
  }

  let pricesArr: { time: string, price: number }[] = [];
  
  pseJson.value.forEach((row: any) => {
    const priceKwh = row.rce_pln / 1000;
    let hour = '??:??';
    const timeStr = String(row.dtime || row.udtczas || row.udtczas_oreb || row.data_czas || '');
    const timeMatch = timeStr.match(/(\d{2}:\d{2})/);
    
    if (timeMatch) { hour = timeMatch[1]; }
    else if (row.period !== undefined || row.okres !== undefined) {
      const p = parseInt(row.period || row.okres);
      if (p > 25) { 
        const h = Math.floor((p - 1) / 4);
        const m = ((p - 1) % 4) * 15;
        hour = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
      } else { hour = String(p - 1).padStart(2, '0') + ':00'; }
    }
    else if (row.godzina !== undefined) { hour = String(row.godzina).padStart(2, '0') + ':00'; }
    pricesArr.push({ time: hour, price: priceKwh });
  });

  const isQuarterHourly = pricesArr.length > 30;
  const elementsIn3Hours = isQuarterHourly ? 12 : 3;

  let bestWindowStart = '';
  let bestWindowEnd = '';
  let bestWindowAvgPrice = 9999;

  for (let i = 0; i <= pricesArr.length - elementsIn3Hours; i++) {
    let sum = 0;
    for (let j = 0; j < elementsIn3Hours; j++) sum += pricesArr[i + j].price;
    const avg = sum / elementsIn3Hours;

    if (avg < bestWindowAvgPrice) {
      bestWindowAvgPrice = avg;
      bestWindowStart = pricesArr[i].time;
      let endItem = pricesArr[i + elementsIn3Hours - 1]; 
      let endHour = parseInt(endItem.time.split(':')[0]);
      let endMin = parseInt(endItem.time.split(':')[1] || '0', 10);
      if (isQuarterHourly) { endMin += 15; if (endMin >= 60) { endHour += 1; endMin = 0; } } else { endHour += 1; }
      if (endHour >= 24) endHour = 0;
      bestWindowEnd = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
    }
  }

  return { pricesArr, bestWindowStart, bestWindowEnd, bestWindowAvgPrice, isQuarterHourly };
}

export async function GET(request: NextRequest) {
  try {
    // 0. WERYFIKACJA KLUCZA
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
    }
    const apiKey = authHeader.split(' ')[1];
    const { rows } = await pool.query('SELECT is_active FROM user_subscriptions WHERE api_key = $1', [apiKey]);
    if (rows.length === 0 || !rows[0].is_active) {
      return NextResponse.json({ error: "Nieprawidłowy klucz lub brak subskrypcji PRO." }, { status: 403 });
    }

    // 1. Ustalenie dat (Dzisiaj i Jutro)
    const polandTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Warsaw"}));
    
    const todayStr = `${polandTime.getFullYear()}-${String(polandTime.getMonth() + 1).padStart(2, '0')}-${String(polandTime.getDate()).padStart(2, '0')}`;
    
    const tomorrowTime = new Date(polandTime);
    tomorrowTime.setDate(tomorrowTime.getDate() + 1);
    const tomorrowStr = `${tomorrowTime.getFullYear()}-${String(tomorrowTime.getMonth() + 1).padStart(2, '0')}-${String(tomorrowTime.getDate()).padStart(2, '0')}`;

    // 2. Równoległe pobieranie danych
    const [todayData, tomorrowData] = await Promise.all([
      getDayForecast(todayStr),
      getDayForecast(tomorrowStr)
    ]);

    if (!todayData) {
      return NextResponse.json({ error: "Brak danych giełdowych z PSE na dzień dzisiejszy." }, { status: 404 });
    }

    // 3. Obliczanie obecnej ceny "w tej minucie" (tylko dla Dzisiaj)
    const currentH = String(polandTime.getHours()).padStart(2, '0');
    const currentM = polandTime.getMinutes();
    let roundedM = '00';
    if (todayData.isQuarterHourly) {
        if (currentM >= 45) roundedM = '45';
        else if (currentM >= 30) roundedM = '30';
        else if (currentM >= 15) roundedM = '15';
    }
    const currentTimeStr = `${currentH}:${roundedM}`;
    const currentPriceObj = todayData.pricesArr.find(p => p.time === currentTimeStr);
    const currentPricePln = currentPriceObj ? currentPriceObj.price : (todayData.pricesArr.length > 0 ? todayData.pricesArr[0].price : 0);

    // 4. Budowanie i zwrócenie wzbogaconej odpowiedzi
    return NextResponse.json({
      status: "success",
      data_source: "PSE",
      device_type: "heat_pump_or_ev",
      
      // Dane na dzisiaj
      date: todayStr,
      recommended_start: todayData.bestWindowStart,
      recommended_end: todayData.bestWindowEnd,
      avg_price_pln: Number(todayData.bestWindowAvgPrice.toFixed(4)),
      current_price_pln: Number(currentPricePln.toFixed(4)), 
      trigger_automation: true,

      // Dane na jutro (mogą być nullem rano, przed publikacją przez PSE)
      tomorrow_data_available: !!tomorrowData,
      tomorrow_date: tomorrowStr,
      tomorrow_recommended_start: tomorrowData ? tomorrowData.bestWindowStart : null,
      tomorrow_recommended_end: tomorrowData ? tomorrowData.bestWindowEnd : null,
      tomorrow_avg_price_pln: tomorrowData ? Number(tomorrowData.bestWindowAvgPrice.toFixed(4)) : null
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Wewnętrzny błąd serwera." }, { status: 500 });
  }
}