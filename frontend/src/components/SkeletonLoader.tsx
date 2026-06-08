export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3">
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
    ))}
  </div>
);

export const FormSkeleton = () => (
  <div className="space-y-4">
    {[...Array(4)].map((_, i) => (
      <div key={i}>
        <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse" />
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
      </div>
    ))}
    <div className="h-10 bg-gray-200 rounded animate-pulse mt-6" />
  </div>
);

export const CardSkeleton = () => (
  <div className="bg-white rounded-lg p-6 space-y-4">
    <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
    <div className="space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded animate-pulse w-full" />
      ))}
    </div>
  </div>
);
