'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { cn, glassClasses } from '@/lib/utils'
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
    <nav
      className={cn(
        glassClasses,
        'fixed top-4 inset-x-4 z-50 flex flex-wrap items-center gap-4 p-4 md:p-6'
      )}
    >
      <Link href="/" aria-label="Home">
        <AiFillHome className="w-6 h-6" />
      </Link>
      <Link href="/spravy" aria-label="Správy">
        <AiOutlineMessage className="w-6 h-6" />
      </Link>

      <Link href="/shop" aria-label="Shop">
        <AiOutlineShop className="w-6 h-6" />
      </Link>

      <Link href="/profile" aria-label="Profile">
        <AiOutlineUser className="w-6 h-6" />
      </Link>

      {/* lokálne prepíš farbu, ak nechceš bielu */}
      <button
        onClick={handleLogout}
        className="ml-auto text-red-600 hover:underline"
      >
        Log out
      </button>
    </nav>
  )
}
