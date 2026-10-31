import Papa from 'papaparse'
import type { Subject } from '../stats'

export const MAX_FILE_BYTES = 2 * 1024 * 1024
export const MAX_DATA_ROWS = 5000

export interface ImportIssue {
  row?: number
  field?: string
  message: string
}

export interface CsvRow {
  sourceRow: number
  cells: string[]
}

export interface ParsedCsv {
  headers: string[]
  rows: CsvRow[]
  issues: ImportIssue[]
  notices: string[]
  ignoredBlankLines: number
  normalizedCells: number
  bytes: number
}

export interface ColumnMapping {
  timeColumn: string
  statusColumn: string
  groupColumn?: string
  idColumn?: string
  statusAssignments: Record<string, 0 | 1>
  unit: string
  designConfirmed: boolean
}

export interface MappingResult {
  subjects: Subject[]
  issues: ImportIssue[]
  warnings: string[]
  valid: boolean
  counts: { rows: number; events: number; censored: number; groups: number }
}

function lineBreaks(text: string): number {
  return (text.match(/\r\n|\n|\r/g) ?? []).length
}

/** Parse locally, preserving the physical starting line of quoted multiline records. */
export function parseCsv(text: string, bytes = new TextEncoder().encode(text).byteLength): ParsedCsv {
  const output: ParsedCsv = {
    headers: [], rows: [], issues: [], notices: [], ignoredBlankLines: 0,
    normalizedCells: 0, bytes,
  }
  if (bytes > MAX_FILE_BYTES) {
    output.issues.push({ message: 'File exceeds the 2 MiB limit. Use a smaller CSV.' })
    return output
  }
  const source = text.replace(/^\uFEFF/, '')
  let cursor = 0
  let physicalLine = 1
  let foundHeader = false
  Papa.parse<string[]>(source, {
    delimiter: ',',
    dynamicTyping: false,
    skipEmptyLines: false,
    step(result, parser) {
      const sourceRow = physicalLine
      const end = result.meta.cursor
      const rawRecord = source.slice(cursor, end)
      cursor = end
      physicalLine += lineBreaks(rawRecord)
      if (rawRecord.length === 0 && result.data.every((cell) => cell === '')) return
      for (const error of result.errors) {
        output.issues.push({ row: sourceRow, message: `Malformed CSV: ${error.message}` })
      }
      if (rawRecord.trim() === '') {
        output.ignoredBlankLines += Math.max(1, lineBreaks(rawRecord))
        return
      }
      const cells = result.data.map((cell) => {
        const normalized = cell.trim()
        if (cell !== normalized) output.normalizedCells += 1
        return normalized
      })
      if (!foundHeader) {
        foundHeader = true
        output.headers = cells
        if (cells.length < 2) output.issues.push({ row: sourceRow, message: 'At least two comma-separated columns are needed for follow-up time and event/status.' })
        const seen = new Set<string>()
        for (const [index, name] of cells.entries()) {
          if (name === '') output.issues.push({ row: sourceRow, field: `Column ${index + 1}`, message: 'Every column needs a nonempty header.' })
          if (seen.has(name)) output.issues.push({ row: sourceRow, field: name, message: 'Duplicate column header after trimming whitespace. Rename it in the source file.' })
          seen.add(name)
        }
        return
      }
      if (cells.length !== output.headers.length) {
        output.issues.push({ row: sourceRow, message: `Expected ${output.headers.length} fields but found ${cells.length}. Check commas and quotation marks.` })
      }
      output.rows.push({ sourceRow, cells })
      if (output.rows.length > MAX_DATA_ROWS) {
        output.issues.push({ row: sourceRow, message: 'The CSV exceeds the 5,000-row limit. No partial dataset will be analyzed.' })
        parser.abort()
      }
    },
  })
  if (!foundHeader || output.rows.length === 0) output.issues.push({ message: 'The CSV must contain a header and at least one data row.' })
  if (output.ignoredBlankLines > 0) output.notices.push(`Ignored ${output.ignoredBlankLines} completely blank line${output.ignoredBlankLines === 1 ? '' : 's'}; source line numbers are retained.`)
  if (output.normalizedCells > 0) output.notices.push(`Trimmed surrounding whitespace in ${output.normalizedCells} header or data cell${output.normalizedCells === 1 ? '' : 's'}. Values were not otherwise recoded.`)
  return output
}

export function observedStatusValues(parsed: ParsedCsv, statusColumn: string): string[] {
  const index = parsed.headers.indexOf(statusColumn)
  if (index < 0) return []
  return [...new Set(parsed.rows.map((row) => row.cells[index] ?? '').filter((value) => value !== ''))].sort()
}

