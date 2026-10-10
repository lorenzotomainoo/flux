"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { addComment } from "@/lib/actions/addComment";
import { MAX_COMMENT_LENGTH } from "@/lib/limits";
import type { CommentWithAuthor } from "@/types";

type Props = { postId: string; onAdded: (comment: CommentWithAuthor) => void };

export default function CommentForm({ postId, onAdded }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    setError(null);
    const res = await addComment(postId, text);
    setSending(false);
    if (res.error || !res.comment) {
      setError(res.error ?? "Qualcosa è andato storto.");
      return;
    }
    onAdded(res.comment);
    setText("");
  }

  return (
    <form onSubmit={submit} className="space-y-1.5">
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_COMMENT_LENGTH}
          placeholder="Scrivi un commento…"
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-base outline-none transition focus:border-accent"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          aria-label="Invia commento"
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-fg transition active:scale-95 disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </form>
  );
}
