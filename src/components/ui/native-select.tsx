import { cn } from '@/lib/utils'

type Props = React.SelectHTMLAttributes<HTMLSelectElement>

export function NativeSelect({ className, children, ...props }: Props) {
  return (
    <select
      className={cn(
        'flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors',
        'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}
