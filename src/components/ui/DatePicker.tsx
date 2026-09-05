import * as React from "react";
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DateInputProps {
    value?: string | null;
    onValueChange: (value: string | null) => void;
    placeholder?: string;
    className?: string;
    min?: string;
    max?: string;
    disabled?: boolean;
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function formatDisplay(value: string | null | undefined) {
    if (!value) return "";
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}

export const DateInput = React.forwardRef<
    HTMLInputElement,
    DateInputProps
>(
    (
        {
            value,
            onValueChange,
            placeholder = "Pick a date",
            className,
            min,
            max,
            disabled,
        },
        ref
    ) => {
        const [open, setOpen] = React.useState(false);
        const [mode, setMode] = React.useState<"day" | "year">("day");

        // initial calendar state
        const initialDate = React.useMemo(() => {
            if (value) {
                const [y, m] = value.split("-").map(Number);
                return new Date(y, m - 1, 1);
            }
            return new Date();
        }, [value]);

        const [viewYear, setViewYear] = React.useState(
            initialDate.getFullYear()
        );
        const [viewMonth, setViewMonth] = React.useState(
            initialDate.getMonth()
        );

        React.useEffect(() => {
            if (value) {
                const [y, m] = value.split("-").map(Number);
                setViewYear(y);
                setViewMonth(m - 1);
            }
        }, [value]);

        const inputRef = React.useRef<HTMLInputElement | null>(null);
        React.useImperativeHandle(
            ref,
            () => inputRef.current as HTMLInputElement
        );

        const containerRef = React.useRef<HTMLDivElement | null>(null);

        React.useEffect(() => {
            const handler = (e: MouseEvent) => {
                if (
                    containerRef.current &&
                    !containerRef.current.contains(e.target as Node)
                ) {
                    setOpen(false);
                    setMode("day");
                }
            };
            if (open) {
                document.addEventListener("mousedown", handler);
            }
            return () =>
                document.removeEventListener("mousedown", handler);
        }, [open]);

        const selectDate = (
            year: number,
            month: number,
            day: number
        ) => {
            const iso = `${year
                .toString()
                .padStart(4, "0")}-${(month + 1)
                    .toString()
                    .padStart(2, "0")}-${day
                        .toString()
                        .padStart(2, "0")}`;
            onValueChange(iso);
            setOpen(false);
            setMode("day");
        };

        const goPrevMonth = () => {
            setViewMonth((prev) => {
                if (prev === 0) {
                    setViewYear((y) => y - 1);
                    return 11;
                }
                return prev - 1;
            });
        };

        const goNextMonth = () => {
            setViewMonth((prev) => {
                if (prev === 11) {
                    setViewYear((y) => y + 1);
                    return 0;
                }
                return prev + 1;
            });
        };

        const daysInMonth = getDaysInMonth(viewYear, viewMonth);
        const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

        const today = new Date();
        const todayY = today.getFullYear();
        const todayM = today.getMonth();
        const todayD = today.getDate();

        const [valY, valM, valD] = value
            ? value.split("-").map(Number)
            : [undefined, undefined, undefined];

        const weeks: Array<Array<number | null>> = [];
        let currentDay = 1 - firstDay;
        while (currentDay <= daysInMonth) {
            const week: Array<number | null> = [];
            for (let i = 0; i < 7; i++) {
                if (currentDay < 1 || currentDay > daysInMonth) {
                    week.push(null);
                } else {
                    week.push(currentDay);
                }
                currentDay++;
            }
            weeks.push(week);
        }

        const isSelected = (d: number) =>
            valY === viewYear &&
            (valM ?? 0) - 1 === viewMonth &&
            valD === d;

        const isToday = (d: number) =>
            todayY === viewYear &&
            todayM === viewMonth &&
            todayD === d;

        function isDisabled(day: number) {
            const dateIso = `${viewYear
                .toString()
                .padStart(4, "0")}-${(viewMonth + 1)
                    .toString()
                    .padStart(2, "0")}-${day
                        .toString()
                        .padStart(2, "0")}`;

            if (min && new Date(dateIso) < new Date(min)) return true;
            if (max && new Date(dateIso) > new Date(max)) return true;

            return false;
        }

        // ---- Year picker range
        const currentYear = new Date().getFullYear();
        const startYear = min
            ? new Date(min).getFullYear()
            : 1900;
        const endYear = max
            ? new Date(max).getFullYear()
            : currentYear;

        const years = Array.from(
            { length: endYear - startYear + 1 },
            (_, i) => startYear + i
        ).reverse();

        return (
            <div
                className="relative inline-block w-full"
                ref={containerRef}
            >
                <div className="relative">
                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <input
                        ref={inputRef}
                        type="text"
                        readOnly
                        onClick={() => setOpen((o) => !o)}
                        value={formatDisplay(value)}
                        disabled={disabled}
                        placeholder={placeholder}
                        className={cn(
                            "flex h-9 w-full cursor-pointer rounded-md border border-input bg-background pl-10 pr-9 py-1 text-sm shadow-sm",
                            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                            className
                        )}
                    />

                    {value && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onValueChange(null);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 hover:bg-muted"
                        >
                            <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                    )}
                </div>

                {open && (
                    <div className="absolute z-50 mt-1 w-[260px] rounded-md border bg-popover p-3 shadow-md">
                        {/* Header */}
                        <div className="mb-2 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={goPrevMonth}
                                className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-muted"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>

                            <div className="flex gap-1 text-sm font-medium">
                                <button
                                    type="button"
                                    onClick={() => setMode("day")}
                                    className="hover:underline"
                                >
                                    {new Date(
                                        viewYear,
                                        viewMonth,
                                        1
                                    ).toLocaleDateString(undefined, {
                                        month: "long",
                                    })}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setMode("year")}
                                    className="hover:underline"
                                >
                                    {viewYear}
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={goNextMonth}
                                className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-muted"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Body */}
                        {mode === "year" ? (
                            <div className="grid max-h-[200px] grid-cols-4 gap-2 overflow-y-auto p-1">
                                {years.map((year) => (
                                    <button
                                        key={year}
                                        type="button"
                                        onClick={() => {
                                            setViewYear(year);
                                            setMode("day");
                                        }}
                                        className={cn(
                                            "rounded-md px-2 py-1 text-sm hover:bg-accent",
                                            year === viewYear &&
                                            "bg-primary text-primary-foreground"
                                        )}
                                    >
                                        {year}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <>
                                <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground">
                                    {DAYS.map((d) => (
                                        <div key={d}>{d}</div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                                    {weeks.map((week, wi) =>
                                        week.map((day, di) =>
                                            day === null ? (
                                                <div
                                                    key={`${wi}-${di}`}
                                                    className="h-7"
                                                />
                                            ) : (
                                                <button
                                                    key={`${wi}-${di}`}
                                                    type="button"
                                                    onClick={() =>
                                                        selectDate(
                                                            viewYear,
                                                            viewMonth,
                                                            day
                                                        )
                                                    }
                                                    disabled={isDisabled(
                                                        day
                                                    )}
                                                    className={cn(
                                                        "flex h-7 w-7 items-center justify-center rounded-full",
                                                        "hover:bg-accent hover:text-accent-foreground",
                                                        isSelected(day) &&
                                                        "bg-primary text-primary-foreground",
                                                        !isSelected(day) &&
                                                        isToday(day) &&
                                                        "border border-primary text-primary"
                                                    )}
                                                >
                                                    {day}
                                                </button>
                                            )
                                        )
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    }
);

DateInput.displayName = "DateInput";
