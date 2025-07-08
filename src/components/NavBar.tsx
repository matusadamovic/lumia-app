'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function NavBar() {
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <nav className="flex gap-4 p-4 border-b">
      <Link href="/">Home</Link>
      <Link href="/chat">Chat</Link>
      <Link href="/profile">Profile</Link>
      <button onClick={handleLogout} className="text-red-600">Log out</button>
    </nav>
  )
}
