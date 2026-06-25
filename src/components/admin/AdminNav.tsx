'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const links = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/parents', label: 'Parents' },
  { href: '/admin/students', label: 'Students' },
  { href: '/admin/lists', label: 'Word Lists' },
]

export default function AdminNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  function isActive(href: string) {
    return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
  }

  return (
    <header className="border-b-2 border-violet-100 bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/admin" className="flex items-center gap-1.5 shrink-0 group">
          <span className="text-xl">⭐</span>
          <span className="text-lg font-extrabold text-violet-600 group-hover:text-violet-700 transition-colors">
            Sight Words
          </span>
          <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-xs font-bold text-violet-600">
            Admin
          </span>
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
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-200'
                  : 'text-slate-500 hover:bg-violet-50 hover:text-violet-700'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2 md:flex-none">
          <Link
            href="/admin/settings"
            className="hidden md:inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-violet-50 hover:text-violet-700 transition-all"
            title="Change password"
          >
            ⚙️
          </Link>
          <form action={signOut} className="hidden md:block">
            <Button variant="ghost" size="sm" type="submit" className="font-semibold text-slate-500 hover:text-violet-700 hover:bg-violet-50">
              Sign out
            </Button>
          </form>

          {/* Hamburger */}
          <button
            className="md:hidden rounded-xl p-2 text-slate-500 hover:bg-violet-50 hover:text-violet-700"
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
        <div className="md:hidden border-t border-violet-100 bg-white px-4 py-2 space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                'block rounded-xl px-4 py-2.5 text-sm font-bold transition-all',
                isActive(link.href)
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-500 hover:bg-violet-50 hover:text-violet-700'
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/admin/settings"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-violet-50 hover:text-violet-700"
          >
            ⚙️ Change Password
          </Link>
          <form action={signOut} className="pt-1">
            <button type="submit" className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-bold text-slate-500 hover:bg-violet-50 hover:text-violet-700">
              Sign out
            </button>
          </form>
        </div>
      )}
    </header>
  )
}
