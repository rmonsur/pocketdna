/**
 * Minimal dense linear algebra for the browser engine. Sizes are tiny
 * (K principal components, S sources), so Gaussian elimination is enough.
 */

export type Matrix = readonly (readonly number[])[];

const SINGULAR_EPS = 1e-12;
const NNLS_TOL = 1e-10;
const NNLS_MAX_ITER_FACTOR = 3;

export class SingularMatrixError extends Error {}

/** Solve A x = b for square A by Gaussian elimination with partial pivoting. */
export function solve(a: Matrix, b: readonly number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < n; r += 1) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    }
    if (Math.abs(m[pivot][col]) < SINGULAR_EPS) throw new SingularMatrixError("singular system");
    [m[col], m[pivot]] = [m[pivot], m[col]];
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const f = m[r][col] / m[col][col];
      if (f === 0) continue;
      for (let c = col; c <= n; c += 1) m[r][c] -= f * m[col][c];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

/**
 * Least squares for tall A (rows x k): minimise |A x - b| via normal equations.
 * Equivalent to numpy lstsq when A has full column rank (true for >= k independent rows).
 */
export function leastSquares(rows: readonly ArrayLike<number>[], b: ArrayLike<number>): number[] {
  const k = rows[0]?.length ?? 0;
  const ata: number[][] = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const atb = new Array<number>(k).fill(0);
  for (let r = 0; r < rows.length; r += 1) {
    const row = rows[r];
    const y = b[r];
    for (let i = 0; i < k; i += 1) {
      const vi = row[i];
      atb[i] += vi * y;
      for (let j = i; j < k; j += 1) ata[i][j] += vi * row[j];
    }
  }
  for (let i = 0; i < k; i += 1) {
    for (let j = 0; j < i; j += 1) ata[i][j] = ata[j][i];
  }
  return solve(ata, atb);
}

function columns(a: Matrix, active: readonly number[]): number[][] {
  return a.map((row) => active.map((j) => row[j]));
}

function residualGradient(a: Matrix, b: readonly number[], x: readonly number[]): number[] {
  const n = x.length;
  const resid = a.map((row, i) => b[i] - row.reduce((acc, v, j) => acc + v * x[j], 0));
  return Array.from({ length: n }, (_, j) => a.reduce((acc, row, i) => acc + row[j] * resid[i], 0));
}

/**
 * Non-negative least squares (Lawson-Hanson active set). The optimum is unique when
 * A has full column rank, so this matches scipy.optimize.nnls to solver tolerance.
 */
export function nnls(a: Matrix, b: readonly number[]): number[] {
  const n = a[0]?.length ?? 0;
  let x = new Array<number>(n).fill(0);
  let passive = new Array<boolean>(n).fill(false);
  let w = residualGradient(a, b, x);
  const maxIter = NNLS_MAX_ITER_FACTOR * n;
  for (let iter = 0; iter < maxIter; iter += 1) {
    let best = -1;
    for (let j = 0; j < n; j += 1) {
      if (!passive[j] && w[j] > NNLS_TOL && (best < 0 || w[j] > w[best])) best = j;
    }
    if (best < 0) break;
    passive = passive.map((p, j) => p || j === best);
    let s = solvePassive(a, b, passive);
    while (s.some((v, j) => passive[j] && v <= 0)) {
      let alpha = Infinity;
      for (let j = 0; j < n; j += 1) {
        if (passive[j] && s[j] <= 0) alpha = Math.min(alpha, x[j] / (x[j] - s[j]));
      }
      x = x.map((v, j) => v + alpha * (s[j] - v));
      passive = passive.map((p, j) => p && x[j] > NNLS_TOL);
      s = solvePassive(a, b, passive);
    }
    x = s;
    w = residualGradient(a, b, x);
  }
  return x;
}

function solvePassive(a: Matrix, b: readonly number[], passive: readonly boolean[]): number[] {
  const active = passive.flatMap((p, j) => (p ? [j] : []));
  const out = new Array<number>(passive.length).fill(0);
  if (active.length === 0) return out;
  const sol = leastSquares(columns(a, active), b);
  active.forEach((j, i) => {
    out[j] = sol[i];
  });
  return out;
}

/** Equality-constrained nonnegative least squares over the probability simplex. */
export function simplexLeastSquares(centroids: Matrix, target: readonly number[]): number[] {
  const n = centroids.length;
  if (n === 0 || centroids.some((row) => row.length !== target.length || row.some((v) => !Number.isFinite(v))) || target.some((v) => !Number.isFinite(v))) {
    throw new Error("invalid mixture inputs");
  }
  const gram = centroids.map((a) => centroids.map((b) => a.reduce((sum, v, k) => sum + v * b[k], 0)));
  const linear = centroids.map((row) => row.reduce((sum, v, k) => sum + v * target[k], 0));
  let best = 0;
  for (let i = 1; i < n; i++) {
    if (gram[i][i] - 2 * linear[i] < gram[best][best] - 2 * linear[best]) best = i;
  }
  let weights = new Array<number>(n).fill(0);
  weights[best] = 1;
  let active = [best];
  const tolerance = 1e-10;
  for (let iteration = 0; iteration < 100 * n; iteration++) {
    const gradient = gram.map((row, i) => row.reduce((sum, value, j) => sum + value * weights[j], -linear[i]));
    const baseline = active.reduce((sum, i) => sum + gradient[i], 0) / active.length;
    let entering = -1;
    for (let i = 0; i < n; i++) {
      if (!active.includes(i) && gradient[i] < baseline - tolerance && (entering < 0 || gradient[i] < gradient[entering])) entering = i;
    }
    if (entering < 0) return weights;
    active = [...active, entering];
    for (let inner = 0; inner < 100 * n; inner++) {
      const system = active.map((i) => [...active.map((j) => gram[i][j]), 1]);
      system.push([...active.map(() => 1), 0]);
      const candidate = solve(system, [...active.map((i) => linear[i]), 1]);
      if (candidate.slice(0, active.length).every((value) => value > tolerance)) {
        weights = new Array<number>(n).fill(0);
        active.forEach((i, j) => { weights[i] = candidate[j]; });
        break;
      }
      let alpha = 1;
      for (let j = 0; j < active.length; j++) {
        const i = active[j];
        if (candidate[j] <= tolerance && weights[i] > 0) alpha = Math.min(alpha, weights[i] / (weights[i] - candidate[j]));
      }
      const updated = new Array<number>(n).fill(0);
      active.forEach((i, j) => { updated[i] = weights[i] + alpha * (candidate[j] - weights[i]); });
      weights = updated;
      active = active.filter((i) => weights[i] > tolerance);
      if (active.length === 0) throw new Error("simplex active set became empty");
      if (inner === 100 * n - 1) throw new Error("simplex fit did not converge");
    }
  }
  throw new Error("simplex fit did not converge");
}
