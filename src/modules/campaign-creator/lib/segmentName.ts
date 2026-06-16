const DEFAULT_SEGMENT_PREFIX = 'z_script_Segment_'
const STORAGE_KEY = 'em_segment_prefix'

export function getSavedPrefix(): string {
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_SEGMENT_PREFIX
}

export function savePrefix(prefix: string): void {
  localStorage.setItem(STORAGE_KEY, prefix)
}

export function buildSegmentName(sessionName: string, prefix: string): string {
  return `${prefix}${sessionName}`
}
