'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import {
  AiFillHome,
  AiOutlineUser,
  AiOutlineMessage,
  AiOutlineShop,
} from 'react-icons/ai'

export default function NavBar() {
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <nav className="flex gap-4 p-4 border-b items-center">
      <Link href="/" aria-label="Home">
        <AiFillHome className="w-6 h-6" />
      </Link>
      <Link href="/chat" aria-label="Chat">
        <AiOutlineMessage className="w-6 h-6" />
      </Link>
      <Link href="/spravy" aria-label="Spravy">
        <AiOutlineMessage className="w-6 h-6" />
      </Link>
      <Link href="/shop" aria-label="Shop">
        <AiOutlineShop className="w-6 h-6" />
      </Link>
      <Link href="/profile" aria-label="Profile">
        <AiOutlineUser className="w-6 h-6" />
      </Link>
      <button onClick={handleLogout} className="text-red-600 ml-auto">
        Log out
      </button>
    </nav>
  )
}
