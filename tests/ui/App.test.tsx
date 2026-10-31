// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import App from '../../src/App'

afterEach(() => cleanup())
beforeEach(() => window.history.replaceState(null, '', '#lesson'))

function chooseModule(name: RegExp) {
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Learning modules' })).getByRole('button', { name }))
}

function getCurve(svg: HTMLElement, series: string): string | null {
  const path = [...svg.querySelectorAll('path[data-series]')].find(p => p.getAttribute('data-series') === series)
  expect(path).toBeDefined()
  return path?.getAttribute('d') ?? null
}

describe('the linked survival-analysis learning workflow', () => {
  it('demonstrates an event and censoring, then checks a hand-worked tied-time prediction', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Follow the calculation' })).toBeInTheDocument()
    const selector = screen.getByLabelText('Selected observation time')
    expect(selector).toHaveValue('0')

    fireEvent.click(screen.getByRole('button', { name: /^Next/ }))
    expect(selector).toHaveValue('1')
    expect(screen.getByText(/Only censoring occurs here: the estimate stays unchanged/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^Next/ }))
    expect(selector).toHaveValue('2')
    expect(screen.getByRole('heading', { name: 'Predict the next update' })).toBeInTheDocument()
    expect(screen.getByText(/The curve stops at the previous worked update/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('At risk Y'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Events d'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('New survival Ŝ'), { target: { value: '7/12' } })
    fireEvent.click(screen.getByRole('button', { name: /Check answers/ }))
    expect(screen.getByLabelText('At risk Y')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Events d')).not.toHaveAttribute('aria-invalid')
    expect(screen.getByText(/Review the marked fields/)).toBeInTheDocument()

    // Independent eight-person hand calculation: Y=6, d=2, S=(7/8)*(1-2/6)=7/12.
    fireEvent.change(screen.getByLabelText('At risk Y'), { target: { value: '6' } })
    fireEvent.click(screen.getByRole('button', { name: /Check answers/ }))
    expect(screen.getByRole('heading', { name: 'You found the next step' })).toBeInTheDocument()
    expect(screen.getByText(/Correct. The timelines, table, and curve now show your update/)).toBeInTheDocument()
    const trace = screen.getByRole('table', { name: /Kaplan-Meier calculation at each observation time/ })
    const time3 = within(trace).getByRole('button', { name: 'Inspect time 3' }).closest('tr')!
    expect(within(time3).getByText('6')).toBeInTheDocument()
    expect(within(time3).getByText('2')).toBeInTheDocument()
    expect(within(time3).getByText('0.5833')).toBeInTheDocument()
    expect(screen.queryByText(/The curve stops at the previous worked update/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Reset lesson/ }))
    expect(selector).toHaveValue('0')
    fireEvent.change(selector, { target: { value: '2' } })
    expect(screen.getByLabelText('At risk Y')).toHaveValue('')
    expect(screen.getByLabelText('New survival Ŝ')).toHaveValue('')
  })

  it('keeps each practice row masked until that row alone is solved or explicitly revealed', () => {
    render(<App />)
    const trace = screen.getByRole('table', { name: /Kaplan-Meier calculation at each observation time/ })
    const cellsAt = (time: number) => within(within(trace).getByRole('button', { name: `Inspect time ${time}` }).closest('tr')!).getAllByRole('cell').slice(1).map(cell => cell.textContent)
    const masked = ['·', '·', '·', '·', 'Predict first']
    // The two demonstration rows are available; none of the four practice rows leaks an answer.
    expect(cellsAt(1)).toEqual(['8', '1', '0', '0.8750', '0.8750'])
    expect(cellsAt(2)).toEqual(['7', '0', '1', '1', '0.8750'])
    for (const time of [3, 5, 6, 7]) expect(cellsAt(time)).toEqual(masked)

    // Skipping to the end must not reveal the intervening practice calculations or curve.
    fireEvent.change(screen.getByLabelText('Selected observation time'), { target: { value: '5' } })
    for (const time of [3, 5, 6, 7]) expect(cellsAt(time)).toEqual(masked)
    const plot = screen.getByRole('img', { name: 'Kaplan-Meier survival curve for the eight-subject lesson' })
    const initialPrefix = getCurve(plot, 'lesson')
    fireEvent.click(screen.getByRole('button', { name: 'Show worked answer' }))
    expect(cellsAt(7)).toEqual(['1', '1', '0', '0', '0'])
    for (const time of [3, 5, 6]) expect(cellsAt(time)).toEqual(masked)
    expect(getCurve(plot, 'lesson')).toBe(initialPrefix)
    expect(screen.getByText(/The curve shows the worked prefix through t = 2/)).toBeInTheDocument()

    // Returning to an already-revealed demonstration does not expose practice answers.
    fireEvent.change(screen.getByLabelText('Selected observation time'), { target: { value: '0' } })
    for (const time of [3, 5, 6]) expect(cellsAt(time)).toEqual(masked)
    expect(cellsAt(7)).toEqual(['1', '1', '0', '0', '0'])

    // Solving time 3 reveals precisely that row, leaving times 5 and 6 protected.
    fireEvent.change(screen.getByLabelText('Selected observation time'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('At risk Y'), { target: { value: '6' } })
    fireEvent.change(screen.getByLabelText('Events d'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('New survival Ŝ'), { target: { value: '7/12' } })
    fireEvent.click(screen.getByRole('button', { name: /Check answers/ }))
    expect(cellsAt(3)).toEqual(['6', '2', '1', '0.6667', '0.5833'])
    for (const time of [5, 6]) expect(cellsAt(time)).toEqual(masked)
    expect(cellsAt(7)).toEqual(['1', '1', '0', '0', '0'])
    fireEvent.click(screen.getByRole('button', { name: /Reset lesson/ }))
    for (const time of [3, 5, 6, 7]) expect(cellsAt(time)).toEqual(masked)
  })

  it('offers a hint and worked answer without permanently blocking lesson navigation', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('Selected observation time'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Need a hint?' }))
    expect(screen.getByText(/Everyone with follow-up time ≥ 3/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show worked answer' }))
    expect(screen.queryByText(/The curve stops at the previous worked update/)).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Selected observation time'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Show worked answer' }))
    fireEvent.click(screen.getByLabelText('95% pointwise CI'))
    expect(screen.getByText(/At a terminal zero, the log-log confidence bounds are unavailable/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Previous/ })).not.toBeDisabled()
  })

  it('uses the shared risk-set trace for Nelson-Aalen and distinguishes its survival transformation', () => {
    render(<App />)
    chooseModule(/Nelson–Aalen/)
    expect(screen.getByRole('heading', { name: 'Add risk. Understand survival.' })).toBeInTheDocument()
    const trace = screen.getByRole('table', { name: /Nelson-Aalen calculation at each observation time/ })
    const time3 = within(trace).getByRole('button', { name: 'Inspect time 3' })
    fireEvent.click(time3)
    expect(screen.getByLabelText('Selected observation time')).toHaveValue('2')
    expect(within(time3.closest('tr')!).getByText('0.4583')).toBeInTheDocument()
    expect(within(trace).getByText('1.7917')).toBeInTheDocument() // 43/24, not -log(terminal KM).
    fireEvent.click(screen.getByLabelText('Compare KM with exp(−NA)'))
    expect(screen.getByRole('img', { name: 'Kaplan-Meier compared with exponential of negative Nelson-Aalen' })).toBeInTheDocument()
    expect(screen.getByText('exp(−Nelson–Aalen)')).toBeInTheDocument()
    expect(screen.getByText(/KM reaches 0 while NA remains finite/)).toBeInTheDocument()
  })

  it('shows the R-verified log-rank result and preserves it when group selections are reversed', () => {
    render(<App />)
    chooseModule(/Compare groups/)
    expect(screen.getByText('0.0318')).toBeInTheDocument() // Q=5/157.
    expect(screen.getByText('0.8584')).toBeInTheDocument()
    const first = screen.getByLabelText('Compare group')
    const second = screen.getByLabelText('With group')
    fireEvent.change(first, { target: { value: 'B' } })
    expect(screen.queryByText('0.8584')).not.toBeInTheDocument()
    fireEvent.change(second, { target: { value: 'A' } })
    expect(screen.getByText('0.8584')).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Two-group log-rank calculation' })
    expect(within(table).getByRole('columnheader', { name: 'Observed A' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'Observed B' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'Expected A' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'Expected B' })).toBeInTheDocument()
    fireEvent.click(within(table).getByRole('button', { name: '7' }))
    expect(screen.getByText('Expected events in A:')).toBeInTheDocument()
    const terminal = within(table).getByRole('button', { name: '7' }).closest('tr')!
    expect(within(terminal).getAllByText('0')).toHaveLength(4) // A risk, A observed, A expected, zero variance.
    expect(screen.getByText(/does not establish a causal effect/)).toBeInTheDocument()
  })

  it('changes observed censoring while preserving the complete-event reference, and exposes reproducible controls', () => {
    render(<App />)
    chooseModule(/Censoring lab/)
    expect(screen.getByRole('heading', { name: 'Change what you can observe.' })).toBeInTheDocument()
    const graph = screen.getByRole('img', { name: 'Observed censored versus complete-event empirical survival' })
    const beforeComplete = getCurve(graph, 'Complete event data')
    const beforeObserved = getCurve(graph, 'Observed, with censoring')
    fireEvent.change(screen.getByLabelText(/Dropout rate γ/), { target: { value: '0' } })
    expect(getCurve(graph, 'Complete event data')).toBe(beforeComplete)
    expect(getCurve(graph, 'Observed, with censoring')).not.toBe(beforeObserved)
    expect(screen.getByLabelText(/Dropout rate γ/)).toHaveValue('0')

    fireEvent.change(screen.getByLabelText('Sample size'), { target: { value: '250' } })
    expect(screen.getByLabelText('Sample size')).toHaveValue(250)
    expect(within(screen.getByRole('region', { name: 'Simulation cohort summary' })).getByText('/ 250')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Hazard shape'), { target: { value: '0.6' } })
    expect(screen.getByText(/Instantaneous risk decreases over time/)).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Show generating population truth'))
    expect(screen.getByText('Generating population S(t)')).toBeInTheDocument()
    expect(screen.getByText('Generating population H(t)')).toBeInTheDocument()
    const seed = screen.getByLabelText('Random seed')
    expect(seed).toHaveValue(6152026)
    fireEvent.click(screen.getByRole('button', { name: /Generate new sample/ }))
    expect(seed).toHaveValue(6152027)
  })

  it('imports renamed columns and keeps every two-of-many comparison on the selected subset', async () => {
    render(<App />)
    chooseModule(/Your own data/)
    const csv = 'subject,days,outcome,arm\np1,1,event,A\np2,4,censored,A\np3,2,event,B\np4,5,event,B\np5,0.5,event,C\np6,7,censored,C\n'
    const file = new File([csv], 'three-groups.csv', { type: 'text/csv' })
    const bytes = new TextEncoder().encode(csv)
    Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) })
    fireEvent.change(screen.getByLabelText('Choose a CSV file'), { target: { files: [file] } })
    await screen.findByRole('heading', { name: '1. Preview and choose columns' })
    fireEvent.change(screen.getByLabelText('Follow-up time'), { target: { value: 'days' } })
    fireEvent.change(screen.getByLabelText('Event / censoring status'), { target: { value: 'outcome' } })
    fireEvent.change(screen.getByLabelText('Group (optional)'), { target: { value: 'arm' } })
    fireEvent.change(screen.getByLabelText('Subject ID (optional)'), { target: { value: 'subject' } })
    fireEvent.change(screen.getByLabelText('Code "event" means'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Code "censored" means'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Common time unit'), { target: { value: 'days' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm one independent subject/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Validate mapping' }))
    fireEvent.click(screen.getByRole('button', { name: 'Explore this dataset' }))
    expect(screen.getByRole('heading', { name: 'Pooled Kaplan–Meier survival' })).toBeInTheDocument()
    expect(screen.queryByLabelText('At risk Y')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Compare two groups' }))
    expect(screen.getByLabelText('Compare group')).toHaveValue('')
    expect(screen.getByLabelText('With group')).toHaveValue('')
    expect(screen.queryByRole('table', { name: 'Two-group log-rank calculation' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Compare group'), { target: { value: 'A' } })
    fireEvent.change(screen.getByLabelText('With group'), { target: { value: 'B' } })
    expect(screen.getByText((_text, element) => element?.tagName === 'P' && /4 included · 2 excluded/.test(element.textContent ?? ''))).toBeInTheDocument()
    // Independent hand calculation for A/B only: U=1/6, V=17/36, Q=1/17.
    // R pchisq(1/17, 1, lower.tail=FALSE) = 0.8083652.
    expect(screen.getByText('0.0588')).toBeInTheDocument()
    expect(screen.getByText('0.8084')).toBeInTheDocument()
    const logrank = screen.getByRole('table', { name: 'Two-group log-rank calculation' })
    expect(within(logrank).queryByRole('button', { name: '0.5' })).not.toBeInTheDocument()
    expect(within(logrank).queryByRole('button', { name: '7' })).not.toBeInTheDocument()
    const groupPlot = screen.getByRole('img', { name: 'Kaplan-Meier curves for the selected two groups' })
    expect(getCurve(groupPlot, 'Group A')).not.toBeNull()
    expect(getCurve(groupPlot, 'Group B')).not.toBeNull()
    expect(groupPlot.querySelector('[data-series="Group C"]')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Clear data' }))
    expect(screen.queryByRole('table', { name: 'Two-group log-rank calculation' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'three-groups.csv' })).not.toBeInTheDocument()
  })

  it('links to numerical notices under the configured static deployment base', () => {
    render(<App />)
    const notices = screen.getByRole('link', { name: 'Numerical source notices' })
    expect(notices).toHaveAttribute('href', './NUMERICS.md')
    const deployedPage = 'https://boqian-dot.github.io/Boqian_Mao_BIOSTAT615_Survival_Project/#lesson'
    expect(new URL(notices.getAttribute('href')!, deployedPage).pathname).toBe('/Boqian_Mao_BIOSTAT615_Survival_Project/NUMERICS.md')
    chooseModule(/Your own data/)
    expect(screen.getByRole('heading', { name: 'Upload and map a CSV' })).toBeInTheDocument()
    expect(screen.getByText(/Records are not uploaded to a server/)).toBeInTheDocument()
  })
})
