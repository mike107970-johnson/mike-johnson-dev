import test from 'node:test'; import assert from 'node:assert/strict';
process.env.NODE_ENV='test'; const {safeDate,safeId}=await import('../server.mjs');
test('accepts only ISO calendar dates',()=>{assert.equal(safeDate('2026-07-29'),'2026-07-29');assert.equal(safeDate('29-07-2026'),null);assert.equal(safeDate('../secret'),null)});
test('accepts only bounded numeric fixture IDs',()=>{assert.equal(safeId('123456'),'123456');assert.equal(safeId('12x'),null);assert.equal(safeId('1234567890123'),null)});
