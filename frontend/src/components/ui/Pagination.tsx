import React from 'react';

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onPage: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, total, limit, onPage }) => {
  if (total === 0) return null;
  const totalPages = Math.ceil(total / limit);
  return (
    <div className="flex items-center justify-center gap-2 bg-white rounded-lg p-4">
      <button
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
      >
        Previous
      </button>
      <span className="px-4 py-2 text-gray-600">
        Page {page} of {totalPages}
      </span>
      <button
        disabled={page * limit >= total}
        onClick={() => onPage(page + 1)}
        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
