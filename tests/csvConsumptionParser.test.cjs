const test = require('node:test');
const assert = require('node:assert/strict');
const { parseConsumptionCsv } = require('../lib/csvConsumptionParser.ts');

test('parses semicolon CSV, decimal comma, numbered hours and 24:00 rollover', () => {
  const result = parseConsumptionCsv(`Raport zużycia
Data;Godzina;Zużycie [kWh]
17.06.2026;1;0,50
17.06.2026;24:00;1,25
17.06.2026;1;0,75
niepoprawna;2;brak`);

  assert.equal(result.error, null);
  assert.equal(result.skippedRows, 1);
  assert.equal(result.rows.length, 2);
  assert.deepEqual(result.rows[0], {
    timestamp: '2026-06-17 00:00:00',
    valueKwh: 0.75
  });
  assert.deepEqual(result.rows[1], {
    timestamp: '2026-06-18 00:00:00',
    valueKwh: 1.25
  });
});

test('parses ISO date and time stored in one column', () => {
  const result = parseConsumptionCsv(`Data i czas,Zużycie kWh
2026-06-17 13:15,0.25`);

  assert.equal(result.error, null);
  assert.deepEqual(result.rows, [{
    timestamp: '2026-06-17 13:15:00',
    valueKwh: 0.25
  }]);
});

test('returns a clear error for empty and unrecognized files', () => {
  assert.equal(parseConsumptionCsv('').error, 'Plik jest pusty.');
  assert.match(parseConsumptionCsv('foo;bar\n1;2').error, /Nie rozpoznano struktury pliku/);
});
