import * as XLSX from 'xlsx'
import { ParsedExcel } from '../types'

export async function parseExcel(file: File): Promise<ParsedExcel> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) throw new Error('Le fichier ne contient aucune feuille.')

  const sheet = workbook.Sheets[firstSheetName]
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  })

  const headerRow = matrix[0] ?? []
  const headers = headerRow
    .map((cell, index) => String(cell || `Colonne ${index + 1}`).trim())
    .filter(Boolean)

  if (headers.length === 0) throw new Error('Aucun en-tête détecté sur la première ligne.')

  const rows = matrix.slice(1).reduce<Record<string, string>[]>((acc, row) => {
    const record = headers.reduce<Record<string, string>>((current, header, index) => {
      current[header] = String(row[index] ?? '').trim()
      return current
    }, {})

    if (Object.values(record).some((value) => value.length > 0)) {
      acc.push(record)
    }

    return acc
  }, [])

  return { headers, rows }
}
