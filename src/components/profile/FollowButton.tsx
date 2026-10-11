"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import { toggleFollow } from "@/lib/actions/toggleFollow";

type Props = { targetId: string; targetUsername: string; initialFollowing: boolean };

export default function FollowButton({ targetId, targetUsername, initialFollowing }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !following;
    setFollowing(next); // aggiornamento ottimistico
    startTransition(async () => {
      const res = await toggleFollow(targetId, targetUsername, next);
      if (res.error) setFollowing(!next);
    });
  }

  return (
    <Button
      variant={following ? "secondary" : "primary"}
      onClick={toggle}
      disabled={pending}
      className="px-4"
    >
      {following ? "Seguito" : "Segui"}
    </Button>
  );
}
