import { useEffect, useMemo, useState } from 'react';

export interface UsePaginationOptions {
  defaultPage?: number;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
}

export function usePagination<T>(items: T[], options: UsePaginationOptions = {}) {
  const { defaultPage = 1, defaultPageSize = 10, pageSizeOptions = [10, 25, 50, 100] } = options;

  const [page, setPage] = useState(defaultPage);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [items, pageSize]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageSizeOptions,
    paginated,
    total,
    totalPages,
    start: Math.min(total, (page - 1) * pageSize + 1),
    end: Math.min(total, page * pageSize),
  };
}
