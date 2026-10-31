import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import type { Subject } from '../stats'
import {
  CSV_TEMPLATE, MAX_DATA_ROWS, MAX_FILE_BYTES, mapCsv, observedStatusValues, parseCsv,
  type ColumnMapping, type ImportIssue, type ParsedCsv,
} from '../import'

export interface UploadPanelProps {
  onDataset: (subjects: Subject[], name: string, unit: string) => void
  onClear?: () => void
}

const EMPTY_MAPPING: ColumnMapping = {
  timeColumn: '', statusColumn: '', groupColumn: '', idColumn: '',
  statusAssignments: {}, unit: '', designConfirmed: false,
}

function IssueList({ issues }: { issues: ImportIssue[] }) {
  if (!issues.length) return null
  return <div className="notice notice-error" role="alert">
    <strong>{issues.length} issue{issues.length === 1 ? '' : 's'} to resolve</strong>
    <ul>{issues.slice(0, 30).map((issue, index) => <li key={`${issue.row}-${issue.field}-${index}`}>
      {issue.row !== undefined && <strong>Source line {issue.row}: </strong>}
      {issue.field && <span>{issue.field} — </span>}{issue.message}
    </li>)}</ul>
    {issues.length > 30 && <p>The first 30 issues are shown. No partial dataset will be analyzed.</p>}
  </div>
}

