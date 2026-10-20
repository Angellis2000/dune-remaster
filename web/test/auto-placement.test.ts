/** Аудит сети 2026-10-20, P2: готовая постройка не забирает управление армией, но при работе со двором ставится сама. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SELECTION } from '../src/engine/core.ts';
import { autoPlacement, type AutoPlacementState } from '../src/ui/auto-placement.ts';

const yard = { name: 'yard' }, other = { name: 'starport' };
const state = (s: Partial<AutoPlacementState<object>>): AutoPlacementState<object> => ({
  completed: null, queued: null, ready: () => true, hovered: () => false,
  selectedStructure: null, selectedUnits: 0, selectionType: SELECTION.STRUCTURE, ...s,
});

test('working with the yard: completed and queued ready buildings go to the cursor by themselves', () => {
  assert.equal(autoPlacement(state({ completed: yard, selectedStructure: yard })).yard, yard, 'yard selected');
  assert.equal(autoPlacement(state({ queued: yard })).yard, yard, 'next item of the queue after a placement');
  assert.equal(autoPlacement(state({ completed: yard, hovered: (y) => y === yard })).yard, yard, 'cursor over the yard');
  assert.equal(autoPlacement(state({ queued: yard, ready: () => false })).yard, null, 'nothing ready yet');
  assert.equal(autoPlacement(state({ queued: yard, ready: () => false })).keepQueue, true, 'the chain waits for the next item');
  assert.equal(autoPlacement(state({ completed: yard })).yard, null, 'completion elsewhere does not jump the camera/cursor');
});

test('army control is never stolen: selected units or targeting keep the cursor and end the chain', () => {
  for (const s of [
    state({ completed: yard, queued: yard, selectedUnits: 2 }),
    state({ completed: yard, queued: yard, selectionType: SELECTION.TARGET }),
    state({ queued: yard, selectedUnits: 1, hovered: () => true }),
  ]) {
    const d = autoPlacement(s);
    assert.equal(d.yard, null);
    assert.equal(d.keepQueue, false, 'returning to the army ends the automatic chain');
  }
  assert.equal(autoPlacement(state({ completed: yard, queued: yard, selectedStructure: other })).yard, null, 'another building is in use');
  assert.deepEqual(autoPlacement(state({ completed: yard, selectionType: SELECTION.PLACE })), { yard: null, keepQueue: true }, 'already placing');
});
