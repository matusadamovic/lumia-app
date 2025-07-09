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
    <nav
      className="
        fixed top-4 inset-x-4 z-50
        flex flex-wrap items-center gap-4
        p-4 md:p-6 overflow-hidden
        rounded-[28px]
        drop-shadow-[-8px_-12px_46px_rgba(0,0,0,0.37)]
        bg-white/30 dark:bg-zinc-900/30
        backdrop-brightness-110 backdrop-blur-[2px]
        backdrop-[url('#displacementFilter')]

          drop-shadow-[0_4px_16px_rgba(0,0,0,0.25)]

/* ========== pseudo-element :before ========== */
  before:absolute before:inset-0
  before:rounded-[inherit] before:pointer-events-none
  before:content-['']
  before:ring-1 before:ring-white/60
  before:shadow-[inset_0_0_4px_rgba(255,255,255,0.28)]

  /* ========== pseudo-element :after =========== */
  after:absolute after:inset-0
  after:rounded-[inherit] after:pointer-events-none
  after:content-['']
  after:bg-[radial-gradient(60%_60%_at_0%_0%,rgba(255,255,255,0.75)_0%,rgba(255,255,255,0.15)_18%,transparent_35%),radial-gradient(60%_60%_at_100%_100%,rgba(255,255,255,0.35)_0%,rgba(255,255,255,0.1)_18%,transparent_35%)]
  after:bg-no-repeat

        text-white                 /* ▲ všetky ikony budú biele */
      "
    >
      <Link href="/" aria-label="Home">
        <AiFillHome className="w-6 h-6" />
      </Link>

      <Link href="/chat" aria-label="Chat">
        <AiOutlineMessage className="w-6 h-6" />
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
