/** Model ids, effort policy, pricing (port of backend/muse/models.py). */

export const SPARK = "muse-spark-1.3";
export const WONDER = "muse-wonder-1.0";
export const IMAGE = "muse-image-1.0";
export const VOICE = "muse-voice-transcribe-1.0";
export const SAM = "sam-3.1";

export const EFFORT: Record<string, { temperature: number; maxTokens: number }> = {
  low: { temperature: 0.2, maxTokens: 1024 },
  medium: { temperature: 0.4, maxTokens: 2048 },
  /* Spark counts its reasoning as completion tokens; long structured plans need the headroom. */
  high: { temperature: 0.7, maxTokens: 32768 },
};

/** USD per 1M tokens: [input, output]. */
export const PRICING: Record<string, [number, number]> = {
  [SPARK]: [1.25, 4.25],
  [WONDER]: [4.0, 20.0],
};

export function priceUsd(model: string, inputTokens: number, outputTokens: number): number {
  const [inp, out] = PRICING[model] ?? [0, 0];
  return (inputTokens * inp + outputTokens * out) / 1_000_000;
}
