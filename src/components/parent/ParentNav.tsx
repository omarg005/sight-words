'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const links = [
  { href: '/parent',          label: '🏠 Dashboard'      },
  { href: '/parent/start',    label: '🚀 Start Activity' },
  { href: '/parent/progress', label: '📊 Progress'       },
]

export default function ParentNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  function isActive(href: string) {
    if (href === '/parent') return pathname === '/parent'
    if (href === '/parent/progress') {
      return pathname.startsWith('/parent/progress') ||
        (pathname.startsWith('/parent/students/') && pathname.includes('/progress'))
    }
    if (href === '/parent/start') {
      return pathname.startsWith('/parent/start') ||
        (pathname.startsWith('/parent/students/') && !pathname.includes('/progress'))
    }
    return false
  }

  return (
    <header className="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 shadow-lg">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        {/* Logo */}
        <Link
          href="/parent"
          className="flex items-center gap-2 shrink-0 text-white hover:opacity-90 transition-opacity"
        >
          <span className="text-xl">⭐</span>
          <span className="text-lg font-extrabold tracking-wide drop-shadow-sm">Sight Words!</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex flex-1 gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-xl px-4 py-1.5 text-sm font-bold transition-all',
                isActive(link.href)
                  ? 'bg-white/25 text-white shadow-sm'
                  : 'text-white/75 hover:bg-white/15 hover:text-white'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2 md:flex-none">
          <form action={signOut} className="hidden md:block">
            <Button
              variant="ghost"
              size="sm"
              type="submit"
              className="font-semibold text-white/80 hover:text-white hover:bg-white/20"
            >
              Sign out
            </Button>
          </form>

          {/* Hamburger */}
          <button
            className="md:hidden rounded-xl p-2 text-white/80 hover:bg-white/20 hover:text-white"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {open ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-white/20 bg-purple-600/95 px-4 py-2 space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                'block rounded-xl px-4 py-2.5 text-sm font-bold transition-all',
                isActive(link.href)
                  ? 'bg-white/25 text-white'
                  : 'text-white/75 hover:bg-white/15 hover:text-white'
              )}
            >
              {link.label}
            </Link>
          ))}
          <form action={signOut} className="pt-1">
            <button
              type="submit"
              className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-bold text-white/75 hover:bg-white/15 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </header>
  )
}
