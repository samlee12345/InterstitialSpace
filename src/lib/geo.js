// Small planar geometry for the prototype: metres east (x) and north (y) of a centre point.
const M_PER_LAT = 110540;
const mPerLng = (lat) => 111320 * Math.cos((lat * Math.PI) / 180);
export const toXY = (c, p) => ({ x: (p.lng - c.lng) * mPerLng(c.lat), y: (p.lat - c.lat) * M_PER_LAT });

// A space's drawn area, or a circle from its size when it was seeded without one.
export const shapeOf = (s) => s.area || { mode: 'circle', r: s.areaM || 10 };
// Radius of the smallest circle round the shape (for overlap checks).
export const radiusOf = (shape) => (shape.mode === 'circle' ? shape.r : Math.max(...shape.pts.map((p) => Math.hypot(p.x, p.y))));
export const areaM2 = (shape) => (shape.mode === 'circle'
  ? Math.PI * shape.r * shape.r
  : Math.abs(shape.pts.reduce((sum, a, i) => { const b = shape.pts[(i + 1) % shape.pts.length]; return sum + a.x * b.y - b.x * a.y; }, 0)) / 2);

// Spaces whose areas overlap or touch this one's, nearest first.
export function overlapping(space, spaces) {
  const r0 = radiusOf(shapeOf(space));
  return spaces
    .filter((s) => s.id !== space.id && !s.removed)
    .map((s) => {
      const p = toXY(space, s);
      const d = Math.hypot(p.x, p.y);
      const r1 = radiusOf(shapeOf(s));
      return { s, d, inside: d + r1 <= r0 || d + r0 <= r1, touches: d <= r0 + r1 };
    })
    .filter((x) => x.touches)
    .sort((a, b) => a.d - b.d);
}
