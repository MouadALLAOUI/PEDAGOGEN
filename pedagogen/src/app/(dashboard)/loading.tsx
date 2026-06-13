import { Skeleton, SkeletonHero, SkeletonStatGrid } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-7">
      <SkeletonHero />
      <SkeletonStatGrid />
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-4 border border-border rounded-xl bg-white">
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
