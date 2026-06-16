import { useRef } from 'react'
import { templateTags, resolveTemplate } from '../lib/resolveTemplate'
import { EventmakerSession } from '../types'

interface TemplateEditorProps {
  label: string
  value: string
  onChange: (value: string) => void
  previewSession: EventmakerSession | null
  placeholder?: string
  rows?: number
}

export default function TemplateEditor({
  label,
  value,
  onChange,
  previewSession,
  placeholder,
  rows = 4,
}: TemplateEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const preview = previewSession ? resolveTemplate(value, previewSession) : ''

  function insertTag(token: string) {
    const textarea = textareaRef.current
    if (!textarea) {
      onChange(`${value}${token}`)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const nextValue = `${value.slice(0, start)}${token}${value.slice(end)}`
    onChange(nextValue)

    window.requestAnimationFrame(() => {
      textarea.focus()
      const nextCursor = start + token.length
      textarea.setSelectionRange(nextCursor, nextCursor)
    })
  }

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#1A1A1A]">{label}</span>
      <div className="mb-2 flex flex-wrap gap-2">
        {templateTags.map((tag) => (
          <button
            key={tag.token}
            className="rounded-full border border-[#E0DDD8] bg-white px-3 py-1 text-xs text-[#6B6B6B] transition hover:border-[#B74A20] hover:text-[#B74A20]"
            onClick={() => insertTag(tag.token)}
            type="button"
          >
            + {tag.label}
          </button>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        className="w-full rounded-lg border border-[#E0DDD8] bg-white px-3 py-2 text-sm text-[#1A1A1A] outline-none transition placeholder:text-[#B0ADA8] focus:border-[#B74A20] focus:ring-4 focus:ring-[#B74A20]/10"
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      <p className="mt-2 min-h-5 text-xs italic leading-5 text-[#6B6B6B]">
        {previewSession ? preview || 'Aperçu vide' : 'Aucune session à prévisualiser'}
      </p>
    </label>
  )
}
