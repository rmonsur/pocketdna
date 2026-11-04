/**
 * Constrained mixture fit, mirroring backend/pipeline/engine.py fit_weights:
 * minimize ||w·centroids - target||^2 with w >= 0 and sum(w) exactly 1.
 * Solved with an active-set method on the KKT system (small source counts).
 * Era source panels themselves require approval (docs/POPLIST.md); this is
 * only the solver, with no panel bundled.
 */

export interface MixtureResult {
  weights: Float64Array;
  residual: number;
}

export function solveLinear(matrix: Float64Array, rhs: Float64Array, size: number): Float64Array {
  const a = new Float64Array(matrix);
  const b = new Float64Array(rhs);
  for (let col = 0; col < size; col++) {
    let pivot = col;
    for (let r = col + 1; r < size; r++) {
      if (Math.abs(a[r * size + col]) > Math.abs(a[pivot * size + col])) pivot = r;
    }
    if (Math.abs(a[pivot * size + col]) < 1e-13) throw new Error("constrained mixture fit did not converge");
    if (pivot !== col) {
      for (let k = col; k < size; k++) {
        const tmp = a[col * size + k];
        a[col * size + k] = a[pivot * size + k];
        a[pivot * size + k] = tmp;
      }
      const tmp = b[col];
      b[col] = b[pivot];
      b[pivot] = tmp;
    }
    for (let r = col + 1; r < size; r++) {
      const factor = a[r * size + col] / a[col * size + col];
      if (factor === 0) continue;
      for (let k = col; k < size; k++) a[r * size + k] -= factor * a[col * size + k];
      b[r] -= factor * b[col];
    }
  }
  const x = new Float64Array(size);
  for (let r = size - 1; r >= 0; r--) {
    let value = b[r];
    for (let k = r + 1; k < size; k++) value -= a[r * size + k] * x[k];
    x[r] = value / a[r * size + r];
  }
  return x;
}

export function fitMixture(centroids: ArrayLike<number>[], target: ArrayLike<number>): MixtureResult {
  const k = centroids.length;
  const n = target.length;
  if (k === 0 || n === 0) throw new Error("invalid mixture dimensions");
  const c: Float64Array[] = centroids.map((row) => {
    if (row.length !== n) throw new Error("invalid mixture dimensions");
    const out = Float64Array.from(row);
    if (!out.every(Number.isFinite)) throw new Error("non-finite mixture inputs");
    return out;
  });
  const t = Float64Array.from(target);
  if (!t.every(Number.isFinite)) throw new Error("non-finite mixture inputs");

  // Gram matrix G = C C^T (k x k) and cross vector d = C t.
  const gram = new Float64Array(k * k);
  const cross = new Float64Array(k);
  for (let i = 0; i < k; i++) {
    for (let j = i; j < k; j++) {
      let sum = 0;
      for (let d = 0; d < n; d++) sum += c[i][d] * c[j][d];
      gram[i * k + j] = sum;
      gram[j * k + i] = sum;
    }
    let sum = 0;
    for (let d = 0; d < n; d++) sum += c[i][d] * t[d];
    cross[i] = sum;
  }

  /* Active-set QP: start at the nearest single source, grow the free set by
   * the most KKT-violating fixed source, drop negatives. Handles k >> dims,
   * where the full Gram matrix is singular by construction. */
  const weights = new Float64Array(k);
  let start = 0;
  let best = Infinity;
  for (let i = 0; i < k; i++) {
    let dist = 0;
    for (let d = 0; d < n; d++) dist += (c[i][d] - t[d]) ** 2;
    if (dist < best) {
      best = dist;
      start = i;
    }
  }
  /* Tiny ridge: free-set Gram blocks can be affinely singular (k >> dims). */
  let diagMean = 0;
  for (let i = 0; i < k; i++) diagMean += gram[i * k + i];
  diagMean /= k;
  for (let i = 0; i < k; i++) gram[i * k + i] += diagMean * 1e-10;

  const free: number[] = [start];
  weights[start] = 1;
  let lambda = 0;
  let converged = false;
  for (let outer = 0; outer < 200 && !converged; outer++) {
    /* Inner: exact equality-constrained optimum on the passive set with all
     * weights nonnegative (drop the most negative, resolve, repeat). */
    for (;;) {
      const size = free.length + 1;
      const kkt = new Float64Array(size * size);
      const rhs = new Float64Array(size);
      free.forEach((fi, a) => {
        free.forEach((fj, b) => {
          kkt[a * size + b] = gram[fi * k + fj];
        });
        kkt[a * size + free.length] = 1;
        kkt[free.length * size + a] = 1;
        rhs[a] = cross[fi];
      });
      rhs[free.length] = 1;
      const sol = solveLinear(kkt, rhs, size);
      let worstPos = -1;
      let worstValue = -1e-12;
      free.forEach((fi, a) => {
        if (sol[a] < worstValue) {
          worstValue = sol[a];
          worstPos = a;
        }
      });
      if (worstPos === -1) {
        free.forEach((fi, a) => {
          weights[fi] = sol[a];
        });
        lambda = sol[free.length];
        break;
      }
      weights[free[worstPos]] = 0;
      free.splice(worstPos, 1);
      if (free.length === 0) throw new Error("constrained mixture fit did not converge");
    }
    /* Outer: add the fixed source whose KKT violation is largest, if any. */
    let addIdx = -1;
    let addViolation = 1e-9;
    for (let i = 0; i < k; i++) {
      if (free.includes(i)) continue;
      let grad = -cross[i];
      for (let j = 0; j < k; j++) grad += gram[i * k + j] * weights[j];
      const violation = -lambda - grad;
      if (violation > addViolation) {
        addViolation = violation;
        addIdx = i;
      }
    }
    if (addIdx === -1) converged = true;
    else free.push(addIdx);
  }
  if (!converged) throw new Error("constrained mixture fit did not converge");

  let sum = 0;
  for (const w of weights) sum += w;
  if (!weights.every(Number.isFinite) || Math.abs(sum - 1) > 1e-8 || weights.some((w) => w < -1e-9)) {
    throw new Error("constrained mixture fit did not converge");
  }
  let residualSq = 0;
  for (let d = 0; d < n; d++) {
    let fitted = 0;
    for (let i = 0; i < k; i++) fitted += weights[i] * c[i][d];
    residualSq += (fitted - t[d]) ** 2;
  }
  return { weights, residual: Math.sqrt(residualSq) };
}
