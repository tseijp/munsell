type Vec3 = [x: number, y: number, z: number];

export default function coordinate(i = 0, j = 0, k = 0) {
  const phi = (2 * Math.PI * i) / 40;
  const x = Math.cos(phi) * k;
  const y = j;
  const z = Math.sin(phi) * k;
  const ry = phi;
  return {
    pos: [x, y, z] as Vec3,
    rot: [0, -ry, 0] as Vec3,
    scale: [1, 1, 0.1] as Vec3,
  };
}
