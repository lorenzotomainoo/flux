import type { Database } from "./database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type Theme = "light" | "dark";

/** Quale feed mostrare: solo chi segui (e te stesso) oppure i post di tutti. */
export type FeedScope = "seguiti" | "mondiale";

export type AuthorLite = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  /** punto focale dell'avatar, 0-100 (50 = centro) */
  avatar_x?: number;
  avatar_y?: number;
};

export type PostWithAuthor = {
  id: string;
  content: string;
  media_paths: string[];
  created_at: string;
  expires_at: string;
  audio_path: string | null;
  audio_duration: number | null;
  audio_peaks: number[] | null;
  author: AuthorLite;
  comments: { count: number }[];
};

export type CommentWithAuthor = {
  id: string;
  content: string;
  created_at: string;
  author: AuthorLite;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  media_paths: string[];
  audio_path: string | null;
  audio_duration: number | null;
  audio_peaks: number[] | null;
};

export type ConversationKind = "direct" | "group";

export type ConversationPreview = {
  id: string;
  kind: ConversationKind;
  name: string | null;
  /** null = permanente; altrimenti la chat si autodistrugge a questa data */
  expires_at: string | null;
  /** l'altra persona (solo chat 1-a-1) */
  other: AuthorLite | null;
  member_count: number;
  is_admin: boolean;
  last_message: { content: string; sender_id: string; created_at: string } | null;
  unread: number;
};

export type ChatInfo = {
  id: string;
  kind: ConversationKind;
  name: string | null;
  expires_at: string | null;
};

export type ChatMember = AuthorLite & {
  role: "admin" | "member";
  last_read_at: string;
};

export type ActionResult = { error?: string };
