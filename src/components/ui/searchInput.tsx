import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    onClear?: () => void; // NEW
    value?: string;
}

const SearchInput = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, value, onClear, ...props }, ref) => {
        const showClear = value && value.length > 0;

        return (
            <div className="relative w-full">
                <input
                    type={type}
                    value={value}
                    ref={ref}
                    className={cn(
                        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 pr-8 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                        className
                    )}
                    {...props}
                />

                {showClear && onClear && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                )}
            </div>
        );
    }
);

SearchInput.displayName = "SearchInput";

export { SearchInput };
