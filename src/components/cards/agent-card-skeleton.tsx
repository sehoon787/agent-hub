import { Skeleton } from '@/components/ui/skeleton';

export function AgentCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      {/* Row 1: icon + name */}
      <div className="flex items-start gap-2">
        <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-1 h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      {/* Description */}
      <div className="mt-2 space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      {/* Platform + model badges */}
      <div className="mt-2 flex items-center gap-1.5">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      {/* Category + stage + tag badges */}
      <div className="mt-3 flex items-center gap-1.5">
        <Skeleton className="h-5 w-18 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      {/* Bottom: stars/forks + install */}
      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="mt-2 h-8 w-full rounded-md" />
      </div>
    </div>
  );
}
