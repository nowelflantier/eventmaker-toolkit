export interface EventmakerSession {
  _id: string
  name: string
  display_name: string
  location: string
  start_date: string
  end_date: string
  start_date_to_timezone: string
  end_date_to_timezone?: string
  type: string
  session_type: string
  session_room: { name: string } | null
  traits: Record<string, string>
  uid: string
}

export interface EventmakerSegment {
  _id: string
  name: string
}

export interface CampaignConfig {
  notificationOffsetMinutes: number
  messageContent: string
  notificationTitle: string
  segmentPrefix: string
  skipNotifications: boolean
  autoConfirm: boolean
  traitFilter: TraitFilter | null
}

export interface TraitFilter {
  key: string
  value: string
}

export type CampaignRowStatus = 'ready' | 'error' | 'skipped' | 'segment_exists'

export interface CampaignMatrixRow {
  session: EventmakerSession
  segmentName: string
  segmentExists: boolean
  segmentId: string | null
  scheduledAt: string | null
  resolvedMessage: string | null
  resolvedTitle: string | null
  payload: CampaignPayload | null
  status: CampaignRowStatus
  errors: string[]
}

export interface CampaignPayload {
  guest_campaign: {
    name: string
    saved_search_ids: string[]
    scheduled_at: string
    message_content: string
    message_notification_title: string
    message_notification_page_path: string
    message_notification_requires_interaction: boolean
    use_email: boolean
    use_message: boolean
    use_sms: boolean
    status: 'draft'
    send_to_optout: boolean
    from_name: string
    reply_to_email: string
    sender_email: string
    excluded_saved_search_ids: []
    preheader_text: string
    subject: string
    sms_content: string
    email_template_id: null
  }
}

export interface ExecutionResult {
  session: EventmakerSession
  segmentId: string | null
  campaignId: string | null
  status: 'created' | 'failed' | 'skipped'
  error: string | null
  scheduledAt: string | null
}

export interface SegmentPayload {
  saved_search: {
    name: string
    search_query: string
  }
}
