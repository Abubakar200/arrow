const DESIGN = 15;
export const SHAPE_N = 19;
const SK = DESIGN / SHAPE_N;

export function shGrid() {
  return Array.from({ length: SHAPE_N }, () => new Array(SHAPE_N).fill(false));
}

function shOr(grid, source) {
  for (let y = 0; y < SHAPE_N; y++)
    for (let x = 0; x < SHAPE_N; x++) if (source[y][x]) grid[y][x] = true;
}

function shAndNot(grid, source) {
  for (let y = 0; y < SHAPE_N; y++)
    for (let x = 0; x < SHAPE_N; x++) if (source[y][x]) grid[y][x] = false;
}

export function shCircle(cx, cy, radius) {
  const grid = shGrid();
  for (let y = 0; y < SHAPE_N; y++)
    for (let x = 0; x < SHAPE_N; x++) {
      const lx = (x + 0.5) * SK;
      const ly = (y + 0.5) * SK;
      if (Math.hypot(lx - cx, ly - cy) <= radius) grid[y][x] = true;
    }
  return grid;
}

export function shEllipse(cx, cy, radiusX, radiusY, rotation) {
  rotation = rotation || 0;
  const grid = shGrid();
  const cosine = Math.cos(-rotation);
  const sine = Math.sin(-rotation);
  for (let y = 0; y < SHAPE_N; y++)
    for (let x = 0; x < SHAPE_N; x++) {
      const lx = (x + 0.5) * SK;
      const ly = (y + 0.5) * SK;
      const px = lx - cx;
      const py = ly - cy;
      const rotatedX = px * cosine - py * sine;
      const rotatedY = px * sine + py * cosine;
      if ((rotatedX / radiusX) ** 2 + (rotatedY / radiusY) ** 2 <= 1)
        grid[y][x] = true;
    }
  return grid;
}

export function shRect(x0, y0, x1, y1) {
  const grid = shGrid();
  for (let y = 0; y < SHAPE_N; y++)
    for (let x = 0; x < SHAPE_N; x++) {
      const lx = (x + 0.5) * SK;
      const ly = (y + 0.5) * SK;
      if (lx >= x0 && lx <= x1 && ly >= y0 && ly <= y1) grid[y][x] = true;
    }
  return grid;
}

function shPointInPoly(px, py, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    )
      inside = !inside;
  }
  return inside;
}

export function shPoly(points) {
  const grid = shGrid();
  for (let y = 0; y < SHAPE_N; y++)
    for (let x = 0; x < SHAPE_N; x++) {
      const lx = (x + 0.5) * SK;
      const ly = (y + 0.5) * SK;
      if (shPointInPoly(lx, ly, points)) grid[y][x] = true;
    }
  return grid;
}

export function shStarPts(cx, cy, outerRadius, innerRadius, points, rotation) {
  rotation = rotation === undefined ? -Math.PI / 2 : rotation;
  const result = [];
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = rotation + (i * Math.PI) / points;
    result.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
  }
  return result;
}

export function shUnion(...grids) {
  const grid = shGrid();
  grids.forEach((source) => shOr(grid, source));
  return grid;
}

export function shSub(first, second) {
  const grid = shGrid();
  shOr(grid, first);
  shAndNot(grid, second);
  return grid;
}

export function shToMap(grid) {
  return grid.map((row) => row.map((value) => (value ? "#" : ".")).join(""));
}
