export function clamp(x = 0, a = 0, b = 1) {
  if (x < a) return a;
  if (b < x) return b;
  return x;
}

export function range(n = 0) {
  const ret = new Array(n);
  for (; n--; ) ret[n] = n;
  return ret;
}

export function rgb(color: number[]) {
  const [r, g, b] = color.map((c) => (c * 255) << 0);
  return `rgb(${r}, ${g}, ${b})`;
}

export function px(x: number) {
  return `${x}px`;
}

