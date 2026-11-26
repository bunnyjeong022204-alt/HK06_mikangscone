// Electron supplies the cursor, bounds and work area in screen DIP coordinates.
function displayEdge(point, { bounds, workArea }) {
  const { x, y } = point;
  if (x < bounds.x || x >= bounds.x + bounds.width ||
      y < workArea.y + 8 || y >= workArea.y + workArea.height - 8) return null;
  const near = (a, b) => Math.min(Math.abs(x - a), Math.abs(x - b)) < 12;
  if (near(bounds.x, workArea.x)) return 'left';
  if (near(bounds.x + bounds.width - 1, workArea.x + workArea.width - 1)) return 'right';
  return null;
}
module.exports = { displayEdge };
