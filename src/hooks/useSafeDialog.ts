import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"

export const useSafeDialog = (initial = false) => {
    const [open, setOpen] = useState(initial)
    const location = useLocation()

    useEffect(() => {
        setOpen(false)
    }, [location.pathname])

    return {
        open,
        setOpen,
        close: () => setOpen(false),
        openDialog: () => setOpen(true),
    }
}
