import { KeyboardEvent, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, LucideIcon, Search } from 'lucide-react'
import { modules } from '../modules/modules.config'
import { Dialog, DialogContent } from './ui/Dialog'
import Input from './ui/Input'

const icons: Record<string, LucideIcon> = {
  CalendarDays,
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const navigate = useNavigate()

  const filteredModules = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const matches = normalized
      ? modules.filter((module) => module.title.toLowerCase().includes(normalized))
      : modules

    return [...matches].sort((a, b) => {
      if (a.status === b.status) return 0
      return a.status === 'active' ? -1 : 1
    })
  }, [query])

  function close() {
    setQuery('')
    setActiveIndex(0)
    onOpenChange(false)
  }

  function openModule(index: number) {
    const module = filteredModules[index]
    if (!module || module.status === 'legacy') return
    navigate(module.route)
    close()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => Math.min(current + 1, Math.max(filteredModules.length - 1, 0)))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => Math.max(current - 1, 0))
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      openModule(activeIndex)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onInteractOutside={close}>
        <div onKeyDown={handleKeyDown}>
          <div className="flex items-center gap-2 border-b border-[#E8E4DE] px-4 py-3">
            <Search className="shrink-0 text-[#B0ADA8]" size={17} />
            <Input
              className="h-9 border-0 px-0 shadow-none focus:border-0 focus:ring-0"
              placeholder="Rechercher un module"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActiveIndex(0)
              }}
            />
          </div>
          <div className="max-h-[360px] overflow-y-auto p-2">
            {filteredModules.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-[#6B6B6B]">Aucun module</p>
            )}
            {filteredModules.map((module, index) => {
              const Icon = icons[module.icon] ?? CalendarDays
              const isActive = index === activeIndex
              const isLegacy = module.status === 'legacy'

              return (
                <button
                  key={module.id}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${
                    isActive ? 'bg-[#F8F7F4]' : ''
                  } ${isLegacy ? 'cursor-default opacity-55' : 'hover:bg-[#F8F7F4]'}`}
                  disabled={isLegacy}
                  onClick={() => openModule(index)}
                  type="button"
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: module.accentBg, color: module.accentIcon }}
                  >
                    <Icon size={17} strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[#1A1A1A]">
                      {module.title}
                    </span>
                    <span className="block truncate text-xs text-[#6B6B6B]">
                      {module.description}
                    </span>
                  </span>
                  {isLegacy && (
                    <span className="rounded-full bg-[#F0EEE9] px-2 py-1 font-mono text-[10px] text-[#6B6B6B]">
                      legacy
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
