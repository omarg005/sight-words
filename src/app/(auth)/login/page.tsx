'use client'

import { useActionState } from 'react'
import { signIn } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [state, action, pending] = useActionState(
    async (_prev: { error: string } | null, formData: FormData) => {
      const result = await signIn(formData)
      return result ?? null
    },
    null
  )

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-violet-400 via-purple-500 to-fuchsia-400 p-4">
      {/* Decorative bubbles */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-yellow-300/20 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-pink-300/20 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo area */}
        <div className="mb-6 text-center">
          <div className="mb-2 text-7xl drop-shadow-lg">🌟</div>
          <h1 className="text-4xl font-black text-white drop-shadow-md tracking-tight">
            Sight Words!
          </h1>
          <p className="mt-1 text-white/80 font-semibold">Let&apos;s practice reading together</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-white p-8 shadow-2xl shadow-purple-900/30">
          <form action={action} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="font-bold text-slate-700">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                className="h-12 rounded-xl border-violet-200 bg-violet-50/50 text-base focus-visible:ring-violet-400"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="font-bold text-slate-700">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="h-12 rounded-xl border-violet-200 bg-violet-50/50 text-base focus-visible:ring-violet-400"
              />
            </div>

            {state?.error && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
                {state.error}
              </p>
            )}

            <Button
              type="submit"
              disabled={pending}
              className="mt-1 h-12 w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-base font-extrabold shadow-md shadow-violet-300 hover:from-violet-600 hover:to-purple-700 active:scale-95 transition-transform"
            >
              {pending ? 'Signing in…' : 'Sign in ✨'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
