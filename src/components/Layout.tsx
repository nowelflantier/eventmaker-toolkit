import { ReactNode, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CommandPalette from './CommandPalette'
import { SessionUser } from '../lib/storage'

interface LayoutProps {
  children: ReactNode
  user: SessionUser
}

export default function Layout({ children, user }: LayoutProps) {
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'j') {
        event.preventDefault()
        setPaletteOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      <header className="border-b border-[#E8E4DE]">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
          <Link to="/" className="text-base tracking-normal text-[#1A1A1A]">
            <span className="font-medium">Eventmaker</span>{' '}
            <span className="font-normal text-[#6B6B6B]">Toolkit</span>
          </Link>
          <div className="flex items-center gap-3 text-sm text-[#6B6B6B]">
            <span className="hidden sm:inline">
              {user.first_name} {user.last_name}
            </span>
            <button
              className="rounded-md border border-[#E0DDD8] bg-white px-2 py-1 font-mono text-[11px] text-[#1A1A1A] transition hover:border-[#0066FF] hover:text-[#0066FF]"
              onClick={() => setPaletteOpen(true)}
              type="button"
            >
              ⌘J
            </button>
          </div>
        </div>
      </header>
      {children}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}
