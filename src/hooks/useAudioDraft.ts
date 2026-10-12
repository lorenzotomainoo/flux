import { useCallback, useEffect, useRef, useState } from "react";
import { AUDIO_TYPES, baseMime, pickRecorderMime, prepareAudio } from "@/lib/audio";
import { MAX_AUDIO_BYTES, MAX_AUDIO_SECONDS } from "@/lib/limits";

export type AudioDraft = {
  blob: Blob;
  url: string; // anteprima locale
  mime: string;
  duration: number; // secondi
  peaks: number[];
};

/** Registra dal microfono oppure prende un file, e prepara l'audio da allegare a un post. */
export function useAudioDraft() {
  const [draft, setDraft] = useState<AudioDraft | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canRecord, setCanRecord] = useState(false);

  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelled = useRef(false);
  const draftUrl = useRef<string | null>(null);

  // La registrazione richiede MediaRecorder e il microfono (e una connessione sicura: https o localhost)
  useEffect(() => {
    setCanRecord(
      typeof MediaRecorder !== "undefined" &&
        typeof navigator !== "undefined" &&
        Boolean(navigator.mediaDevices?.getUserMedia)
    );
  }, []);

  const stopStream = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);

  const revokeDraft = useCallback(() => {
    if (draftUrl.current) URL.revokeObjectURL(draftUrl.current);
    draftUrl.current = null;
  }, []);

  // pulizia quando il componente scompare
  useEffect(() => {
    return () => {
      cancelled.current = true;
      if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
      stopStream();
      revokeDraft();
    };
  }, [stopStream, revokeDraft]);

  const finalize = useCallback(
    async (blob: Blob, mime: string) => {
      setBusy(true);
      setError(null);
      try {
        const { duration, peaks } = await prepareAudio(blob);
        revokeDraft();
        const url = URL.createObjectURL(blob);
        draftUrl.current = url;
        setDraft({ blob, url, mime, duration, peaks });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Audio non valido.");
      } finally {
        setBusy(false);
      }
    },
    [revokeDraft]
  );

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      stream.current = media;

      const mime = pickRecorderMime();
      const rec = new MediaRecorder(media, {
        ...(mime ? { mimeType: mime } : {}),
        audioBitsPerSecond: 48000, // voce chiara e file leggeri (~360KB al minuto)
      });
      recorder.current = rec;
      chunks.current = [];
      cancelled.current = false;

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        stopStream();
        setRecording(false);
        if (cancelled.current) return;
        const type = rec.mimeType || mime || "audio/webm";
        void finalize(new Blob(chunks.current, { type }), type);
      };

      const startedAt = Date.now();
      rec.start();
      setSeconds(0);
      setRecording(true);
      timer.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        setSeconds(elapsed);
        if (elapsed >= MAX_AUDIO_SECONDS && rec.state !== "inactive") rec.stop(); // si ferma da sola
      }, 250);
    } catch (err) {
      stopStream();
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError") setError("Consenti l'uso del microfono nelle impostazioni del browser.");
      else if (name === "NotFoundError") setError("Non trovo nessun microfono.");
      else setError("Non riesco ad avviare la registrazione.");
    }
  }, [finalize, stopStream]);

  const stopRecording = useCallback(() => {
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
  }, []);

  const cancelRecording = useCallback(() => {
    cancelled.current = true;
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    else stopStream();
    setRecording(false);
  }, [stopStream]);

  const pickFile = useCallback(
    async (file: File) => {
      setError(null);
      const type = baseMime(file.type);
      if (!AUDIO_TYPES.includes(type)) {
        setError("Formato non supportato: usa MP3, M4A, WAV, OGG, WEBM o FLAC.");
        return;
      }
      if (file.size > MAX_AUDIO_BYTES) {
        setError("L'audio supera i 5MB.");
        return;
      }
      await finalize(file, type);
    },
    [finalize]
  );

  const clear = useCallback(() => {
    revokeDraft();
    setDraft(null);
    setError(null);
  }, [revokeDraft]);

  return {
    draft,
    recording,
    seconds,
    busy,
    error,
    canRecord,
    startRecording,
    stopRecording,
    cancelRecording,
    pickFile,
    clear,
  };
}
