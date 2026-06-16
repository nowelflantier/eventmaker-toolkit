import { useMemo } from 'react'
import { buildCampaignPayload } from '../lib/buildCampaignPayload'
import { resolveTemplate } from '../lib/resolveTemplate'
import { buildSegmentName } from '../lib/segmentName'
import {
  CampaignConfig,
  CampaignMatrixRow,
  EventmakerSegment,
  EventmakerSession,
} from '../types'

export function useCampaignDryRun(params: {
  sessions: EventmakerSession[]
  segments: EventmakerSegment[]
  config: CampaignConfig
}): CampaignMatrixRow[] {
  return useMemo(
    () =>
      params.sessions.map((session) =>
        buildCampaignRow({
          session,
          segments: params.segments,
          config: params.config,
        }),
      ),
    [params.config, params.segments, params.sessions],
  )
}

function buildCampaignRow(params: {
  session: EventmakerSession
  segments: EventmakerSegment[]
  config: CampaignConfig
}): CampaignMatrixRow {
  const segmentName = buildSegmentName(params.session.name, params.config.segmentPrefix)
  const existingSegment = params.segments.find((segment) => segment.name === segmentName)
  const errors: string[] = []
  const scheduledAt = getScheduledAt(params.session.start_date, params.config.notificationOffsetMinutes, errors)
  const resolvedMessage = resolveTemplate(params.config.messageContent, params.session)
  const resolvedTitle = resolveTemplate(params.config.notificationTitle, params.session)

  if (!resolvedMessage.trim()) errors.push('Message vide')
  if (!resolvedTitle.trim()) errors.push('Titre vide')

  const status: CampaignMatrixRow['status'] =
    errors.length > 0 ? 'error' : existingSegment ? 'segment_exists' : 'ready'

  return {
    session: params.session,
    segmentName,
    segmentExists: Boolean(existingSegment),
    segmentId: existingSegment?._id ?? null,
    scheduledAt,
    resolvedMessage: resolvedMessage || null,
    resolvedTitle: resolvedTitle || null,
    payload:
      status !== 'error' && scheduledAt
        ? buildCampaignPayload({
            session: params.session,
            segmentId: existingSegment?._id ?? '',
            scheduledAt,
            messageContent: resolvedMessage,
            notificationTitle: resolvedTitle,
          })
        : null,
    status,
    errors,
  }
}

function getScheduledAt(startDateValue: string, offsetMinutes: number, errors: string[]): string | null {
  if (!startDateValue) {
    errors.push('Date de début absente')
    return null
  }

  const startDate = new Date(startDateValue)
  if (Number.isNaN(startDate.getTime())) {
    errors.push('Date de début invalide')
    return null
  }

  const scheduledAt = new Date(startDate.getTime() - offsetMinutes * 60_000)
  if (scheduledAt.getTime() < Date.now()) {
    errors.push('Heure de notification dans le passé')
  }

  return scheduledAt.toISOString()
}
