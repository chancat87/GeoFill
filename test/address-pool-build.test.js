const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadRuntimePool() {
    const code = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'address-pool.js'), 'utf8');
    const sandbox = {
        window: {},
        globalThis: {}
    };
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);
    return {
        pool: sandbox.globalThis.LOCAL_VERIFIED_ADDRESS_POOL,
        meta: sandbox.globalThis.LOCAL_VERIFIED_ADDRESS_POOL_META
    };
}

test('generated address pool runtime covers all plugin countries', () => {
    const { pool } = loadRuntimePool();
    const pluginCountries = [
        'United States', 'United Kingdom', 'Canada', 'Australia', 'China',
        'Japan', 'South Korea', 'Germany', 'France', 'Russia', 'Spain', 'Italy',
        'Brazil', 'India', 'Singapore', 'Taiwan', 'Hong Kong', 'Mexico', 'Netherlands'
    ];

    assert.equal(Object.keys(pool).length, pluginCountries.length);
    pluginCountries.forEach((country) => {
        assert.ok(Array.isArray(pool[country]), `${country} missing`);
        assert.ok(pool[country].length >= 5, `${country} needs at least 5 entries`);
    });
});

test('generated address pool runtime exposes build metadata', () => {
    const { pool, meta } = loadRuntimePool();
    const totalEntries = Object.values(pool).reduce((sum, entries) => sum + entries.length, 0);

    assert.equal(meta.countryCount, 19);
    assert.equal(meta.totalEntries, totalEntries);
    assert.ok(meta.minEntriesPerCountry >= 5);
    assert.ok(meta.maxEntriesPerCountry >= meta.minEntriesPerCountry);
    assert.ok(meta.minCitiesPerCountry >= 5);
    assert.equal(Object.keys(meta.countryStats).length, 19);
    assert.equal(meta.countryStats['United States'].entries, pool['United States'].length);
    assert.ok(meta.countryStats['United States'].cities >= 5);
    assert.match(meta.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('country address source files are valid JSON arrays', () => {
    const dataDir = path.join(__dirname, '..', 'data', 'address-pool');
    const files = fs.readdirSync(dataDir).filter((fileName) => fileName.endsWith('.json'));

    assert.equal(files.length, 19);
    files.forEach((fileName) => {
        const entries = JSON.parse(fs.readFileSync(path.join(dataDir, fileName), 'utf8'));
        const seen = new Set();
        const cities = new Set();
        assert.ok(Array.isArray(entries), `${fileName} should be an array`);
        entries.forEach((entry, index) => {
            assert.equal(typeof entry.address, 'string', `${fileName}[${index}].address`);
            assert.equal(typeof entry.city, 'string', `${fileName}[${index}].city`);
            assert.equal(typeof entry.state, 'string', `${fileName}[${index}].state`);
            assert.equal(typeof entry.zipCode, 'string', `${fileName}[${index}].zipCode`);
            assert.notEqual(entry.address.trim(), '', `${fileName}[${index}].address empty`);
            assert.notEqual(entry.city.trim(), '', `${fileName}[${index}].city empty`);

            const key = [entry.address, entry.city, entry.state, entry.zipCode]
                .map((value) => value.trim().toLowerCase())
                .join('|');
            assert.ok(!seen.has(key), `${fileName}[${index}] duplicate address`);
            seen.add(key);
            cities.add(entry.city.trim().toLowerCase());
        });
        assert.ok(cities.size >= 5, `${fileName} should cover at least 5 cities`);
    });
});
