/**
 * ref: https://github.com/pteromys/munsell/blob/master/munsell-interpolate.js
 */
// Trilinearly interpolate.
import Munsell from "./munsell-floats";

function clamp(x = 0, a = 0, b = 1) {
  if (x < a) return a;
  if (b < x) return b;
  return x;
}

function mul(factor = 0, maybe_number = 0) {
  if (factor == 0) return 0;
  return factor * maybe_number;
}

export default function interpolate(i = 0, j = 0, k = 0) {
  // modified multiplication to return 0 for 0 * NaN and 0 * Infinity.

  // Insert gray
  let i0 = Math.floor(i);
  let j0 = Math.floor(j);
  let k0 = Math.floor(k);
  let i1 = (i0 + 1) % 40;
  let j1 = j0 + 1;
  let k1 = k0 + 1;
  let a1 = i - i0;
  let b1 = j - j0;
  let c1 = k - k0;
  let a0 = 1 - a1;
  let b0 = 1 - b1;
  let c0 = 1 - c1;
  let ans = [0, 0, 0];

  for (let t in ans) {
    ans[t] =
      mul(a0 * b0 * c0, Munsell[i0][j0][k0][t]) +
      mul(a1 * b0 * c0, Munsell[i1][j0][k0][t]) +
      mul(a0 * b1 * c0, Munsell[i0][j1][k0][t]) +
      mul(a1 * b1 * c0, Munsell[i1][j1][k0][t]) +
      mul(a0 * b0 * c1, Munsell[i0][j0][k1][t]) +
      mul(a1 * b0 * c1, Munsell[i1][j0][k1][t]) +
      mul(a0 * b1 * c1, Munsell[i0][j1][k1][t]) +
      mul(a1 * b1 * c1, Munsell[i1][j1][k1][t]);
    ans[t] = clamp(ans[t]);
  }
  return ans as [r: number, g: number, b: number];
}
