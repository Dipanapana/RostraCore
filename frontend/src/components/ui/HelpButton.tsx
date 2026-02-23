'use client'

import Link from 'next/link'
import { HelpCircle } from 'lucide-react'

export default function HelpButton({ article }: { article: string }) {
  return (
    <Link
      href={`/help/${article}`}
      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
      title="Help"
    >
      <HelpCircle size={14} />
      Help
    </Link>
  )
}
