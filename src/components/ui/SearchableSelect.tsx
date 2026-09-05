"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface OptionType {
    value: string | number
    label: string
}

interface Props {
    options: OptionType[]
    value?: string | number
    placeholder?: string
    onChange: (value: string | number | undefined) => void
    disabled?: boolean
    allowCustomValue?: boolean
}

export function SearchableSelect({
    options,
    value,
    placeholder,
    onChange,
    disabled = false,
    allowCustomValue = false,
}: Props) {
    const [localOptions, setLocalOptions] = useState<OptionType[]>(options)
    const [search, setSearch] = useState("")

    useEffect(() => {
        setLocalOptions(options)
    }, [options])

    const selectedLabel =
        localOptions.find((o) => String(o.value) === String(value))?.label ||
        (allowCustomValue && value ? String(value) : undefined)

    const filteredOptions = localOptions.filter((o) => {
        if (typeof o.label === "string") {
            return o.label.toLowerCase().includes(search.toLowerCase())
        }
        return false
    })

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Prevent Radix Select from closing immediately when hitting Enter inside the input
        if (e.key === "Enter") {
            e.preventDefault()
            e.stopPropagation()

            if (allowCustomValue && search.trim()) {
                const custom = search.trim()
                setLocalOptions((prev) => [
                    ...prev,
                    { value: custom, label: custom }
                ])
                onChange(custom)
                setSearch("")
            }
        }
    }

    return (
        <div className="relative w-full">
            <Select
                value={value ? String(value) : ""}
                onValueChange={(v) => {
                    if (!disabled) {
                        onChange(v)
                        setSearch("") // Clear search when a value is selected
                    }
                }}
                // ✅ ADDED: Clear search input when the user clicks outside and closes the dropdown
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setSearch("")
                    }
                }}
                disabled={disabled}
            >
                {/* trigger */}
                <SelectTrigger
                    className={cn(
                        "pr-10 relative bg-white",
                        disabled && "opacity-60 cursor-not-allowed"
                    )}
                >
                    {disabled ? (
                        <span className="text-sm text-muted-foreground">
                            {selectedLabel || placeholder}
                        </span>
                    ) : (
                        <span className="text-sm truncate">
                            {selectedLabel || <span className="text-muted-foreground">{placeholder}</span>}
                        </span>
                    )}
                </SelectTrigger>

                {/* clear button */}
                {value && !disabled && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onChange(undefined)
                            setSearch("")
                        }}
                        className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-20 bg-white rounded-full p-1"
                    >
                        <X size={14} />
                    </button>
                )}

                {/* dropdown */}
                {!disabled && (
                    <SelectContent 
                        position="popper" 
                        className="z-[9999]"
                        // ✅ REMOVED: onPointerDownOutside={(e) => e.preventDefault()}
                        // Removing that line fixes the bug where it wouldn't close on outside clicks!
                    >
                        {/* search input */}
                        <div
                            className="sticky top-0 z-10 bg-popover px-2 py-2 border-b"
                            onKeyDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            // Prevent focus from being stolen back by the modal
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <Input
                                placeholder={allowCustomValue ? "Search or type..." : "Search..."}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="h-8"
                                autoFocus
                            />
                        </div>

                        {/* list */}
                        <div className="max-h-[250px] overflow-y-auto mt-1">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((item) => (
                                    <SelectItem key={item.value} value={String(item.value)}>
                                        {item.label}
                                    </SelectItem>
                                ))
                            ) : search.trim() ? (
                                <SelectItem 
                                    key="custom" 
                                    value={search.trim()}
                                    className="text-sm"
                                >
                                    {search.trim()}
                                </SelectItem>
                            ) : (
                                <div className="px-3 py-4 text-sm text-center text-muted-foreground">
                                    No results found
                                </div>
                            )}
                        </div>
                    </SelectContent>
                )}
            </Select>
        </div>
    )
}