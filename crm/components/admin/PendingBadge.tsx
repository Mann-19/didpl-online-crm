'use client'

import { useEffect, useState } from 'react'

interface PendingBadgeProps {
    initialCount: number
}

export function PendingBadge({ initialCount }: PendingBadgeProps) {
    const [count, setCount] = useState(initialCount)

    useEffect(() => {
        // Poll every 30 seconds for new pending changes
        const interval = setInterval(async () => {
            try {
                const res = await fetch('/api/approvals/pending-count')
                if (res.ok) {
                    const { count: newCount } = await res.json()
                    setCount(newCount)
                }
            } catch {
                // Ignore network errors silently
            }
        }, 30_000)

        return () => clearInterval(interval)
    }, [])

    if (count === 0) return null

    return (
        <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-xs font-bold">
            {count > 99 ? '99+' : count}
        </span>
    )
}