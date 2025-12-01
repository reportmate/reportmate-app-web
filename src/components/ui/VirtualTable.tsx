import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';

interface VirtualTableProps<T> {
  data: T[];
  rowHeight: number;
  containerHeight: number;
  renderRow: (item: T, index: number) => React.ReactNode;
  renderHeader?: () => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  overscan?: number;
  className?: string;
  emptyMessage?: string;
}

/**
 * High-performance virtual table that only renders visible rows
 * Prevents memory issues with large datasets (1000+ items)
 */
function VirtualTableInner<T>({
  data,
  rowHeight,
  containerHeight,
  renderRow,
  renderHeader,
  keyExtractor,
  overscan = 5,
  className = '',
  emptyMessage = 'No data available'
}: VirtualTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate visible range
  const { startIndex, endIndex, visibleCount } = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / rowHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endIndex = Math.min(data.length, startIndex + visibleCount + overscan * 2);
    
    return { startIndex, endIndex, visibleCount };
  }, [scrollTop, containerHeight, rowHeight, data.length, overscan]);

  // Handle scroll with throttling
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    // Only update if scroll position changed significantly (reduces re-renders)
    if (Math.abs(newScrollTop - scrollTop) > rowHeight / 2) {
      setScrollTop(newScrollTop);
    }
  }, [scrollTop, rowHeight]);

  // Total height of all items
  const totalHeight = data.length * rowHeight;

  // Offset for the visible items
  const offsetY = startIndex * rowHeight;

  // Visible items
  const visibleItems = useMemo(() => {
    return data.slice(startIndex, endIndex);
  }, [data, startIndex, endIndex]);

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full text-gray-500 dark:text-gray-400 ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={className}>
      {renderHeader && (
        <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
          {renderHeader()}
        </div>
      )}
      <div
        ref={containerRef}
        className="overflow-auto"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: offsetY,
              left: 0,
              right: 0
            }}
          >
            {visibleItems.map((item, localIndex) => {
              const globalIndex = startIndex + localIndex;
              return (
                <div
                  key={keyExtractor(item, globalIndex)}
                  style={{ height: rowHeight }}
                >
                  {renderRow(item, globalIndex)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Memoize the entire component to prevent unnecessary re-renders
export const VirtualTable = memo(VirtualTableInner) as typeof VirtualTableInner;

/**
 * Hook to manage virtual table state with stable references
 */
export function useVirtualTable<T>(items: T[], pageSize = 100) {
  const [page, setPage] = useState(0);
  
  const paginatedItems = useMemo(() => {
    const start = 0;
    const end = (page + 1) * pageSize;
    return items.slice(start, end);
  }, [items, page, pageSize]);
  
  const hasMore = paginatedItems.length < items.length;
  
  const loadMore = useCallback(() => {
    if (hasMore) {
      setPage(p => p + 1);
    }
  }, [hasMore]);
  
  // Reset pagination when items change significantly
  useEffect(() => {
    setPage(0);
  }, [items.length]);
  
  return {
    items: paginatedItems,
    hasMore,
    loadMore,
    totalCount: items.length,
    loadedCount: paginatedItems.length
  };
}

/**
 * Simple pagination hook for non-virtual tables
 */
export function usePagination<T>(items: T[], initialPageSize = 50) {
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [currentPage, setCurrentPage] = useState(0);
  
  const totalPages = Math.ceil(items.length / pageSize);
  
  const paginatedItems = useMemo(() => {
    const start = currentPage * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);
  
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
  }, [totalPages]);
  
  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);
  
  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);
  
  // Reset to first page when items change
  useEffect(() => {
    setCurrentPage(0);
  }, [items.length]);
  
  return {
    items: paginatedItems,
    currentPage,
    totalPages,
    pageSize,
    setPageSize,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages - 1,
    hasPrevPage: currentPage > 0,
    totalCount: items.length
  };
}
