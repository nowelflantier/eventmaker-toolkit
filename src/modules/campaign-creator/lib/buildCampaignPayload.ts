import { CampaignPayload, EventmakerSession, SegmentPayload } from '../types'

export function buildSegmentPayload(session: EventmakerSession, segmentName: string): SegmentPayload {
  return {
    saved_search: {
      name: segmentName,
      search_query: `expected_at:"${session.name}" status:registered sort:registered-desc`,
    },
  }
}

export function buildCampaignPayload(params: {
  session: EventmakerSession
  segmentId: string
  scheduledAt: string
  messageContent: string
  notificationTitle: string
}): CampaignPayload {
  return {
    guest_campaign: {
      name: `Campagne - ${params.session.name}`,
      email_template_id: null,
      excluded_saved_search_ids: [],
      from_name: 'Eventmaker',
      message_content: params.messageContent,
      message_notification_title: params.notificationTitle,
      message_notification_page_path: `/programme/${params.session._id}`,
      message_notification_requires_interaction: true,
      preheader_text: '',
      reply_to_email: 'noreply@franchiseparis.com',
      saved_search_ids: [params.segmentId],
      scheduled_at: params.scheduledAt,
      send_to_optout: false,
      sender_email: 'noreply@awesomevent.net',
      sms_content: '',
      status: 'draft',
      subject: '',
      use_email: false,
      use_message: true,
      use_sms: false,
    },
  }
}
