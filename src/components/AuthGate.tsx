import { FormEvent, useState } from 'react'
import { ApiError, verifyToken } from '../lib/api'
import { SessionUser, setSessionToken, setSessionUser } from '../lib/storage'
import Alert from './ui/Alert'
import Button from './ui/Button'
import Input from './ui/Input'

interface AuthGateProps {
  onAuthenticated: (user: SessionUser) => void
}

export default function AuthGate({ onAuthenticated }: AuthGateProps) {
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const user = await verifyToken(token.trim())
      setSessionToken(token.trim())
      setSessionUser(user)
      onAuthenticated(user)
    } catch (err) {
      console.error('Eventmaker auth failed', err)
      if (err instanceof ApiError) {
        setError(`${err.message}${err.details?.status ? ` (${err.details.status})` : ''}`)
      } else if (err instanceof TypeError) {
        setError('La requête a été bloquée ou interrompue par le navigateur. Vérifiez CORS dans la console.')
      } else {
        setError('Token invalide ou impossible de joindre Eventmaker.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F7F4] px-4">
      <section className="w-full max-w-sm rounded-xl border border-[#E8E4DE] bg-white p-6 shadow-[0_8px_28px_rgba(0,0,0,0.04)]">
        <h1 className="text-xl font-medium tracking-normal text-[#1A1A1A]">
          Eventmaker <span className="font-normal text-[#6B6B6B]">Toolkit</span>
        </h1>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#1A1A1A]">Token</span>
            <Input
              autoComplete="off"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="auth_token Eventmaker"
            />
          </label>
          {error && <Alert>{error}</Alert>}
          <Button className="w-full" disabled={isSubmitting || token.trim().length === 0} type="submit">
            {isSubmitting ? 'Vérification...' : 'Vérifier'}
          </Button>
        </form>
      </section>
    </main>
  )
}
