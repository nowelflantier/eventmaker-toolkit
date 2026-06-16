import { readSheet, Row } from 'read-excel-file/browser'
import { ParsedExcel } from '../types'

export async function parseExcel(file: File): Promise<ParsedExcel> {
  const matrix = await readSheet(file)
  if (matrix.length === 0) throw new Error('Le fichier ne contient aucune feuille.')

  const headerRow = matrix[0] ?? []
  const headers = headerRow
    .map((cell, index) => formatCell(cell, 'header') || `Colonne ${index + 1}`)
    .filter(Boolean)

  if (headers.length === 0) throw new Error('Aucun en-tête détecté sur la première ligne.')

  const rows = matrix.slice(1).reduce<Record<string, string>[]>((acc, row) => {
    const record = headers.reduce<Record<string, string>>((current, header, index) => {
      current[header] = formatCell(row[index], header)
      return current
    }, {})

    if (Object.values(record).some((value) => value.length > 0)) {
      acc.push(record)
    }

    return acc
  }, [])

  return { headers, rows }
}

function formatCell(cell: Row[number] | undefined, header: string): string {
  if (cell === null || cell === undefined) return ''

  const kind = detectColumnKind(header)

  if (cell instanceof Date) {
    if (kind === 'time') return formatTime(cell.getHours(), cell.getMinutes())
    if (kind === 'date') {
      return formatDate(cell.getFullYear(), cell.getMonth() + 1, cell.getDate())
    }
  }

  if (typeof cell === 'number') {
    const parsed = parseExcelSerialDate(cell)
    if (parsed && kind === 'date') return formatDate(parsed.year, parsed.month, parsed.day)
    if (parsed && kind === 'time') return formatTime(parsed.hour, parsed.minute)
  }

  const value = String(cell).trim()
  if (kind === 'time') return normalizeTimeText(value)
  if (kind === 'date') return normalizeDateText(value) ?? value
  return value
}

function detectColumnKind(header: string): 'date' | 'time' | 'text' {
  const normalized = header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (['heure', 'horaire', 'time'].some((token) => normalized.includes(token))) return 'time'
  if (['date', 'jour'].some((token) => normalized.includes(token))) return 'date'
  return 'text'
}

function normalizeTimeText(value: string): string {
  const match = value.match(/^(\d{1,2})\s*(?:h|:)\s*(\d{2})(?::\d{2})?$/i)
  if (!match) return value

  return formatTime(Number(match[1]), Number(match[2]))
}

function normalizeDateText(value: string): string | null {
  const trimmed = value.trim()
  const frenchLike = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/)
  if (frenchLike) {
    const year = frenchLike[3].length === 2 ? `20${frenchLike[3]}` : frenchLike[3]
    return formatDate(Number(year), Number(frenchLike[2]), Number(frenchLike[1]))
  }

  const isoLike = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/)
  if (isoLike) return formatDate(Number(isoLike[1]), Number(isoLike[2]), Number(isoLike[3]))

  return null
}

function formatDate(year: number, month: number, day: number): string {
  return `${pad(day)}/${pad(month)}/${year}`
}

function formatTime(hour: number, minute: number): string {
  return `${pad(hour)}:${pad(minute)}`
}

function parseExcelSerialDate(value: number): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
} | null {
  if (!Number.isFinite(value) || value < 0) return null

  const wholeDays = Math.floor(value)
  const dayMs = 24 * 60 * 60 * 1000
  const excelEpoch = Date.UTC(1899, 11, 30)
  const date = new Date(excelEpoch + wholeDays * dayMs)
  const totalMinutes = Math.round((value - wholeDays) * 24 * 60)

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: Math.floor(totalMinutes / 60) % 24,
    minute: totalMinutes % 60,
  }
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}
