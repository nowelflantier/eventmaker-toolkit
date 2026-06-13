export function normalizeText(value: string | null | undefined): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function textMatchScore(source: string | null | undefined, target: string | null | undefined): number {
  const normalizedSource = normalizeText(source)
  const normalizedTarget = normalizeText(target)

  if (!normalizedSource || !normalizedTarget) return 0
  if (normalizedSource === normalizedTarget) return 1
  if (normalizedTarget.includes(normalizedSource) || normalizedSource.includes(normalizedTarget)) return 0.9

  const sourceTokens = new Set(normalizedSource.split(' '))
  const targetTokens = new Set(normalizedTarget.split(' '))
  const common = [...sourceTokens].filter((token) => targetTokens.has(token)).length

  return common / Math.max(sourceTokens.size, targetTokens.size)
}