export default function UploadPanel({ onDataset, onClear }: UploadPanelProps) {
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [filename, setFilename] = useState('')
  const [fileIssues, setFileIssues] = useState<ImportIssue[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>(EMPTY_MAPPING)
  const [checked, setChecked] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [reading, setReading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const readRequest = useRef(0)
  const statuses = useMemo(() => parsed ? observedStatusValues(parsed, mapping.statusColumn) : [], [parsed, mapping.statusColumn])
  const report = useMemo(() => parsed ? mapCsv(parsed, mapping) : null, [parsed, mapping])

  function changeMapping(patch: Partial<ColumnMapping>) {
    if (loaded) onClear?.()
    setMapping((current) => ({ ...current, ...patch }))
    setLoaded(false)
  }

  function clear() {
    readRequest.current += 1
    setParsed(null)
    setFilename('')
    setFileIssues([])
    setMapping(EMPTY_MAPPING)
    setChecked(false)
    setLoaded(false)
    setReading(false)
    if (inputRef.current) inputRef.current.value = ''
    onClear?.()
  }

  async function readFile(file: File) {
    const request = ++readRequest.current
    setReading(true)
    setFilename(file.name)
    setParsed(null)
    setFileIssues([])
    setMapping(EMPTY_MAPPING)
    setChecked(false)
    setLoaded(false)
    onClear?.()
    try {
      if (file.size > MAX_FILE_BYTES) throw new Error('File exceeds the 2 MiB limit. Use a smaller CSV.')
      const buffer = await file.arrayBuffer()
      if (request !== readRequest.current) return
      let text: string
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer) }
      catch { throw new Error('This file is not valid UTF-8 text. Export it as UTF-8 CSV and try again.') }
      const result = parseCsv(text, file.size)
      setParsed(result)
    } catch (error) {
      if (request === readRequest.current) setFileIssues([{ message: error instanceof Error ? error.message : 'Could not read this CSV.' }])
    } finally {
      if (request === readRequest.current) setReading(false)
    }
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) void readFile(file)
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'survival-explorer-template.csv'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  function renderColumn(label: string, value: string, key: 'timeColumn' | 'statusColumn' | 'groupColumn' | 'idColumn', optional = false) {
    return <label className="field">
      <span>{label}{optional ? ' (optional)' : ''}</span>
      <select value={value} onChange={(event) => changeMapping({ [key]: event.target.value, ...(key === 'statusColumn' ? { statusAssignments: {} } : {}) })}>
        <option value="">{optional ? 'Not mapped' : 'Choose a column…'}</option>
        {parsed?.headers.map((header) => <option key={header} value={header}>{header}</option>)}
      </select>
    </label>
  }

  return <section className="panel import-panel" aria-labelledby="upload-heading">
    <div className="panel-heading">
      <div><p className="eyebrow">Your observations, your questions</p><h2 id="upload-heading">Upload and map a CSV</h2></div>
      <button className="button button-secondary" type="button" onClick={downloadTemplate}>Download example CSV</button>
    </div>
    <p>One independent subject per row, one event endpoint, ordinary right censoring. Choose the columns yourself; event codes are never guessed.</p>
    <p className="helper">UTF-8, comma-delimited CSV with a header · up to 2 MiB and {MAX_DATA_ROWS.toLocaleString()} data rows. Quoted fields and time-zero observations are supported.</p>
    <div className="control-grid">
      <label className="field"><span>Choose a CSV file</span><input ref={inputRef} type="file" accept=".csv,text/csv" onChange={selectFile} /></label>
      {filename && <div><span className="muted">Selected file</span><p>{filename}</p><button className="button button-secondary" type="button" onClick={clear}>Clear data</button></div>}
    </div>
    <p className="helper">Processing stays in this browser's memory. Records are not uploaded to a server, saved in URLs, or stored between sessions.</p>
    {reading && <p role="status">Reading CSV locally…</p>}
    <IssueList issues={fileIssues} />
    {parsed && <>
      <IssueList issues={parsed.issues} />
      {parsed.notices.map((notice) => <p className="notice notice-warning" key={notice}>{notice}</p>)}
      {parsed.issues.length === 0 && <>
        <h3>1. Preview and choose columns</h3>
        <p className="helper">{parsed.rows.length.toLocaleString()} records found. The first {Math.min(5, parsed.rows.length)} are shown with their original source line numbers. Unmapped columns are ignored.</p>
        <div className="table-scroll"><table className="data-table"><caption>CSV preview</caption><thead><tr><th scope="col">Source line</th>{parsed.headers.map((header) => <th scope="col" key={header}>{header}</th>)}</tr></thead><tbody>
          {parsed.rows.slice(0, 5).map((row) => <tr key={row.sourceRow}><th scope="row">{row.sourceRow}</th>{row.cells.map((cell, index) => <td key={index}>{cell || <span className="muted">(empty)</span>}</td>)}</tr>)}
        </tbody></table></div>
        <div className="control-grid">
          {renderColumn('Follow-up time', mapping.timeColumn, 'timeColumn')}
          {renderColumn('Event / censoring status', mapping.statusColumn, 'statusColumn')}
          {renderColumn('Group', mapping.groupColumn ?? '', 'groupColumn', true)}
          {renderColumn('Subject ID', mapping.idColumn ?? '', 'idColumn', true)}
          <label className="field"><span>Common time unit</span><input value={mapping.unit} placeholder="For example, days or months" onChange={(event) => changeMapping({ unit: event.target.value })} /></label>
        </div>
        {mapping.statusColumn && <>
          <h3>2. Define the status codes</h3>
          <p className="helper">Event means the endpoint happened at the recorded time. Censored means it had not been observed by that follow-up time. With a single status code, assign that code to either category; no absent code is required.</p>
          {statuses.length > 2 && <p className="notice notice-error">More than two status values were found. This tool does not support competing event types or automatic collapsing of endpoint codes.</p>}
          <div className="control-grid">{statuses.slice(0, 20).map((status) => <label className="field" key={status}>
            <span>Code {JSON.stringify(status)} means</span>
            <select value={Object.prototype.hasOwnProperty.call(mapping.statusAssignments, status) ? String(mapping.statusAssignments[status]) : ''} onChange={(event) => {
              const next = Object.assign(Object.create(null) as Record<string, 0 | 1>, mapping.statusAssignments)
              if (event.target.value === '') delete next[status]
              else next[status] = event.target.value === '1' ? 1 : 0
              changeMapping({ statusAssignments: next })
            }}>
              <option value="">Choose explicitly…</option><option value="1">Event (1)</option><option value="0">Censored (0)</option>
            </select>
          </label>)}</div>
        </>}
        <h3>3. Confirm the study structure</h3>
        <label className="field"><span><input type="checkbox" checked={mapping.designConfirmed} onChange={(event) => changeMapping({ designConfirmed: event.target.checked })} /> I confirm one independent subject per row, one event endpoint, ordinary right censoring, and a common time origin and unit.</span></label>
        <p className="helper">File checks cannot prove independent censoring or subject independence. Left truncation, interval censoring, competing risks, recurrent events, weights, and repeated subject records are outside the supported scope.</p>
        <button type="button" className="button button-secondary" onClick={() => setChecked(true)}>Validate mapping</button>
        {checked && report && <>
          <IssueList issues={report.issues} />
          {report.valid && <div className="notice" role="status"><strong>Ready to explore:</strong> {report.counts.rows.toLocaleString()} subjects · {report.counts.events.toLocaleString()} events · {report.counts.censored.toLocaleString()} censored{mapping.groupColumn ? ` · ${report.counts.groups} group${report.counts.groups === 1 ? '' : 's'}` : ''}.</div>}
          {report.warnings.map((warning) => <p className="notice notice-warning" key={warning}>{warning}</p>)}
          <button type="button" className="button button-primary" disabled={!report.valid} onClick={() => {
            if (!report.valid) return
            onDataset(report.subjects, filename, mapping.unit.trim())
            setLoaded(true)
          }}>Explore this dataset</button>
          {loaded && <p className="notice" role="status">Dataset loaded below. Use the exploration controls to inspect the full curves, a selected risk set, or a two-group comparison.</p>}
        </>}
      </>}
    </>}
  </section>
}
