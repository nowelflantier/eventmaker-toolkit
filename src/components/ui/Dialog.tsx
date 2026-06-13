import { ReactNode, useEffect, useRef } from 'react'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

interface DialogContentProps {
  children: ReactNode
  className?: string
  onInteractOutside?: () => void
}

export function Dialog({ open, children }: DialogProps) {
  if (!open) return null
  return <>{children}</>
}

export function DialogContent({ children, className = '', onInteractOutside }: DialogContentProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      'input, button, [href], [tabindex]:not([tabindex="-1"])',
    )
    focusable?.focus()

    return () => {
      previous?.focus()
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[#F8F7F4]/75 px-4 pt-[14vh] backdrop-blur-md"
      onMouseDown={onInteractOutside}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={`w-full max-w-xl rounded-[10px] border border-[#E0DDD8] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.10)] ${className}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
