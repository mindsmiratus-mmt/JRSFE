// pages/stock-movement/StockMovement.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

import { CommonTable } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";

import {
  useStockMovements,
} from "@/hooks/useStockMovement";
import { DateInput } from "@/components/ui/DatePicker";
import { SearchInput } from "@/components/ui/searchInput";
import { useAuth } from "@/contexts/AuthContext";

export const StockMovement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const navigate = useNavigate();

  const { permissions, user } = useAuth();
  const actionPermitions = permissions.find((item) => item?.Module === 'Stock Movement');
  const isAdmin =
    user?.userRoles?.some(
      (ur: any) => ur.role?.name === 'Admin'
    ) ?? false;

  const isBefore = (a: string | null, b: string | null) => {
    if (!a || !b) return false;
    return new Date(a) < new Date(b);
  };

  const isAfter = (a: string | null, b: string | null) => {
    if (!a || !b) return false;
    return new Date(a) > new Date(b);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, fromDate, toDate]);

  const { data, isLoading, isFetching } = useStockMovements({
    page,
    pageSize,
    keyword: debouncedSearch || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  const stockMovements = data?.data || [];
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <Package className="w-7 h-7 sm:w-8 sm:h-8 text-[#b08d28]" />
          Stock Movements
        </h1>

        {(actionPermitions?.Create || isAdmin) && (
          <Button
            onClick={() => navigate("/admin/stock-movement/new")}
            size="lg"
            className="w-full sm:w-auto"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Stock Movement
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <SearchInput
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm("")}
            className="max-w-md"
          />
        </div>

        <DateInput
          value={fromDate || ""}
          onValueChange={(val) => {
            if (val && toDate && isAfter(val, toDate)) {
              toast.error("From date cannot be after To date");
              return;
            }
            setFromDate(val);
            setPage(1);
          }}
          placeholder="From Date"
          max={toDate || undefined}
        />

        <DateInput
          value={toDate || ""}
          onValueChange={(val) => {
            if (val && fromDate && isBefore(val, fromDate)) {
              toast.error("To date cannot be before From date");
              return;
            }
            setToDate(val);
            setPage(1);
          }}
          placeholder="To Date"
          min={fromDate || undefined}
        />
      </div>

      {/* StockMovements Table */}
      <CommonTable
        columns={[
          {
            key: "referenceNo",
            label: "Reference No",
            render: (r) => (
              <span className="font-semibold"
              >
                {r.referenceNo}
              </span>
            ),
          },
          {
            key: "createDate",
            label: "Date",
            render: (r) => format(new Date(r.createDate), "dd MMM yyyy, hh:mm a"),
          },
          {
            key: "item",
            label: "Item",
            render: (r) => (
              <div>
                <div className="font-medium">{r.item.name}</div>
                <div className="text-sm text-gray-500">{r.item.barcode}</div>
              </div>
            ),
          },
          {
            key: "type",
            label: "Type",
            render: (r) => (
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${r.type === "IN" || r.type === "PURCHASE"
                  ? "bg-green-100 text-green-800"
                  : r.type === "OUT" || r.type === "SALE"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
                  }`}
              >
                {r.type}
              </span>
            ),
          },
          {
            key: "quantity",
            label: "Quantity",
            render: (r) => (
              <span className="font-semibold">
                {r.quantity.toLocaleString("en-IN")}
              </span>
            ),
          },
          {
            key: "netWeight",
            label: "Net Weight (g)",
            render: (r) => (
              <span className="font-semibold">
                {r.netWeight.toLocaleString("en-IN", { maximumFractionDigits: 3 })}
              </span>
            ),
          },
        ]}
        data={stockMovements}
        loading={isLoading || isFetching}
        actions={[]}
        emptyMessage="No stock movements found"
      />
    </div>
  );
};




// pages/stock-movement/StockMovement.tsx
// import { useEffect, useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Plus, Package, LayoutGrid, Table as TableIcon } from "lucide-react";
// import { format } from "date-fns";
// import { useNavigate } from "react-router-dom";
// import { cn } from "@/lib/utils";

// import { CommonTable } from "@/components/ui/table";
// import { toast } from "@/components/ui/toast";

// import {
//   useStockMovements,
// } from "@/hooks/useStockMovement";
// import { DateInput } from "@/components/ui/DatePicker";
// import { SearchInput } from "@/components/ui/searchInput";
// import { useAuth } from "@/contexts/AuthContext";

// export const StockMovement = () => {
//   const [searchTerm, setSearchTerm] = useState("");
  
//   // View Mode: 'table' or 'grid'
//   const [viewMode, setViewMode] = useState<"table" | "grid">("table");

//   const [page, setPage] = useState(1);
//   const [pageSize, setPageSize] = useState(10);
//   const [fromDate, setFromDate] = useState<string | null>(null);
//   const [toDate, setToDate] = useState<string | null>(null);
//   const [debouncedSearch, setDebouncedSearch] = useState("");
//   const navigate = useNavigate();

//   const { permissions, user } = useAuth();
//   const actionPermitions = permissions.find((item) => item?.Module === 'Stock Movement');
//   const isAdmin =
//     user?.userRoles?.some(
//       (ur: any) => ur.role?.name === 'Admin'
//     ) ?? false;

//   const isBefore = (a: string | null, b: string | null) => {
//     if (!a || !b) return false;
//     return new Date(a) < new Date(b);
//   };

//   const isAfter = (a: string | null, b: string | null) => {
//     if (!a || !b) return false;
//     return new Date(a) > new Date(b);
//   };

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setDebouncedSearch(searchTerm);
//       setPage(1);
//     }, 500);
//     return () => clearTimeout(timer);
//   }, [searchTerm]);

//   // Reset page when filters change
//   useEffect(() => {
//     setPage(1);
//   }, [debouncedSearch, fromDate, toDate]);

//   const { data, isLoading, isFetching } = useStockMovements({
//     page,
//     pageSize,
//     keyword: debouncedSearch || undefined,
//     fromDate: fromDate || undefined,
//     toDate: toDate || undefined,
//   });

//   // Safely extract properties by casting to any to fix TypeScript errors
//   const responseData = data as any;
//   const stockMovements = responseData?.data || [];
  
//   // Fallback to array length if totalCount is missing from the API
//   const totalCount = responseData?.totalCount || stockMovements.length;
//   const totalPages = responseData?.totalPages || Math.ceil(totalCount / pageSize) || 1;

//   return (
//     <div className="space-y-6 p-4 sm:p-6 max-w-full overflow-x-hidden">
//       {/* Header */}
//       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
//         <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
//           <Package className="w-8 h-8 text-[#b08d28]" />
//           Stock Movements
//         </h1>

//         <div className="flex gap-2 w-full sm:w-auto items-center">
//             {/* View Toggle */}
//             <div className="bg-muted p-1 rounded-lg flex items-center gap-1 border shrink-0">
//                 <Button
//                     variant={viewMode === "table" ? "default" : "ghost"}
//                     size="sm"
//                     onClick={() => setViewMode("table")}
//                     className={cn(
//                         "h-8 px-2",
//                         viewMode === "table" && "bg-white text-black shadow-sm hover:bg-white"
//                     )}
//                 >
//                     <TableIcon className="w-4 h-4 mr-1.5" /> Table
//                 </Button>
//                 <Button
//                     variant={viewMode === "grid" ? "default" : "ghost"}
//                     size="sm"
//                     onClick={() => setViewMode("grid")}
//                     className={cn(
//                         "h-8 px-2",
//                         viewMode === "grid" && "bg-white text-black shadow-sm hover:bg-white"
//                     )}
//                 >
//                     <LayoutGrid className="w-4 h-4 mr-1.5" /> Grid
//                 </Button>
//             </div>

//             {(actionPermitions?.Create || isAdmin) && (
//               <Button
//                 onClick={() => navigate("/admin/stock-movement/new")}
//                 size="lg"
//                 className="h-10 shrink-0 whitespace-nowrap"
//               >
//                 <Plus className="w-5 h-5 mr-2" />
//                 <span className="hidden sm:inline">Create Movement</span>
//                 <span className="sm:hidden">Create</span>
//               </Button>
//             )}
//         </div>
//       </div>

//       {/* Search & Filters */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
//         <div className="relative">
//           <SearchInput
//             placeholder="Search movements..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             onClear={() => setSearchTerm("")}
//             className="max-w-md"
//           />
//         </div>

//         <DateInput
//           value={fromDate || ""}
//           onValueChange={(val) => {
//             if (val && toDate && isAfter(val, toDate)) {
//               toast.error("From date cannot be after To date");
//               return;
//             }
//             setFromDate(val);
//             setPage(1);
//           }}
//           placeholder="From Date"
//           max={toDate || undefined}
//         />

//         <DateInput
//           value={toDate || ""}
//           onValueChange={(val) => {
//             if (val && fromDate && isBefore(val, fromDate)) {
//               toast.error("To date cannot be before From date");
//               return;
//             }
//             setToDate(val);
//             setPage(1);
//           }}
//           placeholder="To Date"
//           min={fromDate || undefined}
//         />
//       </div>

//       {/* Clear Filters Button */}
//       {(searchTerm || fromDate || toDate) && (
//         <div className="flex justify-end">
//             <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setFromDate(null); setToDate(null); setPage(1); }} className="text-gray-500 hover:text-gray-800">
//                 Clear Filters
//             </Button>
//         </div>
//       )}

//       {/* Content Views */}
//       {isLoading || isFetching ? (
//           <div className="flex justify-center py-8"><p className="text-gray-500">Loading stock movements...</p></div>
//       ) : stockMovements.length === 0 ? (
//           <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
//               <p className="text-gray-500">No stock movements found.</p>
//           </div>
//       ) : viewMode === "table" ? (
//           /* --- TABLE VIEW --- */
//           <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
//               <CommonTable
//                 columns={[
//                   {
//                     key: "referenceNo",
//                     label: "Reference No",
//                     render: (r: any) => (
//                       <span className="font-semibold text-gray-900 whitespace-nowrap">
//                         {r.referenceNo}
//                       </span>
//                     ),
//                   },
//                   {
//                     key: "createDate",
//                     label: "Date",
//                     render: (r: any) => (
//                         <div className="flex flex-col gap-0.5 text-xs text-muted-foreground whitespace-nowrap">
//                             <span className="text-foreground font-medium">{format(new Date(r.createDate), "dd MMM yyyy")}</span>
//                             <span>{format(new Date(r.createDate), "hh:mm a")}</span>
//                         </div>
//                     ),
//                   },
//                   {
//                     key: "item",
//                     label: "Item",
//                     render: (r: any) => (
//                       <div className="min-w-[150px]">
//                         <div className="font-medium text-gray-900 line-clamp-1" title={r.item?.name}>{r.item?.name}</div>
//                         <div className="text-xs text-gray-500 font-mono mt-0.5">{r.item?.barcode}</div>
//                       </div>
//                     ),
//                   },
//                   {
//                     key: "type",
//                     label: "Type",
//                     render: (r: any) => {
//                       const t = r.type?.toUpperCase() || "";
//                       const isGreen = t === "IN" || t === "PURCHASE";
//                       const isRed = t === "OUT" || t === "SALE";
//                       return (
//                         <span
//                           className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase whitespace-nowrap
//                           ${isGreen ? "bg-green-100 text-green-800 border border-green-200" 
//                           : isRed ? "bg-red-100 text-red-800 border border-red-200" 
//                           : "bg-gray-100 text-gray-800 border border-gray-200"}`}
//                         >
//                           {r.type}
//                         </span>
//                       );
//                     },
//                   },
//                   {
//                     key: "quantity",
//                     label: "Quantity",
//                     render: (r: any) => (
//                       <span className="font-semibold text-gray-900">
//                         {r.quantity?.toLocaleString("en-IN") || 0}
//                       </span>
//                     ),
//                   },
//                   {
//                     key: "netWeight",
//                     label: "Net Weight",
//                     render: (r: any) => (
//                       <span className="font-medium text-gray-900 whitespace-nowrap">
//                         {r.netWeight?.toLocaleString("en-IN", { maximumFractionDigits: 3 }) || 0} g
//                       </span>
//                     ),
//                   },
//                 ]}
//                 data={stockMovements}
//                 loading={isLoading || isFetching}
//                 actions={[]}
//                 emptyMessage="No stock movements found"
//                 pagination={{
//                     page: page,
//                     pageSize: pageSize,
//                     total: totalCount, 
//                     totalPages: totalPages,
//                     onPageChange: (newPage: number) => setPage(newPage),
//                     onPageSizeChange: (newPageSize: number) => {
//                         setPageSize(newPageSize);
//                         setPage(1); 
//                     }
//                 }}
//               />
//           </div>
//       ) : (
//           /* --- GRID VIEW --- */
//           <div className="flex flex-col gap-4">
//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
//                   {stockMovements.map((r: any) => {
//                       const t = r.type?.toUpperCase() || "";
//                       const isGreen = t === "IN" || t === "PURCHASE";
//                       const isRed = t === "OUT" || t === "SALE";

//                       return (
//                           <div key={r.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col relative hover:shadow-md transition-shadow">
//                               {/* Header */}
//                               <div className="flex justify-between items-start gap-2 mb-3">
//                                   <div className="flex-1 min-w-0">
//                                       <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">Reference No</div>
//                                       <div className="font-bold text-gray-900 text-sm font-mono truncate" title={r.referenceNo}>
//                                           {r.referenceNo}
//                                       </div>
//                                   </div>
//                                   <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase shrink-0
//                                       ${isGreen ? "bg-green-100 text-green-800" 
//                                       : isRed ? "bg-red-100 text-red-800" 
//                                       : "bg-gray-100 text-gray-800"}`}
//                                   >
//                                       {r.type}
//                                   </span>
//                               </div>

//                               {/* Item Details */}
//                               <div className="bg-gray-50/50 border border-gray-100 rounded-lg p-3 mb-4">
//                                   <div className="font-semibold text-gray-900 line-clamp-1 text-base" title={r.item?.name}>
//                                       {r.item?.name || "Unknown Item"}
//                                   </div>
//                                   <div className="text-xs text-gray-500 font-mono mt-1">
//                                       Barcode: <span className="text-gray-800 font-medium">{r.item?.barcode || "—"}</span>
//                                   </div>
//                               </div>

//                               {/* Metrics */}
//                               <div className="grid grid-cols-2 gap-4 mb-4">
//                                   <div>
//                                       <div className="text-[11px] text-gray-500 mb-0.5">Quantity</div>
//                                       <div className="font-bold text-gray-900 text-lg">{r.quantity?.toLocaleString("en-IN") || 0}</div>
//                                   </div>
//                                   <div>
//                                       <div className="text-[11px] text-gray-500 mb-0.5">Net Weight</div>
//                                       <div className="font-bold text-gray-900 text-lg">{r.netWeight?.toLocaleString("en-IN", { maximumFractionDigits: 3 }) || 0} <span className="text-sm font-medium text-gray-500">g</span></div>
//                                   </div>
//                               </div>

//                               {/* Footer Date */}
//                               <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
//                                   <span>{format(new Date(r.createDate), "dd MMM yyyy")}</span>
//                                   <span>{format(new Date(r.createDate), "hh:mm a")}</span>
//                               </div>
//                           </div>
//                       );
//                   })}
//               </div>

//               {/* Grid Pagination Footer */}
//               {totalPages > 0 && (
//                   <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-lg border border-gray-200 gap-4 mt-2 shadow-sm">
//                       <div className="text-sm text-gray-500 font-medium">
//                           Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} entries
//                       </div>
//                       <div className="flex items-center gap-4">
//                           <div className="flex items-center gap-2">
//                               <span className="text-sm text-gray-500">Rows per page:</span>
//                               <select 
//                                   className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                   value={pageSize}
//                                   onChange={(e) => {
//                                       setPageSize(Number(e.target.value));
//                                       setPage(1);
//                                   }}
//                               >
//                                   {[10, 20, 30, 40, 50, 100].map(sz => <option key={sz} value={sz}>{sz}</option>)}
//                               </select>
//                           </div>
//                           <div className="flex gap-1">
//                               <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</Button>
//                               <div className="px-3 py-1 text-sm font-medium border border-transparent flex items-center justify-center">
//                                   {page} / {totalPages}
//                               </div>
//                               <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</Button>
//                           </div>
//                       </div>
//                   </div>
//               )}
//           </div>
//       )}
//     </div>
//   );
// };