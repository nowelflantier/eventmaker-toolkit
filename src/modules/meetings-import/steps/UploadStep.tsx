import { ChangeEvent, DragEvent, useMemo, useState } from 'react'
import Alert from '../../../components/ui/Alert'
import Button from '../../../components/ui/Button'
import { normalizeText } from '../lib/normalizeText'
import { parseExcel } from '../lib/parseExcel'
import { ColumnMapping, ParsedExcel } from '../types'

const roles = [
  { value: '', label: '(ignorer)' },
  { value: 'guest1Uid', label: 'UID Guest 1' },
  { value: 'guest2Uid', label: 'UID Guest 2' },
  { value: 'slot', label: 'Créneau complet' },
  { value: 'slotDate', label: 'Date' },
  { value: 'slotTime', label: 'Heure' },
  { value: 'location', label: 'Lieu' },
] as const

type Role = keyof ColumnMapping

interface UploadStepProps {
  parsedExcel: ParsedExcel | null
  columnMapping: ColumnMapping | null
  onParsed: (parsedExcel: ParsedExcel, columnMapping: ColumnMapping) => void
  onContinue: () => void
  onBack: () => void
}

export default function UploadStep({
  parsedExcel,
  columnMapping,
  onParsed,
  onContinue,
  onBack,
}: UploadStepProps) {
  const [error, setError] = useState<string | null>(null)
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>(columnMapping ?? {})
  const previewRows = parsedExcel?.rows.slice(0, 5) ?? []

  const isComplete = useMemo(
    () =>
      Boolean(
        mapping.guest1Uid &&
          mapping.guest2Uid &&
          mapping.location &&
          (mapping.slot || (mapping.slotDate && mapping.slotTime)),
      ),
    [mapping],
  )

  async function handleFile(file: File) {
    setError(null)
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setError('Format invalide. Sélectionnez un fichier .xlsx ou .xls.')
      return
    }

    try {
      const parsed = await parseExcel(file)
      const detected = detectColumnMapping(parsed.headers)
      setMapping(detected)
      onParsed(parsed, detected as ColumnMapping)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de lire le fichier Excel.')
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) void handleFile(file)
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  function updateRole(header: string, role: string) {
    const next = Object.fromEntries(
      Object.entries(mapping).filter(([, value]) => value !== header),
    ) as Partial<ColumnMapping>

    if (role) {
      next[role as Role] = header
    }

    setMapping(next)
  }

  function continueWithMapping() {
    if (isComplete) onParsed(parsedExcel!, mapping as ColumnMapping)
    onContinue()
  }

  return (
    <section className="rounded-xl border border-[#E8E4DE] bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-[#1A1A1A]">Fichier Excel</h1>
          <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">
            Importez le fichier puis associez les colonnes aux champs requis.
          </p>
        </div>
        <Button variant="ghost" onClick={onBack}>
          ← Retour
        </Button>
      </div>

      <label
        className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#D7D2CA] bg-[#F8F7F4] px-6 py-10 text-center transition hover:border-[#0066FF]"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <input accept=".xlsx,.xls" className="hidden" type="file" onChange={handleInputChange} />
        <span className="text-sm font-medium text-[#1A1A1A]">Déposer un fichier Excel</span>
        <span className="mt-1 text-xs text-[#6B6B6B]">ou cliquer pour sélectionner un fichier</span>
      </label>

      <div className="mt-4 rounded-lg border border-[#E8E4DE] bg-[#F8F7F4] p-4 text-sm leading-6 text-[#6B6B6B]">
        <p className="font-medium text-[#1A1A1A]">Format attendu pour les créneaux</p>
        <p className="mt-1">
          Recommandé : une colonne <span className="font-medium text-[#1A1A1A]">Date</span> au
          format <span className="font-mono text-xs">JJ/MM/AAAA</span> ou{' '}
          <span className="font-mono text-xs">AAAA-MM-JJ</span>, et une colonne{' '}
          <span className="font-medium text-[#1A1A1A]">Heure</span> au format{' '}
          <span className="font-mono text-xs">HH:mm</span>. Alternative : une seule colonne{' '}
          <span className="font-medium text-[#1A1A1A]">Créneau complet</span> contenant par exemple{' '}
          <span className="font-mono text-xs">2026-05-06 10:18</span>.
        </p>
      </div>

      {error && <Alert className="mt-4">{error}</Alert>}

      {parsedExcel && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead>
              <tr>
                {parsedExcel.headers.map((header) => (
                  <th key={header} className="border-b border-[#E8E4DE] pb-3 pr-3 align-bottom">
                    <select
                      className="mb-2 h-9 w-full rounded-lg border border-[#E0DDD8] bg-white px-2 text-xs"
                      value={findRoleForHeader(mapping, header)}
                      onChange={(event) => updateRole(header, event.target.value)}
                    >
                      {roles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    <span className="font-medium text-[#1A1A1A]">{header}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, index) => (
                <tr key={index}>
                  {parsedExcel.headers.map((header) => (
                    <td key={header} className="border-b border-[#F0EEE9] py-3 pr-3 text-[#6B6B6B]">
                      {row[header]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-5 flex justify-end">
            <Button disabled={!isComplete} onClick={continueWithMapping}>
              Continuer
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

function detectColumnMapping(headers: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {}
  const uidCandidates = headers.filter((header) => {
    const normalized = normalizeText(header)
    return ['uid', 'guest', 'participant', 'intervenant'].some((token) => normalized.includes(token))
  })

  mapping.guest1Uid = uidCandidates[0]
  mapping.guest2Uid = uidCandidates[1]
  mapping.slotDate = headers.find((header) => {
    const normalized = normalizeText(header)
    return ['date', 'jour'].some((token) => normalized.includes(token))
  })
  mapping.slotTime = headers.find((header) => {
    const normalized = normalizeText(header)
    return ['heure', 'horaire', 'time'].some((token) => normalized.includes(token))
  })
  mapping.slot = headers.find((header) => {
    const normalized = normalizeText(header)
    return ['creneau', 'slot'].some((token) => normalized.includes(token))
  })
  mapping.location = headers.find((header) => {
    const normalized = normalizeText(header)
    return ['lieu', 'salle', 'location', 'room'].some((token) => normalized.includes(token))
  })

  return mapping
}

function findRoleForHeader(mapping: Partial<ColumnMapping>, header: string): string {
  return Object.entries(mapping).find(([, value]) => value === header)?.[0] ?? ''
}
