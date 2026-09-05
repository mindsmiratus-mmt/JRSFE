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
    emptyStateColor?: "warning" | "orange" | "yellow"
    selectedStateColor?: "success" | "green"
    className?: string
}

export function SelectSearchColor({
    options,
    value,
    placeholder,
    onChange,
    disabled = false,
    allowCustomValue = false,
    emptyStateColor = "orange",
    selectedStateColor = "green",
    className,
}: Props) {
    const [localOptions, setLocalOptions] = useState<OptionType[]>(options)
    const [search, setSearch] = useState("")

    useEffect(() => {
        setLocalOptions(options)
    }, [options])

    const hasValue =
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""

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
        if (e.key === "Enter") {
            e.preventDefault()
            e.stopPropagation()

            if (allowCustomValue && search.trim()) {
                const custom = search.trim()
                setLocalOptions((prev) => [
                    ...prev,
                    { value: custom, label: custom },
                ])
                onChange(custom)
                setSearch("")
            }
        }
    }

    const emptyColorClass =
        emptyStateColor === "yellow"
            ? {
                  wrapper: "border-yellow-400 bg-yellow-50",
                  trigger:
                      "border-yellow-400 bg-yellow-50 text-yellow-900 focus:ring-yellow-500",
                  text: "text-yellow-700",
                  placeholder: "text-yellow-700/80",
                  clear: "text-yellow-600 hover:text-yellow-800",
              }
            : {
                  wrapper: "border-orange-400 bg-orange-50",
                  trigger:
                      "border-orange-400 bg-orange-50 text-orange-900 focus:ring-orange-500",
                  text: "text-orange-700",
                  placeholder: "text-orange-700/80",
                  clear: "text-orange-600 hover:text-orange-800",
              }

    const selectedColorClass = {
        wrapper: "border-green-500 bg-green-50",
        trigger:
            "border-green-500 bg-green-50 text-green-900 focus:ring-green-500",
        text: "text-green-700",
        placeholder: "text-green-700/80",
        clear: "text-green-600 hover:text-green-800",
    }

    const colors = hasValue ? selectedColorClass : emptyColorClass

    return (
        <div className={cn("relative w-full", className)}>
            <div
                className={cn(
                    "rounded-md border transition-all duration-200",
                    colors.wrapper,
                    disabled && "opacity-60 cursor-not-allowed"
                )}
            >
                <Select
                    value={hasValue ? String(value) : ""}
                    onValueChange={(v) => {
                        if (!disabled) {
                            onChange(v)
                            setSearch("")
                        }
                    }}
                    onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            setSearch("")
                        }
                    }}
                    disabled={disabled}
                >
                    <SelectTrigger
                        className={cn(
                            "pr-10 relative border-0 shadow-none bg-transparent focus:ring-1",
                            colors.trigger,
                            disabled && "opacity-60 cursor-not-allowed"
                        )}
                    >
                        {disabled ? (
                            <span className={cn("text-sm truncate", colors.text)}>
                                {selectedLabel || placeholder}
                            </span>
                        ) : (
                            <span className="text-sm truncate">
                                {selectedLabel ? (
                                    <span className={colors.text}>{selectedLabel}</span>
                                ) : (
                                    <span className={colors.placeholder}>
                                        {placeholder}
                                    </span>
                                )}
                            </span>
                        )}
                    </SelectTrigger>

                    {hasValue && !disabled && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                onChange(undefined)
                                setSearch("")
                            }}
                            className={cn(
                                "absolute right-8 top-1/2 -translate-y-1/2 z-20 rounded-full p-1 bg-transparent",
                                colors.clear
                            )}
                            aria-label="Clear selected value"
                        >
                            <X size={14} />
                        </button>
                    )}

                    {!disabled && (
                        <SelectContent
                            position="popper"
                            className="z-[9999]"
                        >
                            <div
                                className="sticky top-0 z-10 bg-popover px-2 py-2 border-b"
                                onKeyDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <Input
                                    placeholder={
                                        allowCustomValue
                                            ? "Search or type..."
                                            : "Search..."
                                    }
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="h-8"
                                    autoFocus
                                />
                            </div>

                            <div className="max-h-[250px] overflow-y-auto mt-1">
                                {filteredOptions.length > 0 ? (
                                    filteredOptions.map((item) => (
                                        <SelectItem
                                            key={item.value}
                                            value={String(item.value)}
                                        >
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

            <p
                className={cn(
                    "mt-1 text-sm font-medium",
                    hasValue ? "text-green-600" : "text-orange-600"
                )}
            >
                {hasValue ? "Selected successfully." : "No option selected."}
            </p>
        </div>
    )
}