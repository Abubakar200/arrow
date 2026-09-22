export function dist(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function moveTowards(a, b, maxDist) {
  const distance = dist(a, b);
  if (distance <= maxDist || distance === 0) return { x: b.x, y: b.y };
  const t = maxDist / distance;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function pathLength(points) {
  let length = 0;
  for (let i = 0; i < points.length - 1; i++) length += dist(points[i], points[i + 1]);
  return length;
}

export function norm(dx, dy) {
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

export function roundedPath(points, radius) {
  if (points.length < 2) return "";
  let path = `M${points[0].x} ${points[0].y} `;
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const d1 = norm(p1.x - p0.x, p1.y - p0.y);
    const d2 = norm(p2.x - p1.x, p2.y - p1.y);
    const cornerRadius = Math.min(radius, dist(p0, p1) / 2, dist(p1, p2) / 2);
    const start = {
      x: p1.x - d1.x * cornerRadius,
      y: p1.y - d1.y * cornerRadius,
    };
    const end = {
      x: p1.x + d2.x * cornerRadius,
      y: p1.y + d2.y * cornerRadius,
    };
    path += `L${start.x} ${start.y} Q${p1.x} ${p1.y} ${end.x} ${end.y} `;
  }
  const last = points[points.length - 1];
  path += `L${last.x} ${last.y}`;
  return path;
}

export function sampleTrack(track, targetHeadDist, targetLength) {
  let currentDist = 0;
  let headPos = track[0];
  let headSegIdx = 0;
  for (let i = 0; i < track.length - 1; i++) {
    const segmentLength = dist(track[i], track[i + 1]);
    if (currentDist + segmentLength >= targetHeadDist) {
      const t = (targetHeadDist - currentDist) / segmentLength;
      headPos = lerp(track[i], track[i + 1], t);
      headSegIdx = i;
      break;
    }
    currentDist += segmentLength;
    if (i === track.length - 2) {
      headPos = track[i + 1];
      headSegIdx = i;
    }
  }

  const sampled = [headPos];
  let remaining = targetLength;
  let currentPoint = headPos;
  let currentIndex = headSegIdx;
  while (remaining > 0.001 && currentIndex >= 0) {
    const distanceToCorner = dist(currentPoint, track[currentIndex]);
    if (remaining > distanceToCorner) {
      if (distanceToCorner > 0.001) sampled.push(track[currentIndex]);
      remaining -= distanceToCorner;
      currentPoint = track[currentIndex];
      currentIndex--;
    } else {
      sampled.push(moveTowards(currentPoint, track[currentIndex], remaining));
      break;
    }
  }
  sampled.reverse();
  return sampled;
}
