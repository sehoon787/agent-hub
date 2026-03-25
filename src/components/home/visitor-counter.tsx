"use client"

import { useEffect, useState } from 'react'
import { Eye, TrendingUp } from 'lucide-react'

export function VisitorCounter() {
  const [views, setViews] = useState({ total: 0, today: 0 })

  useEffect(() => {
    fetch('/api/views', { method: 'POST' }).catch(() => {})
    fetch('/api/views').then(r => r.json()).then(setViews).catch(() => {})
  }, [])

  return (
    <div className="flex items-center justify-center gap-6 text-sm text-zinc-500">
      <div className="flex items-center gap-1.5">
        <Eye className="h-4 w-4" />
        <span>{views.total.toLocaleString()} total views</span>
      </div>
      <div className="flex items-center gap-1.5">
        <TrendingUp className="h-4 w-4" />
        <span>{views.today.toLocaleString()} today</span>
      </div>
    </div>
  )
}
