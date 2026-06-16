import { MeetingPayload } from '../types'

export function buildMeetingPayload(params: {
  guestIds: [string, string]
  slotId: string
  locationId: string
  skipNotifications: boolean
}): MeetingPayload {
  return {
    guest_ids: params.guestIds,
    description: null,
    slot_id: params.slotId,
    type: 'physical',
    location_id: params.locationId,
    skip_notifications: params.skipNotifications,
    auto_confirm: true,
  }
}
