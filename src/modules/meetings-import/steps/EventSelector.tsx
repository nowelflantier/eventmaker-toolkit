import { FormEvent, useState } from 'react'
import Alert from '../../../components/ui/Alert'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
interface EventSelectorProps {
  loading: boolean
  error: string | null
  onSubmit: (eventId: string) => Promise<void>
  title?: string
  description?: string
}

export default function EventSelector({
  loading,
  error,
  onSubmit,
  title = 'Import meetings',
  description = 'Saisissez l’identifiant Eventmaker de l’événement à alimenter.',
}: EventSelectorProps) {
  const [eventId, setEventId] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit(eventId.trim())
  }

  return (
    <section className="rounded-xl border border-[#E8E4DE] bg-white p-6">
      <h1 className="text-xl font-medium text-[#1A1A1A]">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">
        {description}
      </p>
      <form className="mt-6 max-w-md space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#1A1A1A]">Event ID</span>
          <Input
            autoComplete="off"
            value={eventId}
            onChange={(event) => setEventId(event.target.value)}
            placeholder="ex. 12345"
          />
        </label>
        {error && <Alert>{error}</Alert>}
        <Button disabled={loading || eventId.trim().length === 0} type="submit">
          {loading ? 'Chargement...' : 'Charger l’événement'}
        </Button>
      </form>
    </section>
  )
}
