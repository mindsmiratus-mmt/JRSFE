import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";


export interface Column<T> {
    key: string;
    label: string;
    sortable?: boolean;
    render?: (row: T) => React.ReactNode;
}


export interface Action<T> {
    label: string;
    tooltip?: string;
    variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
    onClick: (row: T) => void;
    icon?: React.ReactNode;
    hidden?: (row: T) => boolean;
}


export interface PaginationProps {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    onPageChange: (newPage: number) => void;
    onPageSizeChange?: (newPageSize: number) => void;
}


export interface CommonTableProps<T extends { id: any }> {
    columns: Column<T>[];
    data: T[];
    actions?: Action<T>[];
    pagination?: PaginationProps;
    search?: string;
    sort?: {
        key: string;
        order: "asc" | "desc" | "";
    };
    loading?: boolean;
    emptyMessage?: string;
    onSearch?: (value: string) => void;
    onSort?: (key: string) => void;
}


export function CommonTable<T extends { id: any }>({
    columns,
    data,
    actions = [],
    pagination,
    sort = { key: "", order: "asc" },
    loading = false,
    emptyMessage = "No records found",
    onSort = () => { },
}: CommonTableProps<T>) {

    const handleSort = (key: string) => {
        if (!columns.find((c) => c.key === key)?.sortable) return;
        onSort(key);
    };

    const getSortIcon = (key: string) => {
        if (sort.key !== key) return <ChevronsUpDown className="h-4 w-4 2xl:h-5 2xl:w-5 opacity-40" />;
        if (sort.order === "asc") return <ChevronUp className="h-4 w-4 2xl:h-5 2xl:w-5" />;
        if (sort.order === "desc") return <ChevronDown className="h-4 w-4 2xl:h-5 2xl:w-5" />;
        return <ChevronsUpDown className="h-4 w-4 2xl:h-5 2xl:w-5" />;
    };

    return (
        <TooltipProvider delayDuration={200}>
            <div className="space-y-6">

                {/* Table */}
                <div className="rounded-xl border border-[#d8e5e1] bg-white shadow-sm overflow-hidden">
                    <div className="overflow-x-auto w-full">
                        <table className="w-full table-auto">
                            <thead className="sticky top-0 z-10 bg-[#eaf3f1] shadow-[0_1px_0_0_#d8e5e1]">
                                <tr>
                                    {columns.map((col) => (
                                        <th
                                            key={col.key}
                                            className={cn(
                                                // Base → lg → 2xl (1440p+) → 4K (2560p+)
                                                "px-4 py-3 2xl:px-6 2xl:py-4",
                                                "text-left text-sm 2xl:text-base",
                                                "font-semibold text-[#2b463f] whitespace-nowrap",
                                                col.sortable && "cursor-pointer hover:bg-[#dcebea] select-none"
                                            )}
                                            onClick={() => col.sortable && handleSort(col.key)}
                                        >
                                            <div className="flex items-center gap-1 2xl:gap-2">
                                                {col.label}
                                                {col.sortable && getSortIcon(col.key)}
                                            </div>
                                        </th>
                                    ))}
                                    {actions.length > 0 && (
                                        <th className="px-4 py-3 2xl:px-6 2xl:py-4 text-right text-sm 2xl:text-base font-medium text-muted-foreground whitespace-nowrap">
                                            Actions
                                        </th>
                                    )}
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                                            className="text-center py-10 2xl:py-16"
                                        >
                                            <div className="text-sm 2xl:text-base text-[#2b463f]">Loading...</div>
                                        </td>
                                    </tr>
                                ) : data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                                            className="text-center py-12 2xl:py-20"
                                        >
                                            <p className="text-sm 2xl:text-base text-[#2b463f]">{emptyMessage}</p>
                                        </td>
                                    </tr>
                                ) : (
                                    data.map((row) => (
                                        <tr
                                            key={row.id}
                                            className="border-b hover:bg-muted/50 transition-colors"
                                        >
                                            {columns.map((col) => (
                                                <td
                                                    key={col.key}
                                                    className="px-4 py-3 2xl:px-6 2xl:py-4 text-sm 2xl:text-base"
                                                >
                                                    {col.render ? col.render(row) : (row as any)[col.key]}
                                                </td>
                                            ))}

                                            {actions.length > 0 && (
                                                <td className="px-4 py-3 2xl:px-6 2xl:py-4 text-right">
                                                    <div className="flex justify-end gap-2 2xl:gap-3">
                                                        {actions.map((action, idx) =>
                                                            action.hidden?.(row) ? null : (
                                                                <Tooltip key={idx}>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            size="sm"
                                                                            variant={action.variant || "ghost"}
                                                                            onClick={() => action.onClick(row)}
                                                                            className={cn(
                                                                                "h-8 w-8 2xl:h-10 2xl:w-10 rounded-lg transition-all hover:scale-110",
                                                                                "[&_svg]:h-4 [&_svg]:w-4 2xl:[&_svg]:h-5 2xl:[&_svg]:w-5",
                                                                                action.label === "Edit" &&
                                                                                "text-[#2b463f] hover:bg-[#dcebea]",
                                                                                action.label === "Delete" &&
                                                                                "text-red-600 hover:bg-red-50"
                                                                            )}
                                                                        >
                                                                            {action.icon}
                                                                        </Button>
                                                                    </TooltipTrigger>

                                                                    <TooltipContent className="bg-[#2b463f] text-[#e6f2ef] border border-[#3d5f55]">
                                                                        <span className="text-xs 2xl:text-sm font-medium">
                                                                            {action.tooltip || action.label}
                                                                        </span>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination && (
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 2xl:px-6 2xl:py-4 border-t border-[#d8e5e1]">

                            {/* LEFT: Showing text + Page size selector */}
                            <div className="flex items-center gap-3 2xl:gap-4">
                                <p className="text-sm 2xl:text-base text-muted-foreground">
                                    {pagination.total === 0
                                        ? "Showing 0 results"
                                        : `Showing ${(pagination.page - 1) * pagination.pageSize + 1} to ${Math.min(pagination.page * pagination.pageSize, pagination.total)} of ${pagination.total} results`
                                    }
                                </p>

                                {pagination.onPageSizeChange && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm 2xl:text-base text-muted-foreground whitespace-nowrap">
                                            Rows per page:
                                        </span>
                                        <select
                                            value={pagination.pageSize}
                                            onChange={(e) => {
                                                pagination.onPageSizeChange?.(Number(e.target.value));
                                            }}
                                            className="h-8 2xl:h-10 rounded-md border border-[#d8e5e1] bg-white px-2 2xl:px-3 text-sm 2xl:text-base text-[#2b463f] focus:outline-none focus:ring-2 focus:ring-[#2b463f]/30 cursor-pointer"
                                        >
                                            {[10, 20, 30, 50].map((size) => (
                                                <option key={size} value={size}>
                                                    {size}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* RIGHT: Page navigation */}
                            <div className="flex items-center gap-2 2xl:gap-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => pagination.onPageChange(1)}
                                    disabled={pagination.page === 1}
                                    className="text-sm 2xl:text-base 2xl:h-10 2xl:px-4"
                                >
                                    First
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => pagination.onPageChange(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className="text-sm 2xl:text-base 2xl:h-10 2xl:px-4"
                                >
                                    Previous
                                </Button>

                                <span className="text-sm 2xl:text-base text-muted-foreground whitespace-nowrap">
                                    Page {pagination.page} of {pagination.totalPages}
                                </span>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => pagination.onPageChange(pagination.page + 1)}
                                    disabled={pagination.page === pagination.totalPages || pagination.total === 0}
                                    className="text-sm 2xl:text-base 2xl:h-10 2xl:px-4"
                                >
                                    Next
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => pagination.onPageChange(pagination.totalPages)}
                                    disabled={pagination.page === pagination.totalPages || pagination.total === 0}
                                    className="text-sm 2xl:text-base 2xl:h-10 2xl:px-4"
                                >
                                    Last
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}