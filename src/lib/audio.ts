import { MAX_AUDIO_BYTES, MAX_AUDIO_SECONDS } from "./limits";
import { computePeaks } from "./peaks";

/** Formati accettati: gli stessi del bucket "post-audio" (vedi 0007_post_audio.sql). */
export const AUDIO_TYPES = [
  "audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/aac",
  "audio/wav", "audio/x-wav", "audio/ogg", "audio/webm", "audio/flac",
];
export const AUDIO_ACCEPT = "audio/*";

const EXTENSIONS: Record<string, string> = {
  "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac",
  "audio/wav": "wav", "audio/x-wav": "wav", "audio/ogg": "ogg", "audio/webm": "webm", "audio/flac": "flac",
};

/** "audio/webm;codecs=opus" -> "audio/webm" */
export const baseMime = (mime: string) => mime.split(";")[0].trim().toLowerCase();
export const audioExtension = (mime: string) => EXTENSIONS[baseMime(mime)] ?? "audio";

/** 75 -> "1:15" */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Il miglior formato di registrazione supportato dal browser (Safari: mp4, Chrome: webm, Firefox: ogg). */
export function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"].find((m) =>
    MediaRecorder.isTypeSupported(m)
  );
}

/** Durata dichiarata dal file, senza decodificarlo (null se il browser non la sa dire). */
function metadataDuration(blob: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const el = document.createElement("audio");
    const url = URL.createObjectURL(blob);
    const done = (d: number | null) => {
      URL.revokeObjectURL(url);
      resolve(d);
    };
    el.preload = "metadata";
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? el.duration : null);
    el.onerror = () => done(null);
    setTimeout(() => done(null), 4000);
    el.src = url;
  });
}

/** Decodifica l'audio e ne ricava durata reale e forma d'onda (PEAK_BARS valori tra 8 e 100). */
async function analyzeAudio(blob: Blob): Promise<{ duration: number; peaks: number[] }> {
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) throw new Error("Il browser non supporta l'analisi dell'audio.");

  const ctx = new Ctx();
  try {
    const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
    const peaks = computePeaks(buffer.getChannelData(0));
    return { duration: buffer.duration, peaks };
  } catch {
    throw new Error("Non riesco a leggere questo audio. Prova con un altro file.");
  } finally {
    void ctx.close();
  }
}

/** Controlla limiti e formato, poi restituisce durata (secondi interi) e forma d'onda. */
export async function prepareAudio(blob: Blob): Promise<{ duration: number; peaks: number[] }> {
  if (blob.size > MAX_AUDIO_BYTES) {
    throw new Error("L'audio supera i 5MB.");
  }
  const tooLong = `L'audio supera i ${MAX_AUDIO_SECONDS / 60} minuti.`;

  // controllo veloce prima di decodificare (un file lungo occuperebbe molta memoria)
  const declared = await metadataDuration(blob);
  if (declared !== null && declared > MAX_AUDIO_SECONDS + 1) throw new Error(tooLong);

  const { duration, peaks } = await analyzeAudio(blob);
  if (duration > MAX_AUDIO_SECONDS + 1) throw new Error(tooLong);
  if (duration < 1) throw new Error("L'audio è troppo breve (minimo 1 secondo).");

  return { duration: Math.min(MAX_AUDIO_SECONDS, Math.max(1, Math.round(duration))), peaks };
}
