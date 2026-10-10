"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AccentPicker from "./AccentPicker";
import ThemePicker from "./ThemePicker";
import ImageUploader, { type ImageChange } from "./ImageUploader";
import Button from "@/components/ui/Button";
import { useTheme } from "@/context/ThemeContext";
import { updateProfile } from "@/lib/actions/updateProfile";
import { MAX_BIO_LENGTH, MAX_NAME_LENGTH } from "@/lib/limits";
import { pathFromPublicUrl, publicUrl, type Bucket } from "@/lib/storage";
import { removeImages, uploadImage } from "@/lib/upload";
import type { Theme } from "@/types";

type Props = {
  userId: string;
  initial: {
    display_name: string;
    bio: string;
    avatar_url: string | null;
    banner_url: string | null;
    theme: Theme;
    accent_color: string;
  };
};

const inputCls =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none transition focus:border-accent";

const NO_CHANGE: ImageChange = { file: null, removed: false };

export default function EditProfileForm({ userId, initial }: Props) {
  const router = useRouter();
  const { theme, accent, setTheme, setAccent } = useTheme();

  const [displayName, setDisplayName] = useState(initial.display_name);
  const [bio, setBio] = useState(initial.bio);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url);
  const [bannerUrl, setBannerUrl] = useState(initial.banner_url);
  const [avatar, setAvatar] = useState<ImageChange>(NO_CHANGE);
  const [banner, setBanner] = useState<ImageChange>(NO_CHANGE);
  const [version, setVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Ultimo tema/accento salvato: se esci senza salvare, l'anteprima live viene annullata
  const baseline = useRef({ theme: initial.theme, accent: initial.accent_color });
  useEffect(() => {
    return () => {
      setTheme(baseline.current.theme);
      setAccent(baseline.current.accent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);

    const name = displayName.trim();
    if (!name) {
      setError("Il nome non può essere vuoto.");
      return;
    }

    setSaving(true);
    const uploaded: { bucket: Bucket; path: string }[] = [];
    try {
      let nextAvatar = avatarUrl;
      let nextBanner = bannerUrl;

      if (avatar.file) {
        const path = await uploadImage("avatars", userId, avatar.file);
        uploaded.push({ bucket: "avatars", path });
        nextAvatar = publicUrl("avatars", path);
      } else if (avatar.removed) {
        nextAvatar = null;
      }

      if (banner.file) {
        const path = await uploadImage("banners", userId, banner.file);
        uploaded.push({ bucket: "banners", path });
        nextBanner = publicUrl("banners", path);
      } else if (banner.removed) {
        nextBanner = null;
      }

      const res = await updateProfile({
        display_name: name,
        bio,
        theme,
        accent_color: accent,
        avatar_url: nextAvatar,
        banner_url: nextBanner,
      });
      if (res.error) throw new Error(res.error);

      // salvato: elimina i vecchi file sostituiti
      const oldAvatar = nextAvatar !== avatarUrl ? pathFromPublicUrl("avatars", avatarUrl) : null;
      const oldBanner = nextBanner !== bannerUrl ? pathFromPublicUrl("banners", bannerUrl) : null;
      if (oldAvatar) await removeImages("avatars", [oldAvatar]);
      if (oldBanner) await removeImages("banners", [oldBanner]);

      baseline.current = { theme, accent };
      setAvatarUrl(nextAvatar);
      setBannerUrl(nextBanner);
      setAvatar(NO_CHANGE);
      setBanner(NO_CHANGE);
      setVersion((v) => v + 1);
      setDone(true);
      router.refresh();
    } catch (err) {
      for (const u of uploaded) await removeImages(u.bucket, [u.path]);
      setError(err instanceof Error ? err.message : "Qualcosa è andato storto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSave} className="space-y-8">
      <section className="space-y-5 rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-bold">Immagini</h2>
        <ImageUploader
          key={`banner-${version}`}
          label="Banner (anche GIF animate, max 3MB)"
          shape="banner"
          currentUrl={bannerUrl}
          maxDim={1600}
          onChange={setBanner}
        />
        <ImageUploader
          key={`avatar-${version}`}
          label="Immagine profilo"
          shape="avatar"
          currentUrl={avatarUrl}
          maxDim={512}
          onChange={setAvatar}
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-bold">Informazioni</h2>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold" htmlFor="name">Nome</label>
          <input
            id="name"
            className={inputCls}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <label className="text-sm font-semibold" htmlFor="bio">Bio</label>
            <span className="text-xs text-muted">{bio.length}/{MAX_BIO_LENGTH}</span>
          </div>
          <textarea
            id="bio"
            rows={3}
            className={`${inputCls} resize-none`}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={MAX_BIO_LENGTH}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-bold">Aspetto</h2>
        <p className="text-sm text-muted">L&apos;anteprima è immediata: salva per renderla definitiva.</p>
        <ThemePicker />
        <AccentPicker />
      </section>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {done && <p className="text-sm text-accent">Profilo salvato!</p>}

      <Button type="submit" disabled={saving} className="w-full py-3">
        {saving ? "Salvo…" : "Salva modifiche"}
      </Button>
    </form>
  );
}
