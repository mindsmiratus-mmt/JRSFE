// pages/SaleItemAvailabilityPage.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  LayoutGrid,
  Table as TableIcon,
  Loader2,
  Package,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  useSaleItemsByStatus,
  type SaleItemAvailability,
} from '@/hooks/useSaleItemAvailability';

type Props = {
  status?: string;
};

export default function SaleItemAvailabilityPage({
  status = 'Available',
}: Props) {
  const { selectedShop } = useAuth();

  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(status);
  const [typeFilter, setTypeFilter] = useState<'All' | 'Bulk' | 'Single'>('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const shopId = selectedShop?.id ? String(selectedShop.id) : 'All';
  const shopName = selectedShop?.name ?? 'All Shops';

  const {
    data: items = [],
    isLoading,
    isError,
    error,
  } = useSaleItemsByStatus(statusFilter, selectedShop?.id);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !q ||
        String(item.itemId ?? '').toLowerCase().includes(q) ||
        (item.tagNumber ?? '').toLowerCase().includes(q) ||
        (item.itemName ?? '').toLowerCase().includes(q) ||
        (item.category ?? '').toLowerCase().includes(q) ||
        String(item.quantity ?? '').toLowerCase().includes(q) ||
        (item.isBulkItem ? 'bulk' : 'single').includes(q);

      const matchesType =
        typeFilter === 'All'
          ? true
          : typeFilter === 'Bulk'
          ? item.isBulkItem
          : !item.isBulkItem;

      return matchesSearch && matchesType;
    });
  }, [items, search, typeFilter]);

  const summary = useMemo(() => {
    return {
      totalItems: filteredItems.length,
      bulkItems: filteredItems.filter((item) => item.isBulkItem).length,
      singleItems: filteredItems.filter((item) => !item.isBulkItem).length,
      totalQuantity: filteredItems.reduce((sum, item) => sum + (item.quantity ?? 0), 0),
    };
  }, [filteredItems]);

  const total = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter(status);
    setTypeFilter('All');
    setPage(1);
  };

  const inputClass =
    'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent';

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Sale Item Availability
          </h1>
          <p className="text-sm text-gray-600">
            Shop: <span className="font-medium">{shopName}</span> | Shop ID:{' '}
            <span className="font-medium">{shopId}</span> | Status:{' '}
            <span className="font-medium">{statusFilter}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-muted rounded-lg border p-1 flex items-center gap-1">
            <Button
              type="button"
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className={cn(
                'h-8 px-3',
                viewMode === 'table' && 'bg-white text-black shadow-sm hover:bg-white'
              )}
            >
              <TableIcon className="mr-2 h-4 w-4" />
              Table
            </Button>

            <Button
              type="button"
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={cn(
                'h-8 px-3',
                viewMode === 'grid' && 'bg-white text-black shadow-sm hover:bg-white'
              )}
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              Grid
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5 items-end">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Search
            </label>
            <input
              type="text"
              placeholder="Item ID, Tag Number, Item Name, Category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass}
            >
              <option value="Available">Available</option>
              <option value="Sold">Sold</option>
              <option value="Reserved">Reserved</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'All' | 'Bulk' | 'Single')}
              className={inputClass}
            >
              <option value="All">All Types</option>
              <option value="Bulk">Bulk</option>
              <option value="Single">Single</option>
            </select>
          </div>

          <div>
            {(search || typeFilter !== 'All' || statusFilter !== status) && (
              <Button
                type="button"
                onClick={clearFilters}
                className="w-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                variant="outline"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Filtered Rows</p>
          <p className="text-xl font-bold">{summary.totalItems}</p>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Bulk Items</p>
          <p className="text-xl font-bold text-amber-700">{summary.bulkItems}</p>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Single Items</p>
          <p className="text-xl font-bold text-sky-700">{summary.singleItems}</p>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Quantity</p>
          <p className="text-xl font-bold">{summary.totalQuantity}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border bg-white py-16 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading sale item availability...
          </div>
        </div>
      ) : isError ? (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-red-600">
            {(error as Error)?.message || 'Failed to load sale item availability.'}
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center shadow-sm">
          <Package className="mx-auto mb-3 h-10 w-10 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">No items found</h3>
          <p className="mt-1 text-sm text-gray-600">
            No sale item availability records match your current filters.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Item ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Tag Number</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Item Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Category</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Quantity</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Total Wt. (g)</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Remaining Wt. (g)</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                </tr>
              </thead>

              <tbody>
                {paginatedItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b last:border-b-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{item.itemId}</td>
                    <td className="px-4 py-3">{item.tagNumber || '-'}</td>
                    <td className="px-4 py-3">{item.itemName || '-'}</td>
                    <td className="px-4 py-3">{item.category || '-'}</td>
                    <td className="px-4 py-3">{item.quantity ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-medium',
                        item.isBulkItem ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                      )}>
                        {item.isBulkItem ? 'Bulk' : 'Single'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{(item as any).totalWeight != null ? Number((item as any).totalWeight).toFixed(3) : '—'}</td>
                    <td className="px-4 py-3">{(item as any).remainingWeight != null ? Number((item as any).remainingWeight).toFixed(3) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-medium',
                        item.status === 'Available' ? 'bg-emerald-100 text-emerald-700'
                        : item.status === 'Sold' ? 'bg-red-100 text-red-700'
                        : item.status === 'Reserved' ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700'
                      )}>
                        {item.status || 'Available'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > 0 && (
            <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-500">
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, total)} of {total} entries
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Rows</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
                  >
                    {[10, 20, 30, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>

                <div className="px-2 text-sm font-medium">
                  Page {page} of {totalPages}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {paginatedItems.map((item: SaleItemAvailability) => (
              <div
                key={item.id}
                className="rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">#{item.itemId}</h3>
                    <p className="text-sm text-gray-500">Tag: {item.tagNumber || '-'}</p>
                  </div>

                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-medium',
                      item.isBulkItem
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-sky-100 text-sky-700'
                    )}
                  >
                    {item.isBulkItem ? 'Bulk' : 'Single'}
                  </span>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Item Name</p>
                    <p className="font-semibold text-gray-900">{item.itemName || '-'}</p>
                  </div>

                  <div>
                    <p className="text-gray-500">Category</p>
                    <p className="font-semibold text-gray-900">{item.category || '-'}</p>
                  </div>

                  <div>
                    <p className="text-gray-500">Quantity</p>
                    <p className="font-semibold text-gray-900">{item.quantity ?? '-'}</p>
                  </div>

                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className="font-semibold text-gray-900">{item.status || 'Available'}</p>
                  </div>

                  <div>
                    <p className="text-gray-500">Total Wt. (g)</p>
                    <p className="font-semibold text-gray-900">{(item as any).totalWeight != null ? Number((item as any).totalWeight).toFixed(3) : '—'}</p>
                  </div>

                  <div>
                    <p className="text-gray-500">Remaining Wt. (g)</p>
                    <p className="font-semibold text-gray-900">{(item as any).remainingWeight != null ? Number((item as any).remainingWeight).toFixed(3) : '—'}</p>
                  </div>
                </div>

              </div>
            ))}
          </div>

          {total > 0 && (
            <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-500">
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, total)} of {total} entries
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Rows</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
                  >
                    {[10, 20, 30, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>

                <div className="px-2 text-sm font-medium">
                  Page {page} of {totalPages}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}