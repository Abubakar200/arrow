const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

export function rng(seed) {
  let value = seed >>> 0;
  return function () {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(array, random) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createLevels(count = 30) {
  const levels = [];
  for (let i = 0; i < count; i++) {
    let width;
    let height;
    let minLength;
    let maxLength;
    if (i === 0) {
      width = 12;
      height = 12;
      minLength = 2;
      maxLength = 6;
    } else {
      width = 12 + Math.floor(i / 5);
      height = 12 + Math.floor(i / 5);
      minLength = 2 + Math.floor(i / 15);
      maxLength = Math.min(6 + Math.floor(i / 4), 9);
    }
    levels.push({
      id: i + 1,
      w: width,
      h: height,
      lenMin: minLength,
      lenMax: maxLength,
      seed: 9001 + (i + 1) * 7919,
      shape: i,
    });
  }
  return levels;
}

export function genChains(W, H, minLen, maxLen, seed) {
  const rand = rng(seed);
  const total = W * H;
  const zone = new Set(Array.from({ length: total }, (_, i) => i));
  const occupied = new Set();
  const placed = [];
  const cellIdx = (x, y) => y * W + x;
  const idxToCell = (i) => ({ x: i % W, y: Math.floor(i / W) });
  const neighbors = (i) => {
    const { x, y } = idxToCell(i);
    const result = [];
    [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].forEach(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < W && ny >= 0 && ny < H)
        result.push(cellIdx(nx, ny));
    });
    return result;
  };

  function canExit(arrow, board) {
    const head = arrow.cells[arrow.cells.length - 1];
    const dx = DX[arrow.dir];
    const dy = DY[arrow.dir];
    let cx = head.x + dx;
    let cy = head.y + dy;
    while (cx >= 0 && cx < W && cy >= 0 && cy < H) {
      if (board[cellIdx(cx, cy)] !== -1) return false;
      cx += dx;
      cy += dy;
    }
    return true;
  }

  function canSolve(list) {
    if (!list.length) return true;
    const board = new Array(total).fill(-1);
    list.forEach((arrow, index) =>
      arrow.cells.forEach((cell) => (board[cellIdx(cell.x, cell.y)] = index)),
    );
    const removed = new Array(list.length).fill(false);
    let removedCount = 0;
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < list.length; i++) {
        if (removed[i]) continue;
        if (canExit(list[i], board)) {
          list[i].cells.forEach((cell) => (board[cellIdx(cell.x, cell.y)] = -1));
          removed[i] = true;
          removedCount++;
          changed = true;
        }
      }
    }
    return removedCount === list.length;
  }

  function isExitBlocked(arrow, occupiedCells) {
    const head = arrow.cells[arrow.cells.length - 1];
    const dx = DX[arrow.dir];
    const dy = DY[arrow.dir];
    let cx = head.x + dx;
    let cy = head.y + dy;
    while (cx >= 0 && cx < W && cy >= 0 && cy < H) {
      if (occupiedCells.has(cellIdx(cx, cy))) return true;
      cx += dx;
      cy += dy;
    }
    return false;
  }

  function dfsSnake(startIdx, targetLen) {
    const path = [];
    const visited = new Set();
    function dfs(currentIdx) {
      path.push(currentIdx);
      visited.add(currentIdx);
      if (path.length === targetLen) return true;
      const { x, y } = idxToCell(currentIdx);
      const directions = shuffled([0, 1, 2, 3], rand);
      for (const direction of directions) {
        const nx = x + DX[direction];
        const ny = y + DY[direction];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const nextIdx = cellIdx(nx, ny);
        if (!zone.has(nextIdx) || occupied.has(nextIdx) || visited.has(nextIdx))
          continue;
        if (dfs(nextIdx)) return true;
      }
      path.pop();
      visited.delete(currentIdx);
      return false;
    }
    if (dfs(startIdx)) {
      path.reverse();
      return path;
    }
    return null;
  }

  function tryCreateSnake(startIdx, targetLen) {
    const path = dfsSnake(startIdx, targetLen);
    if (!path) return null;
    const cells = path.map(idxToCell);
    let direction;
    if (cells.length >= 2) {
      const head = cells[cells.length - 1];
      const neck = cells[cells.length - 2];
      const dx = head.x - neck.x;
      const dy = head.y - neck.y;
      direction = 0;
      if (dx === 1) direction = 1;
      else if (dx === -1) direction = 3;
      else if (dy === 1) direction = 2;
    } else {
      const candidates = shuffled([0, 1, 2, 3], rand);
      direction = candidates[0];
      for (const candidate of candidates) {
        let cx = cells[0].x + DX[candidate];
        let cy = cells[0].y + DY[candidate];
        let clear = true;
        while (cx >= 0 && cx < W && cy >= 0 && cy < H) {
          if (occupied.has(cellIdx(cx, cy))) {
            clear = false;
            break;
          }
          cx += DX[candidate];
          cy += DY[candidate];
        }
        if (clear) {
          direction = candidate;
          break;
        }
      }
    }
    return { cells, dir: direction };
  }

  let addedInPass = true;
  let guard = 0;
  while (addedInPass && guard < 3000) {
    guard++;
    addedInPass = false;
    const freeCells = shuffled(
      [...zone].filter((index) => !occupied.has(index)),
      rand,
    );
    if (freeCells.length < minLen) break;
    for (const startCell of freeCells) {
      let placedThis = false;
      for (let targetLen = maxLen; targetLen >= minLen; targetLen--) {
        let best = null;
        for (let attempt = 0; attempt < 4; attempt++) {
          const candidate = tryCreateSnake(startCell, targetLen);
          if (candidate) {
            placed.push(candidate);
            if (canSolve(placed)) {
              best = candidate;
              if (isExitBlocked(candidate, occupied)) {
                placed.pop();
                break;
              }
            }
            placed.pop();
          }
        }
        if (best) {
          placed.push(best);
          best.cells.forEach((cell) => occupied.add(cellIdx(cell.x, cell.y)));
          addedInPass = true;
          placedThis = true;
          break;
        }
      }
      if (placedThis) break;
    }
  }

  function attachToTail(emptyIdx) {
    for (const neighbor of neighbors(emptyIdx)) {
      for (const arrow of placed) {
        if (!arrow.cells.length) continue;
        if (cellIdx(arrow.cells[0].x, arrow.cells[0].y) !== neighbor) continue;
        const cell = idxToCell(emptyIdx);
        arrow.cells.unshift(cell);
        occupied.add(emptyIdx);
        if (canSolve(placed)) return true;
        arrow.cells.shift();
        occupied.delete(emptyIdx);
      }
    }
    return false;
  }

  function attachToHead(emptyIdx) {
    const cell = idxToCell(emptyIdx);
    for (const neighbor of neighbors(emptyIdx)) {
      for (const arrow of placed) {
        if (!arrow.cells.length) continue;
        const headCell = arrow.cells[arrow.cells.length - 1];
        if (cellIdx(headCell.x, headCell.y) !== neighbor) continue;
        if (
          headCell.x + DX[arrow.dir] !== cell.x ||
          headCell.y + DY[arrow.dir] !== cell.y
        )
          continue;
        arrow.cells.push(cell);
        occupied.add(emptyIdx);
        if (canSolve(placed)) return true;
        arrow.cells.pop();
        occupied.delete(emptyIdx);
      }
    }
    return false;
  }

  let fillPass = true;
  let fillGuard = 0;
  while (fillPass && fillGuard < 3000) {
    fillGuard++;
    fillPass = false;
    const emptyCells = shuffled(
      [...zone].filter((index) => !occupied.has(index)),
      rand,
    );
    for (const emptyCell of emptyCells) {
      if (attachToTail(emptyCell) || attachToHead(emptyCell)) {
        fillPass = true;
        break;
      }
    }
  }

  return placed.map((arrow, index) => ({
    id: index,
    cells: arrow.cells,
    dir: arrow.dir,
    out: false,
    bonus: false,
  }));
}
