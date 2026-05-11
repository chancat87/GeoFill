const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data', 'address-pool');

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function toCountryName(fileName) {
  return fileName
    .replace(/\.json$/i, '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function auditFile(fileName) {
  const fullPath = path.join(DATA_DIR, fileName);
  const entries = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const seen = new Set();
  const duplicates = [];
  const cities = new Set();
  let blankZip = 0;
  let blankState = 0;

  entries.forEach((entry, index) => {
    const key = [entry.address, entry.city, entry.state, entry.zipCode]
      .map(normalizeToken)
      .join('|');
    if (seen.has(key)) {
      duplicates.push(index);
    }
    seen.add(key);
    cities.add(normalizeToken(entry.city));
    if (!String(entry.zipCode || '').trim()) blankZip += 1;
    if (!String(entry.state || '').trim()) blankState += 1;
  });

  return {
    country: toCountryName(fileName),
    fileName,
    entries: entries.length,
    cities: cities.size,
    blankZip,
    blankState,
    duplicates: duplicates.length
  };
}

function main() {
  const files = fs.readdirSync(DATA_DIR)
    .filter((fileName) => fileName.endsWith('.json'))
    .sort();
  const rows = files.map(auditFile);
  const totals = rows.reduce((acc, row) => {
    acc.entries += row.entries;
    acc.blankZip += row.blankZip;
    acc.blankState += row.blankState;
    acc.duplicates += row.duplicates;
    acc.minCities = Math.min(acc.minCities, row.cities);
    return acc;
  }, {
    entries: 0,
    blankZip: 0,
    blankState: 0,
    duplicates: 0,
    minCities: Number.POSITIVE_INFINITY
  });

  console.table(rows);
  console.log(`Countries: ${rows.length}`);
  console.log(`Total entries: ${totals.entries}`);
  console.log(`Minimum cities per country: ${totals.minCities}`);
  console.log(`Blank zip rows: ${totals.blankZip}`);
  console.log(`Blank state rows: ${totals.blankState}`);
  console.log(`Duplicate rows: ${totals.duplicates}`);
}

main();
