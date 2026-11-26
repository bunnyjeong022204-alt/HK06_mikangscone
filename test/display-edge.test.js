const test = require('node:test');
const assert = require('node:assert/strict');
const { displayEdge } = require('../electron/display-edge');

test('Retina notebook uses logical coordinates at both edges', () => {
  const display = { scaleFactor: 2, bounds: { x: 0, y: 0, width: 1512, height: 982 },
    workArea: { x: 0, y: 32, width: 1512, height: 900 } };
  assert.equal(displayEdge({ x: 9, y: 100 }, display), 'left');
  assert.equal(displayEdge({ x: 1503, y: 100 }, display), 'right');
  assert.equal(displayEdge({ x: 300, y: 100 }, display), null);
});

test('side Dock on a secondary display supports both desktop and physical edges', () => {
  const bounds = { x: -1920, y: -120, width: 1920, height: 1080 };
  for (const leftDock of [true, false]) {
    const workArea = { x: bounds.x + (leftDock ? 72 : 0), y: -96, width: 1848, height: 1056 };
    const display = { bounds, workArea };
    for (const x of [bounds.x, workArea.x]) assert.equal(displayEdge({ x, y: 80 }, display), 'left');
    for (const x of [-1, workArea.x + workArea.width - 1]) assert.equal(displayEdge({ x, y: 80 }, display), 'right');
    assert.equal(displayEdge({ x: -1, y: -119 }, display), null);
  }
});
