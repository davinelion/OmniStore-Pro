import { AppGridSkeleton, Skeleton } from "@/components/ui/primitives";

/** App Router streaming fallback: reserves the same shape as catalog surfaces. */
export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading OmniStore">
      <div className="space-y-3"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-4 w-2/3" /></div>
      <Skeleton className="h-40 w-full rounded-3xl" />
      <AppGridSkeleton count={6} />
    </div>
  );
}
