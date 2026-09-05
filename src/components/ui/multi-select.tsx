"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/*                                   Context                                  */
/* -------------------------------------------------------------------------- */

interface MultiSelectContextValue {
    value: string[]
    onValueChange: (value: string[]) => void
}

const MultiSelectContext =
    React.createContext<MultiSelectContextValue | null>(null)

const useMultiSelect = () => {
    const context = React.useContext(MultiSelectContext)
    if (!context) {
        throw new Error("MultiSelect components must be used within <MultiSelect>")
    }
    return context
}

/* -------------------------------------------------------------------------- */
/*                                 Root                                       */
/* -------------------------------------------------------------------------- */

interface MultiSelectProps {
    value?: string[]
    onValueChange?: (value: string[]) => void
    children: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

const MultiSelect = ({
    value = [],
    onValueChange = () => { },
    children,
    open,
    onOpenChange,
}: MultiSelectProps) => {
    return (
        <MultiSelectContext.Provider value={{ value, onValueChange }}>
            <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
                {children}
            </PopoverPrimitive.Root>
        </MultiSelectContext.Provider>
    )
}

MultiSelect.displayName = "MultiSelect"

/* -------------------------------------------------------------------------- */
/* Trigger */
/* -------------------------------------------------------------------------- */
interface MultiSelectTriggerProps
    extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger> {
    placeholder?: string
    children?: React.ReactNode  // Add this to support custom display content
}

/* -------------------------------------------------------------------------- */
/* Trigger */
/* -------------------------------------------------------------------------- */
interface MultiSelectTriggerProps
    extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger> {
    placeholder?: string
    children?: React.ReactNode  // Add this to support custom display content
}

const MultiSelectTrigger = React.forwardRef<
    React.ElementRef<typeof PopoverPrimitive.Trigger>,
    MultiSelectTriggerProps
>(({ className, children, placeholder = "Select options...", ...props }, ref) => {
    const { value } = useMultiSelect()
    return (
        <PopoverPrimitive.Trigger
            ref={ref}
            className={cn(
                "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring",
                className,
            )}
            {...props}
        >
            {children || (
                <span className="line-clamp-1">
                    {value.length > 0 ? value.join(", ") : placeholder}
                </span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </PopoverPrimitive.Trigger>
    )
})
MultiSelectTrigger.displayName = "MultiSelectTrigger"

/* -------------------------------------------------------------------------- */
/*                                Content                                     */
/* -------------------------------------------------------------------------- */

const MultiSelectContent = React.forwardRef<
    React.ElementRef<typeof PopoverPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "start", sideOffset = 4, children, ...props }, ref) => (
    <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
            ref={ref}
            align={align}
            sideOffset={sideOffset}
            className={cn(
                "z-50 max-h-72 min-w-[12rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
                className,
            )}
            {...props}
        >
            <div className="p-1 max-h-[--radix-popover-content-available-height] overflow-auto">
                {children}
            </div>
        </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
))

MultiSelectContent.displayName = "MultiSelectContent"

/* -------------------------------------------------------------------------- */
/*                                  Item                                      */
/* -------------------------------------------------------------------------- */

interface MultiSelectItemProps
    extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
    value: string
    children: React.ReactNode
}

const MultiSelectItem = React.forwardRef<
    React.ElementRef<typeof CheckboxPrimitive.Root>,
    MultiSelectItemProps
>(({ value, children, className, ...props }, ref) => {
    const { value: selectedValues, onValueChange } = useMultiSelect()
    const checked = selectedValues.includes(value)

    const toggle = () => {
        if (checked) {
            onValueChange(selectedValues.filter((v) => v !== value))
        } else {
            onValueChange([...selectedValues, value])
        }
    }

    return (
        <div
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                toggle()
            }}
            className={cn(
                "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                className,
            )}
        >
            <CheckboxPrimitive.Root
                ref={ref}
                checked={checked}
                onCheckedChange={toggle}
                className="flex h-4 w-4 items-center justify-center rounded border"
                {...props}
            >
                <CheckboxPrimitive.Indicator>
                    <Check className="h-4 w-4" />
                </CheckboxPrimitive.Indicator>
            </CheckboxPrimitive.Root>

            <span>{children}</span>
        </div>
    )
})

MultiSelectItem.displayName = "MultiSelectItem"

/* -------------------------------------------------------------------------- */
/*                                Group / Label / Separator                   */
/* -------------------------------------------------------------------------- */

const MultiSelectGroup = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-1 p-1", className)} {...props} />
))

MultiSelectGroup.displayName = "MultiSelectGroup"

const MultiSelectLabel = React.forwardRef<
    HTMLLabelElement,
    React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
    <label
        ref={ref}
        className={cn("px-2 py-1.5 text-sm font-semibold", className)}
        {...props}
    />
))

MultiSelectLabel.displayName = "MultiSelectLabel"

const MultiSelectSeparator = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
))

MultiSelectSeparator.displayName = "MultiSelectSeparator"

/* -------------------------------------------------------------------------- */
/*                                   Exports                                  */
/* -------------------------------------------------------------------------- */

export {
    MultiSelect,
    MultiSelectTrigger,
    MultiSelectContent,
    MultiSelectItem,
    MultiSelectGroup,
    MultiSelectLabel,
    MultiSelectSeparator,
}
