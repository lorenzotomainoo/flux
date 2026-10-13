/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Mic, Music, Send, X } from "lucide-react";
import AudioPanel from "@/components/feed/AudioPanel";
import { useAudioDraft } from "@/hooks/useAudioDraft";
import { AUDIO_ACCEPT } from "@/lib/audio";
import { MESSAGE_FIELDS } from "@/lib/fields";
import { MAX_IMAGES_PER_POST } from "@/lib/limits";
import { ACCEPT_ATTR, prepareImage } from "@/lib/media";
import { createClient } from "@/lib/supabase/client";
import { removeImages, uploadAudio, uploadImage } from "@/lib/upload";
import type { Message } from "@/types";

type Props = {
  conversationId: string;
  currentUserId: string;
  disabled: boolean;
  onSent: (message: Message) => void;
};

type Attachment = { file: File; url: string };

const MAX_LENGTH = 2000;
const MAX_PHOTOS = MAX_IMAGES_PER_POST; // 4, come nei post

/** Barra di scrittura della chat: testo, foto/GIF (fino a 4) e un audio (registrato o da file). */
export default function ChatComposer({ conversationId, currentUserId, disabled, onSent }: Props) {
  const photoInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const audio = useAudioDraft();

  const [text, setText] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // libera le anteprime quando la chat si chiude
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  useEffect(() => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.url)), []);

  async function onPickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (picked.length === 0) return;

    setError(null);
    const room = MAX_PHOTOS - files.length;
    if (picked.length > room) setError(`Puoi allegare al massimo ${MAX_PHOTOS} foto per messaggio.`);

    setPreparing(true);
    const added: Attachment[] = [];
    for (const file of picked.slice(0, Math.max(room, 0))) {
      try {
        // le GIF restano animate (non vengono ricodificate); le foto vengono ridimensionate sotto i 3MB
        const prepared = await prepareImage(file, 1600);
        added.push({ file: prepared, url: URL.createObjectURL(prepared) });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Immagine non valida.");
      }
    }
    setFiles((prev) => [...prev, ...added]);
    setPreparing(false);
  }

  function removePhoto(index: number) {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  }

  function onPickAudio(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void audio.pickFile(file);
  }

  const audioBusy = audio.recording || audio.busy;
  const audioLocked = audio.draft !== null || audioBusy || sending || disabled;
  const canSend =
    (text.trim().length > 0 || files.length > 0 || audio.draft !== null) &&
    !sending &&
    !preparing &&
    !audioBusy &&
    !disabled;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;

    setSending(true);
    setError(null);
    const uploadedMedia: string[] = [];
    let uploadedAudio: string | null = null;
    try {
      for (const { file } of files) uploadedMedia.push(await uploadImage("chat-media", currentUserId, file));

      if (audio.draft) {
        uploadedAudio = await uploadAudio(currentUserId, audio.draft.blob, audio.draft.mime, "chat-audio");
      }

      const { data, error: insertError } = await createClient()
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: text.trim(),
          media_paths: uploadedMedia,
          ...(audio.draft && uploadedAudio
            ? {
                audio_path: uploadedAudio,
                audio_duration: audio.draft.duration,
                audio_peaks: audio.draft.peaks,
              }
            : {}),
        })
        .select(MESSAGE_FIELDS)
        .single();
      if (insertError || !data) throw new Error("Messaggio non inviato. Riprova.");

      files.forEach((f) => URL.revokeObjectURL(f.url));
      setFiles([]);
      setText("");
      audio.clear();
      onSent(data as unknown as Message);
    } catch (err) {
      // se l'invio non è andato a buon fine non lasciamo file orfani
      await removeImages("chat-media", uploadedMedia);
      if (uploadedAudio) await removeImages("chat-audio", [uploadedAudio]);
      setError(err instanceof Error ? err.message : "Messaggio non inviato. Riprova.");
    } finally {
      setSending(false);
    }
  }

  const iconButton =
    "rounded-lg p-1.5 text-accent transition hover:bg-accent/10 disabled:opacity-40";

  return (
    <div className="space-y-2 border-t border-border p-3">
      {files.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {files.map((f, i) => (
            <div key={f.url} className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-surface-2">
              <img src={f.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                aria-label="Rimuovi foto"
                className="absolute right-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-black/70 text-white"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <AudioPanel
        recording={audio.recording}
        seconds={audio.seconds}
        busy={audio.busy}
        draft={audio.draft}
        onStop={audio.stopRecording}
        onCancel={audio.cancelRecording}
        onRemove={audio.clear}
      />

      {(error ?? audio.error) && <p className="text-xs text-red-500">{error ?? audio.error}</p>}

      <form onSubmit={send} className="flex items-center gap-1">
        <input ref={photoInput} type="file" accept={ACCEPT_ATTR} multiple hidden onChange={onPickPhotos} />
        <input ref={audioInput} type="file" accept={AUDIO_ACCEPT} hidden onChange={onPickAudio} />

        <button
          type="button"
          onClick={() => photoInput.current?.click()}
          disabled={files.length >= MAX_PHOTOS || preparing || sending || disabled}
          aria-label="Allega foto o GIF"
          className={iconButton}
        >
          <ImagePlus size={20} />
        </button>
        {audio.canRecord && (
          <button
            type="button"
            onClick={() => void audio.startRecording()}
            disabled={audioLocked}
            aria-label="Registra un messaggio vocale"
            className={iconButton}
          >
            <Mic size={20} />
          </button>
        )}
        <button
          type="button"
          onClick={() => audioInput.current?.click()}
          disabled={audioLocked}
          aria-label="Allega un file audio"
          className={iconButton}
        >
          <Music size={20} />
        </button>

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_LENGTH}
          disabled={disabled}
          placeholder={preparing ? "Preparo l'immagine…" : "Scrivi un messaggio…"}
          autoComplete="off"
          className="ml-1 min-w-0 flex-1 rounded-xl border border-border bg-bg px-4 py-2.5 text-base outline-none transition focus:border-accent"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Invia"
          className="ml-1 grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-fg transition active:scale-95 disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
