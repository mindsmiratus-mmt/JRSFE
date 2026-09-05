import * as React from "react"
import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative overflow-auto",
      // Custom scrollbar styling to match the clean look
      "[&::-webkit-scrollbar]:w-2",
      "[&::-webkit-scrollbar-track]:bg-transparent",
      "[&::-webkit-scrollbar-thumb]:bg-gray-200", 
      "[&::-webkit-scrollbar-thumb]:rounded-full",
      "[&::-webkit-scrollbar-thumb]:hover:bg-gray-300",
      // Dark mode support
      "dark:[&::-webkit-scrollbar-thumb]:bg-gray-800",
      "dark:[&::-webkit-scrollbar-thumb]:hover:bg-gray-700",
      className
    )}
    {...props}
  >
    {children}
  </div>
))
ScrollArea.displayName = "ScrollArea"

export { ScrollArea }
