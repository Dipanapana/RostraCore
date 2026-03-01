'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RosterGeneratePage() {
  const router = useRouter()
  useEffect(() => { router.replace('/roster') }, [router])
  return null
}
