"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import { setFollow } from "@/lib/actions/toggleFollow";
import type { FollowStatus } from "@/types";

type Props = {
  targetId: string;
  targetUsername: string;
  /** l'account è privato: seguirlo significa inviare una richiesta */
  targetIsPrivate: boolean;
  initialStatus: FollowStatus;
};

const LABEL: Record<FollowStatus, string> = {
  none: "Segui",
  requested: "Richiesto",
  following: "Seguito",
};

export default function FollowButton({ targetId, targetUsername, targetIsPrivate, initialStatus }: Props) {
  const [status, setStatus] = useState<FollowStatus>(initialStatus);
  const [pending, startTransition] = useTransition();

  function click() {
    const previous = status;
    const wantsFollow = previous === "none";
    // aggiornamento ottimistico: la risposta del server può correggerlo (es. l'account è diventato privato)
    setStatus(wantsFollow ? (targetIsPrivate ? "requested" : "following") : "none");

    startTransition(async () => {
      const res = await setFollow(targetId, targetUsername, wantsFollow);
      if (res.error || !res.status) setStatus(previous);
      else setStatus(res.status);
    });
  }

  return (
    <Button
      variant={status === "none" ? "primary" : "secondary"}
      onClick={click}
      disabled={pending}
      aria-label={
        status === "requested"
          ? "Richiesta inviata: tocca per annullarla"
          : status === "following"
            ? "Stai seguendo: tocca per smettere"
            : "Segui"
      }
      className="px-4"
    >
      {LABEL[status]}
    </Button>
  );
}
