import * as XLSX from 'xlsx'
import { ParsedExcel } from '../types'

export async function parseExcel(file: File): Promise<ParsedExcel> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellNF: true })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) throw new Error('Le fichier ne contient aucune feuille.')

  const sheet = workbook.Sheets[firstSheetName]
  const matrix = readMatrix(sheet)

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

function readMatrix(sheet: XLSX.WorkSheet): (XLSX.CellObject | undefined)[][] {
  const ref = sheet['!ref']
  if (!ref) return []

  const range = XLSX.utils.decode_range(ref)
  const rows: (XLSX.CellObject | undefined)[][] = []

  for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
    const row: (XLSX.CellObject | undefined)[] = []

    for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
      row.push(sheet[XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })])
    }

    rows.push(row)
  }

  return rows
}

function formatCell(cell: XLSX.CellObject | undefined, header: string): string {
  if (!cell) return ''

  const kind = detectColumnKind(header)

  if (cell.t === 'd' && cell.v instanceof Date) {
    if (kind === 'time') return formatTime(cell.v.getHours(), cell.v.getMinutes())
    if (kind === 'date') return formatDate(cell.v.getFullYear(), cell.v.getMonth() + 1, cell.v.getDate())
  }

  if (cell.t === 'n' && typeof cell.v === 'number') {
    const parsed = XLSX.SSF.parse_date_code(cell.v)
    if (parsed && kind === 'date') return formatDate(parsed.y, parsed.m, parsed.d)
    if (parsed && kind === 'time') return formatTime(parsed.H, parsed.M)
  }

  const value = String(cell.w ?? cell.v ?? '').trim()
  if (kind === 'time') return normalizeTimeText(value)
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

function formatDate(year: number, month: number, day: number): string {
  return `${pad(day)}/${pad(month)}/${year}`
}

function formatTime(hour: number, minute: number): string {
  return `${pad(hour)}:${pad(minute)}`
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}
