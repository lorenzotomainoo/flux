import { Ghost, Users } from "lucide-react";

export default function GroupAvatar({ temporary, size = 48 }: { temporary: boolean; size?: number }) {
  const Icon = temporary ? Ghost : Users;
  return (
    <div
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center rounded-full bg-accent/15 text-accent"
      aria-hidden
    >
      <Icon size={Math.round(size * 0.5)} />
    </div>
  );
}
