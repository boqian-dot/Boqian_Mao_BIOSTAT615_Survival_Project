import type { Subject, ValidationIssue } from './types'

export class DataValidationError extends Error {
  readonly issues: ValidationIssue[]

  constructor(issues: ValidationIssue[]) {
    super(issues.map((issue) => `Row ${issue.row}: ${issue.message}`).join(' '))
    this.name = 'DataValidationError'
    this.issues = issues
  }
}

/** Validation never drops a row or coerces a status/time code. */
export function validateSubjects(subjects: readonly Subject[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const seen = new Set<string>()
  subjects.forEach((subject, index) => {
    const row = subject.sourceRow ?? index + 1
    const add = (field: string, message: string) => issues.push({ row, id: subject.id, field, message })
    if (typeof subject.id !== 'string' || !subject.id.trim()) {
      add('id', 'A nonempty subject ID is required.')
    } else if (seen.has(subject.id.trim())) {
      add('id', `Subject ID "${subject.id}" is repeated; use one row per subject.`)
    } else {
      seen.add(subject.id.trim())
    }
    if (!Number.isFinite(subject.time) || subject.time < 0) {
      add('time', 'Follow-up time must be a finite number at least zero.')
    }
    if (subject.event !== 0 && subject.event !== 1) {
      add('event', 'The internal event indicator must be exactly 0 or 1.')
    }
    if (subject.group !== undefined && typeof subject.group !== 'string') {
      add('group', 'A group label must be text when supplied.')
    }
  })
  return issues
}

export function assertValidSubjects(subjects: readonly Subject[]): void {
  const issues = validateSubjects(subjects)
  if (issues.length > 0) throw new DataValidationError(issues)
}
