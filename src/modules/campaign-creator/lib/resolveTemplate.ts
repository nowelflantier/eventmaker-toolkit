import { EventmakerSession } from '../types'

export const templateTags = [
  { label: 'session.name', token: '{{session.name}}' },
  { label: 'session.location', token: '{{session.location}}' },
  { label: 'session.start_date', token: '{{session.start_date}}' },
  { label: 'session.end_date', token: '{{session.end_date}}' },
  { label: 'session.type', token: '{{session.type}}' },
  { label: 'session.room', token: '{{session.room}}' },
] as const

export function resolveTemplate(template: string, session: EventmakerSession): string {
  const values: Record<string, string> = {
    '{{session.name}}': session.name ?? '',
    '{{session.location}}': session.location ?? '',
    '{{session.start_date}}': session.start_date_to_timezone ?? '',
    '{{session.end_date}}': session.end_date_to_timezone ?? '',
    '{{session.type}}': session.session_type ?? '',
    '{{session.room}}': session.session_room?.name ?? '',
  }

  return Object.entries(values).reduce(
    (resolved, [token, value]) => resolved.split(token).join(value),
    template,
  )
}
