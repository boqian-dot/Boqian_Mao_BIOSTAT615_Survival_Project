import { describe, expect, it } from 'vitest'
import { CSV_TEMPLATE, MAX_DATA_ROWS, MAX_FILE_BYTES, mapCsv, observedStatusValues, parseCsv, type ColumnMapping } from '../../src/import'

function mapping(overrides: Partial<ColumnMapping> = {}): ColumnMapping {
  return {
    timeColumn: 'time', statusColumn: 'event', groupColumn: 'group', idColumn: 'id',
    statusAssignments: { '1': 1, '0': 0 }, unit: 'days', designConfirmed: true,
    ...overrides,
  }
}

function messages(result: { issues: { message: string }[] }) {
  return result.issues.map((issue) => issue.message).join(' ')
}

describe('CSV parsing without row loss', () => {
  it('accepts the downloadable teaching template and retains source rows', () => {
    const csv = parseCsv(CSV_TEMPLATE)
    expect(csv.issues).toEqual([])
    const result = mapCsv(csv, mapping())
    expect(result.valid).toBe(true)
    expect(result.counts).toEqual({ rows: 8, events: 5, censored: 3, groups: 2 })
    expect(result.subjects[0]).toEqual({ id: '1', time: 1, event: 1, group: 'A', sourceRow: 2 })
  })

  it('supports BOM, CRLF, quoted commas and quoted newlines with physical source line numbers', () => {
    const csv = parseCsv('\uFEFFduration,outcome,note\r\n1,dead,"one, two\r\nthree"\r\n2,alive,plain\r\n')
    expect(csv.issues).toEqual([])
    expect(csv.rows.map((row) => row.sourceRow)).toEqual([2, 4])
    expect(csv.rows[0].cells[2]).toBe('one, two\r\nthree')
    const result = mapCsv(csv, mapping({ timeColumn: 'duration', statusColumn: 'outcome', groupColumn: '', idColumn: '', statusAssignments: { dead: 1, alive: 0 } }))
    expect(result.valid).toBe(true)
    expect(result.subjects.map((row) => row.id)).toEqual(['row-2', 'row-4'])
  })

  it('reports blank lines and whitespace normalization without hiding delimiter-only rows', () => {
    const csv = parseCsv('\n time , event \n 1 , 0 \n\n2,1\n')
    expect(csv.issues).toEqual([])
    expect(csv.ignoredBlankLines).toBe(2)
    expect(csv.normalizedCells).toBe(4)
    expect(csv.rows.map((row) => row.sourceRow)).toEqual([3, 5])
    const invalid = mapCsv(parseCsv('time,event\n1,1\n,\n'), mapping({ idColumn: '', groupColumn: '' }))
    expect(invalid.valid).toBe(false)
    expect(invalid.subjects).toEqual([])
    expect(invalid.issues.some((issue) => issue.row === 3 && issue.field === 'time')).toBe(true)
  })

  it('rejects duplicate normalized headers, empty headers, malformed quotes, and mismatched fields', () => {
    expect(messages(parseCsv('time, time\n1,0\n'))).toContain('Duplicate column')
    expect(messages(parseCsv('time,\n1,0\n'))).toContain('nonempty header')
    expect(messages(parseCsv('time,event\n1,"broken\n'))).toContain('Malformed CSV')
    expect(messages(parseCsv('time,event\n1,0,A\n'))).toContain('Expected 2 fields')
    expect(messages(parseCsv('time;event\n1;0\n'))).toContain('comma-separated')
  })

  it('enforces byte and row limits without analyzing a truncated dataset', () => {
    expect(messages(parseCsv('time,event\n1,1\n', MAX_FILE_BYTES + 1))).toContain('2 MiB')
    const csv = parseCsv(`time,event\n${'1,1\n'.repeat(MAX_DATA_ROWS + 1)}`)
    expect(messages(csv)).toContain('5,000-row')
    expect(mapCsv(csv, mapping({ idColumn: '', groupColumn: '' })).subjects).toEqual([])
  })

  it('requires header plus observations', () => {
    expect(messages(parseCsv(''))).toContain('at least one data row')
    expect(messages(parseCsv('time,event\n'))).toContain('at least one data row')
  })
})

