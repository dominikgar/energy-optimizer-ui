export interface ParsedConsumptionRow {
  timestamp: string;
  valueKwh: number;
}

export interface CsvConsumptionParseResult {
  rows: ParsedConsumptionRow[];
  skippedRows: number;
  error: string | null;
}

function detectSeparator(lines: string[]): ',' | ';' {
  const sample = lines.slice(0, 5).join('\n');
  const semicolons = (sample.match(/;/g) || []).length;
  const commas = (sample.match(/,/g) || []).length;
  return semicolons > commas ? ';' : ',';
}

function normalizeCell(value: string): string {
  return value.replace(/["']/g, '').trim();
}

function parseDatePart(value: string): string | null {
  const isoMatch = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const polishMatch = value.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (polishMatch) return `${polishMatch[3]}-${polishMatch[2]}-${polishMatch[1]}`;

  return null;
}

function parseTime(dateValue: string, hourValue: string | null): { hour: number; minute: number } | null {
  let hour = 0;
  let minute = 0;
  let timeMatch = dateValue.match(/(\d{1,2}):(\d{2})/);

  if (timeMatch) {
    hour = Number.parseInt(timeMatch[1], 10);
    minute = Number.parseInt(timeMatch[2], 10);
  } else if (hourValue) {
    timeMatch = hourValue.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      hour = Number.parseInt(timeMatch[1], 10);
      minute = Number.parseInt(timeMatch[2], 10);
    } else {
      const numberedPeriod = Number.parseInt(hourValue, 10);
      if (!Number.isNaN(numberedPeriod)) {
        hour = Math.max(0, numberedPeriod - 1);
      }
    }
  }

  if (minute < 0 || minute > 59 || hour < 0) return null;
  return { hour, minute };
}

function createTimestamp(datePart: string, hour: number, minute: number): string | null {
  const date = new Date(`${datePart}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;

  if (hour >= 24) {
    date.setUTCDate(date.getUTCDate() + Math.floor(hour / 24));
    hour %= 24;
  }

  const isoDate = date.toISOString().slice(0, 10);
  return `${isoDate} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

export function parseConsumptionCsv(text: string): CsvConsumptionParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { rows: [], skippedRows: 0, error: 'Plik jest pusty.' };
  }

  const separator = detectSeparator(lines);
  let headerIndex = -1;
  let dateColumn = -1;
  let hourColumn = -1;
  let valueColumn = -1;

  for (let index = 0; index < Math.min(20, lines.length); index++) {
    const columns = lines[index]
      .split(separator)
      .map((cell) => normalizeCell(cell).toLowerCase());

    const dateIndex = columns.findIndex((cell) => cell.includes('data') || cell.includes('czas') || cell === 'od');
    const hourIndex = columns.findIndex((cell) => cell === 'godzina' || cell.includes('godz'));
    const consumptionIndex = columns.findIndex((cell) =>
      cell.includes('zużycie')
      || cell.includes('zuzycie')
      || cell.includes('wartość')
      || cell.includes('wartosc')
      || cell.includes('kwh')
      || cell.includes('pobór')
      || cell.includes('pobor')
      || cell.includes('ilość')
    );

    if (dateIndex !== -1 && consumptionIndex !== -1) {
      headerIndex = index;
      dateColumn = dateIndex;
      hourColumn = hourIndex;
      valueColumn = consumptionIndex;
      break;
    }
  }

  if (headerIndex === -1) {
    return {
      rows: [],
      skippedRows: 0,
      error: 'Nie rozpoznano struktury pliku. Plik musi zawierać kolumny z datą i zużyciem w kWh.'
    };
  }

  const rowsByTimestamp = new Map<string, ParsedConsumptionRow>();
  let skippedRows = 0;

  for (let index = headerIndex + 1; index < lines.length; index++) {
    const columns = lines[index].split(separator).map(normalizeCell);
    if (columns.length <= valueColumn) {
      skippedRows++;
      continue;
    }

    const dateValue = columns[dateColumn];
    const hourValue = hourColumn !== -1 ? columns[hourColumn] : null;
    const numericValue = Number.parseFloat(columns[valueColumn].replace(',', '.'));
    const datePart = parseDatePart(dateValue);
    const time = parseTime(dateValue, hourValue);

    if (!dateValue || !Number.isFinite(numericValue) || !datePart || !time) {
      skippedRows++;
      continue;
    }

    const timestamp = createTimestamp(datePart, time.hour, time.minute);
    if (!timestamp) {
      skippedRows++;
      continue;
    }

    rowsByTimestamp.set(timestamp, {
      timestamp,
      valueKwh: numericValue
    });
  }

  const rows = Array.from(rowsByTimestamp.values());
  if (rows.length === 0) {
    return {
      rows: [],
      skippedRows,
      error: 'Nie znaleziono poprawnych danych w pliku.'
    };
  }

  return { rows, skippedRows, error: null };
}
