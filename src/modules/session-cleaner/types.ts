export interface EventmakerAccesspointSession {
  _id: string
  name: string
  display_name: string
  type: string
  start_date: string
  end_date: string
  location: string
  uid: string
}

export interface ExecutionResult {
  session: EventmakerAccesspointSession
  status: 'deleted' | 'failed' | 'skipped'
  error: string | null
}
