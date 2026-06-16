import { Link } from 'react-router-dom'
import { CalendarDays, LucideIcon, Megaphone } from 'lucide-react'
import { ModuleConfig } from '../modules/modules.config'

const icons: Record<string, LucideIcon> = {
  CalendarDays,
  Megaphone,
}

interface ModuleCardProps {
  module: ModuleConfig
  isLast: boolean
  variant: 'active' | 'legacy'
}

export default function ModuleCard({ module, isLast, variant }: ModuleCardProps) {
  const Icon = icons[module.icon] ?? CalendarDays

  if (variant === 'legacy') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-[#E8E4DE] bg-white px-4 py-3">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: module.accentBg, color: module.accentIcon }}
        >
          <Icon size={17} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#1A1A1A]">
          {module.title}
        </span>
        <span className="rounded-full bg-[#F0EEE9] px-2 py-1 font-mono text-[10px] text-[#6B6B6B]">
          legacy
        </span>
      </div>
    )
  }

  return (
    <Link
      className="relative min-h-[172px] rounded-xl border border-[#E8E4DE] bg-white p-5 text-left transition duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)]"
      to={module.route}
    >
      {isLast && (
        <span className="absolute right-4 top-4 rounded-full bg-[#20A599] px-2 py-1 text-[10px] font-medium leading-none text-white">
          Last
        </span>
      )}
      <span
        className="flex size-9 items-center justify-center rounded-lg"
        style={{ backgroundColor: module.accentBg, color: module.accentIcon }}
      >
        <Icon size={19} strokeWidth={2} />
      </span>
      <h2 className="mt-5 text-[14px] font-medium tracking-normal text-[#1A1A1A]">{module.title}</h2>
      <p className="mt-2 min-h-9 text-[12px] leading-[1.5] text-[#6B6B6B]">{module.description}</p>
      <footer className="mt-6 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[12px] text-[#6B6B6B]">
          <span className="size-[7px] rounded-full bg-[#22C55E]" />
          Actif
        </span>
        <span className="font-mono text-[11px] text-[#B0ADA8]">il y a 0h</span>
      </footer>
    </Link>
  )
}
