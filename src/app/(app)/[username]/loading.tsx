import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-3xl border border-border bg-surface">
        <Skeleton className="h-32 w-full rounded-none sm:h-44" />
        <div className="space-y-3 px-5 pb-5">
          <Skeleton className="-mt-12 size-24 rounded-full border-4 border-surface" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}
