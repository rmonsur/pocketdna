/** Small seeded PRNG (sfc32) so browser bootstraps are reproducible per seed. */

export type Resampler = (boot: number, n: number) => ArrayLike<number>;

const UINT32_RANGE = 4294967296;
const SFC_ROT = 21;
const SFC_SHIFT_A = 9;
const SFC_SHIFT_B = 3;
const WARMUP_ROUNDS = 12;
const SEED_MIX_B = 0x9e3779b9;
const SEED_MIX_C = 0x6a09e667;
const SEED_MIX_D = 0xbb67ae85;

/** Uniform in [0, 1). */
export function sfc32(seed: number): () => number {
  let a = seed >>> 0;
  let b = SEED_MIX_B;
  let c = SEED_MIX_C;
  let d = SEED_MIX_D;
  const next = (): number => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> SFC_SHIFT_A);
    b = (c + (c << SFC_SHIFT_B)) | 0;
    c = (c << SFC_ROT) | (c >>> (32 - SFC_ROT));
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / UINT32_RANGE;
  };
  for (let i = 0; i < WARMUP_ROUNDS; i += 1) next();
  return next;
}

/** Bootstrap resampler: n indices in [0, n) per boot, from one seeded stream. */
export function seededResampler(seed: number): Resampler {
  const uniform = sfc32(seed);
  return (_boot, n) => {
    const out = new Uint32Array(n);
    for (let i = 0; i < n; i += 1) out[i] = Math.floor(uniform() * n);
    return out;
  };
}
