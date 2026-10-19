const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readAll } = require('../lib/read-all');
test('exports all rows even when server caps pages below requested size', async () => {
  const source = Array.from({length: 1205}, (_, id) => ({id}));
  const offsets = [];
  const result = await readAll(() => ({range(start, end) {
    offsets.push(start);
    return Promise.resolve({data: source.slice(start, Math.min(end + 1, start + 400)), error: null});
  }}));
  assert.deepEqual(result, source);
  assert.deepEqual(offsets, [0,400,800,1200,1205]);
});
test('failed export pages are propagated instead of returning partial data', async () => {
  await assert.rejects(() => readAll(() => ({range: async start => start === 0
    ? {data: [{id:1}], error:null} : {data:null, error:new Error('database unavailable')}
  })), /database unavailable/);
});
