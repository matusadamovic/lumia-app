'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
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
  const pathname = usePathname()

  if (pathname.startsWith('/chat')) {
    return null
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const links = [
    { href: '/', label: 'Home', icon: <AiFillHome className="w-6 h-6" /> },
    {
      href: '/spravy',
      label: 'Správy',
      icon: <AiOutlineMessage className="w-6 h-6" />,
    },
    { href: '/shop', label: 'Shop', icon: <AiOutlineShop className="w-6 h-6" /> },
    {
      href: '/profile',
      label: 'Profile',
      icon: <AiOutlineUser className="w-6 h-6" />,
    },
  ] as const

  return (
    <nav
      className={cn(
        glassClasses,
        'fixed top-4 inset-x-4 z-50 flex flex-wrap items-center gap-4 p-4 md:p-6'
      )}
    >
      {links.map(({ href, label, icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className="relative p-2"
          >
            {active && (
              <motion.div
                layoutId="nav-indicator"
                className={cn(glassClasses, 'absolute inset-0 -z-10 rounded-full')}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
            {icon}
          </Link>
        )
      })}

      {/* lokálne prepíš farbu, ak nechceš bielu */}
      <button onClick={handleLogout} className="ml-auto text-red-600 hover:underline">
        Log out
      </button>
    </nav>
  )
}
