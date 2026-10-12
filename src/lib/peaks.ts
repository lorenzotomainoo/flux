export const PEAK_BARS = 48;

/**
 * Riassume i campioni audio in `bars` valori tra 8 e 100 (volume relativo di ogni tratto).
 * Funzione pura: nessuna dipendenza dal browser.
 */
export function computePeaks(samples: Float32Array, bars: number = PEAK_BARS): number[] {
  const size = Math.max(1, Math.floor(samples.length / bars));
  const step = Math.max(1, Math.floor(size / 200)); // basta un campione ogni tanto

  const rms = Array.from({ length: bars }, (_, i) => {
    let sum = 0;
    let n = 0;
    for (let j = i * size; j < Math.min((i + 1) * size, samples.length); j += step) {
      sum += samples[j] * samples[j];
      n++;
    }
    return Math.sqrt(sum / Math.max(n, 1));
  });

  const max = Math.max(...rms, 0.0001);
  return rms.map((v) => Math.max(8, Math.round(Math.pow(v / max, 0.7) * 100)));
}
