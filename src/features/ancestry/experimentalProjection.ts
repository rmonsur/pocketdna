/** Research-only least-squares projection. Not a validated runtime or release artifact. */
export interface ProjectionInputs {
  readonly dimensions: number;
  readonly calls: Uint8Array;
  readonly weights: Float64Array;
  readonly means: Float64Array;
  readonly normalization: Float64Array;
  readonly coordinateScales: Float64Array;
}

/** Streaming Givens QR avoids explicitly inverting the normal equations. */
export function experimentalProjection(input: ProjectionInputs): Float64Array {
  const { dimensions: n, calls, weights, means, normalization, coordinateScales } = input;
  if (!Number.isInteger(n) || n < 1 || n > 128 || weights.length !== calls.length * n ||
      means.length !== calls.length || normalization.length !== calls.length || coordinateScales.length !== n) {
    throw new Error("Invalid projection dimensions");
  }
  const r = new Float64Array(n * n);
  const rhs = new Float64Array(n);
  const row = new Float64Array(n);
  let observed = 0;
  for (let i = 0; i < calls.length; i++) {
    const call = calls[i];
    if (call === 3) continue;
    if (call > 2) throw new Error("Invalid genotype code");
    if (!Number.isFinite(means[i]) || !Number.isFinite(normalization[i]) || normalization[i] <= 0) {
      throw new Error("Invalid normalization");
    }
    let target = (call - means[i]) * normalization[i];
    for (let j = 0; j < n; j++) {
      row[j] = weights[i * n + j];
      if (!Number.isFinite(row[j])) throw new Error("Invalid loading");
    }
    observed++;
    for (let j = 0; j < n; j++) {
      const lower = row[j];
      if (lower === 0) continue;
      const index = j * n + j;
      const magnitude = Math.hypot(r[index], lower);
      const c = r[index] / magnitude;
      const s = lower / magnitude;
      r[index] = magnitude;
      for (let k = j + 1; k < n; k++) {
        const upper = r[j * n + k];
        r[j * n + k] = c * upper + s * row[k];
        row[k] = -s * upper + c * row[k];
      }
      const previous = rhs[j];
      rhs[j] = c * previous + s * target;
      target = -s * previous + c * target;
    }
  }
  if (observed <= n) throw new Error("Insufficient observed markers");
  let maxDiagonal = 0;
  for (let j = 0; j < n; j++) maxDiagonal = Math.max(maxDiagonal, Math.abs(r[j * n + j]));
  const solution = new Float64Array(n);
  for (let j = n - 1; j >= 0; j--) {
    const diagonal = r[j * n + j];
    if (maxDiagonal === 0 || Math.abs(diagonal) < maxDiagonal * 1e-10) {
      throw new Error("Rank deficient or unstable projection");
    }
    let value = rhs[j];
    for (let k = j + 1; k < n; k++) value -= r[j * n + k] * solution[k];
    solution[j] = value / diagonal;
  }
  for (let j = 0; j < n; j++) {
    if (!Number.isFinite(coordinateScales[j])) throw new Error("Invalid coordinate scale");
    solution[j] *= coordinateScales[j];
  }
  return solution;
}