/** Explicit mapping only: no row deletion, imputation, event-code guessing, or numeric-prefix parsing. */
export function mapCsv(parsed: ParsedCsv, mapping: ColumnMapping): MappingResult {
  const issues = [...parsed.issues]
  const warnings: string[] = []
  const subjects: Subject[] = []
  const timeIndex = parsed.headers.indexOf(mapping.timeColumn)
  const statusIndex = parsed.headers.indexOf(mapping.statusColumn)
  const groupIndex = mapping.groupColumn ? parsed.headers.indexOf(mapping.groupColumn) : -1
  const idIndex = mapping.idColumn ? parsed.headers.indexOf(mapping.idColumn) : -1
  if (timeIndex < 0) issues.push({ field: 'Time column', message: 'Choose the follow-up time column.' })
  if (statusIndex < 0) issues.push({ field: 'Status column', message: 'Choose the event/status column.' })
  if (timeIndex >= 0 && timeIndex === statusIndex) issues.push({ field: 'Column mapping', message: 'Choose separate columns for follow-up time and event status.' })
  if (mapping.groupColumn && groupIndex < 0) issues.push({ field: 'Group column', message: 'The selected group column is not present.' })
  if (mapping.idColumn && idIndex < 0) issues.push({ field: 'ID column', message: 'The selected ID column is not present.' })
  if (!mapping.unit.trim()) issues.push({ field: 'Time unit', message: 'Enter a common time-unit label, such as days or months.' })
  if (!mapping.designConfirmed) issues.push({ field: 'Study structure', message: 'Confirm one independent subject per row, one event endpoint, ordinary right censoring, and a common time origin and unit.' })
  const statuses = observedStatusValues(parsed, mapping.statusColumn)
  if (statuses.length > 2) issues.push({ field: 'Status coding', message: 'More than two status values were found. This version supports one endpoint with one or two explicit event/censoring codes; do not collapse competing event types.' })
  for (const status of statuses) {
    if (!Object.prototype.hasOwnProperty.call(mapping.statusAssignments, status)) issues.push({ field: 'Status coding', message: `Assign status ${JSON.stringify(status)} to Event or Censored.` })
  }
  const ids = new Map<string, number>()
  if (timeIndex >= 0 && statusIndex >= 0 && parsed.issues.length === 0) {
    for (const row of parsed.rows) {
      const timeText = row.cells[timeIndex] ?? ''
      const time = Number(timeText)
      const status = row.cells[statusIndex] ?? ''
      const event = mapping.statusAssignments[status]
      const id = idIndex >= 0 ? row.cells[idIndex] ?? '' : `row-${row.sourceRow}`
      const group = groupIndex >= 0 ? row.cells[groupIndex] ?? '' : undefined
      const rowIssues: ImportIssue[] = []
      const decimalNumber = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(timeText)
      if (!decimalNumber || !Number.isFinite(time) || time < 0) rowIssues.push({ row: row.sourceRow, field: mapping.timeColumn, message: 'Follow-up time must be a finite number at least zero; units belong in the time-unit field.' })
      if (status === '') rowIssues.push({ row: row.sourceRow, field: mapping.statusColumn, message: 'Event/status is missing.' })
      else if (!Object.prototype.hasOwnProperty.call(mapping.statusAssignments, status) || (event !== 0 && event !== 1)) rowIssues.push({ row: row.sourceRow, field: mapping.statusColumn, message: `Status ${JSON.stringify(status)} has no explicit Event/Censored assignment.` })
      if (!id) rowIssues.push({ row: row.sourceRow, field: mapping.idColumn, message: 'The selected subject ID is missing.' })
      else if (ids.has(id)) rowIssues.push({ row: row.sourceRow, field: mapping.idColumn, message: `Duplicate ID ${JSON.stringify(id)}; first seen on source line ${ids.get(id)}. Use one row per subject.` })
      else ids.set(id, row.sourceRow)
      if (groupIndex >= 0 && !group) rowIssues.push({ row: row.sourceRow, field: mapping.groupColumn, message: 'Group is missing. Correct the source value or remove the group mapping to use pooled analysis.' })
      issues.push(...rowIssues)
      if (rowIssues.length === 0) subjects.push({ id, time, event, ...(group !== undefined ? { group } : {}), sourceRow: row.sourceRow })
    }
  }
  const valid = issues.length === 0
  const events = subjects.filter((subject) => subject.event === 1).length
  const groups = new Set(subjects.map((subject) => subject.group).filter((value) => value !== undefined)).size
  if (valid && events === 0) warnings.push('All observations are censored: KM remains 1 and NA remains 0. A log-rank test has no event information.')
  if (valid && groupIndex < 0) warnings.push('No group column is mapped. Pooled KM and NA are available; a two-group comparison is not available.')
  if (valid && groupIndex >= 0 && groups < 2) warnings.push('Only one group is present. KM and NA are available; a two-group log-rank comparison requires two groups.')
  if (valid && groups > 2) warnings.push(`${groups} groups are present. Choose exactly two in the comparison view; included and excluded counts will be displayed.`)
  return {
    // Invalid rows are never silently removed to produce a partial analysis.
    subjects: valid ? subjects : [], issues, warnings, valid,
    counts: { rows: parsed.rows.length, events: valid ? events : 0, censored: valid ? subjects.length - events : 0, groups: valid ? groups : 0 },
  }
}

export const CSV_TEMPLATE = 'id,time,event,group\n1,1,1,A\n2,2,0,B\n3,3,1,A\n4,3,1,B\n5,3,0,A\n6,5,1,B\n7,6,0,A\n8,7,1,B\n'
