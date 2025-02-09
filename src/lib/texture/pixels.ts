export const PIXEL_RADIUS = 10;
export const pixels: [number, number][] = [];

for (let x = 0; x < PIXEL_RADIUS; x++) {
  for (let y = 0; y < PIXEL_RADIUS; y++) {
    pixels.push([x, y]);
  }
}

function distance([x1, y1]: [number, number], [x2, y2]: [number, number]) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

const center: [number, number] = [
  PIXEL_RADIUS / 2 - 0.5,
  PIXEL_RADIUS / 2 - 0.5,
];

pixels.sort((a, b) => {
  const aDistance = distance(a, center);
  const bDistance = distance(b, center);

  return aDistance - bDistance;
});