describe('Explicit column and event-code mapping', () => {
  it('does not guess 1/2 status codes, and maps them only after an explicit choice', () => {
    const csv = parseCsv('followup,status\n0,1\n3.5,2\n')
    expect(observedStatusValues(csv, 'status')).toEqual(['1', '2'])
    const incomplete = mapping({ timeColumn: 'followup', statusColumn: 'status', groupColumn: '', idColumn: '', statusAssignments: {} })
    expect(mapCsv(csv, incomplete).valid).toBe(false)
    const result = mapCsv(csv, { ...incomplete, statusAssignments: { '1': 0, '2': 1 } })
    expect(result.valid).toBe(true)
    expect(result.subjects.map((subject) => subject.event)).toEqual([0, 1])
    expect(result.subjects[0].time).toBe(0)
  })

  it('allows a sole observed code to mean either censored or event without an absent opposite code', () => {
    const csv = parseCsv('time,event\n2,0\n1,0\n')
    const base = mapping({ idColumn: '', groupColumn: '' })
    const censored = mapCsv(csv, { ...base, statusAssignments: { '0': 0 } })
    expect(censored.valid).toBe(true)
    expect(censored.counts.events).toBe(0)
    expect(censored.warnings.some((warning) => warning.includes('All observations are censored'))).toBe(true)
    const event = mapCsv(csv, { ...base, statusAssignments: { '0': 1 } })
    expect(event.valid).toBe(true)
    expect(event.counts.events).toBe(2)
  })

  it('rejects extra endpoint codes and unknown assignments', () => {
    const csv = parseCsv('time,event\n1,alive\n2,dead\n3,other\n')
    const result = mapCsv(csv, mapping({ groupColumn: '', idColumn: '', statusAssignments: { alive: 0, dead: 1 } }))
    expect(result.valid).toBe(false)
    expect(messages(result)).toContain('More than two status values')
    expect(result.subjects).toEqual([])
  })

  it('rejects negative, nonfinite, missing, hexadecimal, and numeric-prefix times with source locations', () => {
    for (const time of ['-1', 'Infinity', '', '0x10', '3days', 'NaN']) {
      const result = mapCsv(parseCsv(`time,event\n${time},1\n`), mapping({ groupColumn: '', idColumn: '' }))
      expect(result.valid, time).toBe(false)
      expect(result.issues.some((issue) => issue.row === 2 && issue.field === 'time'), time).toBe(true)
    }
  })

  it('accepts ordinary scientific notation and unsorted follow-up', () => {
    const result = mapCsv(parseCsv('time,event\n1e2,1\n.5,0\n'), mapping({ groupColumn: '', idColumn: '' }))
    expect(result.valid).toBe(true)
    expect(result.subjects.map((subject) => subject.time)).toEqual([100, 0.5])
  })

  it('rejects duplicate supplied IDs and never returns a partial analysis', () => {
    const csv = parseCsv('id,time,event\nx,1,1\nx,2,0\n')
    const result = mapCsv(csv, mapping({ groupColumn: '' }))
    expect(result.valid).toBe(false)
    expect(messages(result)).toContain('first seen on source line 2')
    expect(result.subjects).toEqual([])
  })

  it('allows pooled analysis after removing a group mapping containing missing values', () => {
    const csv = parseCsv('time,event,group\n1,1,A\n2,0,\n')
    const grouped = mapCsv(csv, mapping({ idColumn: '' }))
    expect(grouped.valid).toBe(false)
    expect(messages(grouped)).toContain('remove the group mapping')
    const pooled = mapCsv(csv, mapping({ idColumn: '', groupColumn: '' }))
    expect(pooled.valid).toBe(true)
    expect(pooled.subjects.every((subject) => subject.group === undefined)).toBe(true)
  })

  it('keeps all records when more than two groups require explicit downstream selection', () => {
    const csv = parseCsv('time,event,group\n1,1,A\n2,0,B\n3,1,C\n')
    const result = mapCsv(csv, mapping({ idColumn: '' }))
    expect(result.valid).toBe(true)
    expect(result.subjects).toHaveLength(3)
    expect(result.counts.groups).toBe(3)
    expect(result.warnings.some((warning) => warning.includes('Choose exactly two'))).toBe(true)
  })

  it('requires study confirmation and unit rather than inferring design validity', () => {
    const result = mapCsv(parseCsv(CSV_TEMPLATE), mapping({ unit: '', designConfirmed: false }))
    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.field === 'Study structure')).toBe(true)
    expect(result.issues.some((issue) => issue.field === 'Time unit')).toBe(true)
  })

  it('does not treat inherited object properties as assigned status codes', () => {
    const result = mapCsv(parseCsv('time,event\n1,constructor\n'), mapping({ groupColumn: '', idColumn: '', statusAssignments: {} }))
    expect(result.valid).toBe(false)
    expect(messages(result)).toContain('explicit Event/Censored assignment')
  })

  it('accepts an explicitly assigned prototype-like status label without changing object prototypes', () => {
    const statusAssignments = Object.create(null) as Record<string, 0 | 1>
    statusAssignments.__proto__ = 0
    const result = mapCsv(parseCsv('time,event\n1,__proto__\n'), mapping({ groupColumn: '', idColumn: '', statusAssignments }))
    expect(result.valid).toBe(true)
    expect(result.subjects[0].event).toBe(0)
  })
})
