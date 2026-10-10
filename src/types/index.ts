import type { Database } from "./database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type Theme = "light" | "dark";

export type AuthorLite = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

export type PostWithAuthor = {
  id: string;
  content: string;
  media_paths: string[];
  created_at: string;
  expires_at: string;
  author: AuthorLite;
  comments: { count: number }[];
};

export type CommentWithAuthor = {
  id: string;
  content: string;
  created_at: string;
  author: AuthorLite;
};

export type ActionResult = { error?: string };
