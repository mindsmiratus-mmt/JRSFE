import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ReactNode } from "react"

interface PageHeaderProps {
    title: string
    subtitle?: ReactNode
    icon?: ReactNode
    backUrl?: string
    onBack?: () => void
    rightActions?: ReactNode
}

export const PageHeader = ({
    title,
    subtitle,
    icon,
    backUrl,
    onBack,
    rightActions,
}: PageHeaderProps) => {
    return (
        <div className="bg-white shadow-sm border-b sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 space-y-3">

                {/* Back button */}
                {(backUrl || onBack) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onBack}
                        className="px-0"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back
                    </Button>
                )}

                {/* Title + Cancel row */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        {icon}
                        <h1 className="text-lg md:text-2xl font-bold break-words">
                            {title}
                        </h1>
                    </div>

                    {/* Cancel (right side on mobile + desktop) */}
                    {rightActions && (
                        <div className="shrink-0">
                            {rightActions}
                        </div>
                    )}
                </div>

                {/* Subtitle */}
                {subtitle && (
                    <div className="text-sm text-gray-500">
                        {subtitle}
                    </div>
                )}
            </div>
        </div>
    )
}
