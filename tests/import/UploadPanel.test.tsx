// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UploadPanel from '../../src/components/UploadPanel'

function csvFile(text: string, name = 'observations.csv'): File {
  const file = new File([text], name, { type: 'text/csv' })
  // jsdom File does not expose arrayBuffer in every supported release.
  const bytes = new TextEncoder().encode(text)
  Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) })
  return file
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('CSV upload interaction', () => {
  it('requires explicit renamed-column and 1/2 coding choices, then delivers all records locally', async () => {
    const user = userEvent.setup()
    const onDataset = vi.fn()
    const onClear = vi.fn()
    const network = vi.fn()
    vi.stubGlobal('fetch', network)
    render(<UploadPanel onDataset={onDataset} onClear={onClear} />)
    await user.upload(screen.getByLabelText('Choose a CSV file'), csvFile('person,days,status,arm,notes\np1,0,2,A,"hello, world"\np2,5,1,B,plain\np3,8,2,C,plain\n', 'renamed.csv'))
    await screen.findByRole('heading', { name: '1. Preview and choose columns' })
    expect(screen.getByLabelText('Follow-up time')).toHaveValue('')
    expect(screen.getByLabelText('Event / censoring status')).toHaveValue('')
    await user.selectOptions(screen.getByLabelText('Follow-up time'), 'days')
    await user.selectOptions(screen.getByLabelText('Event / censoring status'), 'status')
    await user.selectOptions(screen.getByLabelText('Group (optional)'), 'arm')
    await user.selectOptions(screen.getByLabelText('Subject ID (optional)'), 'person')
    expect(screen.getByLabelText('Code "1" means')).toHaveValue('')
    expect(screen.getByLabelText('Code "2" means')).toHaveValue('')
    await user.click(screen.getByRole('button', { name: 'Validate mapping' }))
    expect(screen.getByRole('button', { name: 'Explore this dataset' })).toBeDisabled()
    expect(onDataset).not.toHaveBeenCalled()
    await user.selectOptions(screen.getByLabelText('Code "1" means'), '0')
    await user.selectOptions(screen.getByLabelText('Code "2" means'), '1')
    await user.type(screen.getByLabelText('Common time unit'), 'days')
    await user.click(screen.getByRole('checkbox', { name: /I confirm one independent subject/ }))
    expect(screen.getByText(/3 groups are present/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Explore this dataset' }))
    expect(onDataset).toHaveBeenCalledTimes(1)
    expect(onDataset).toHaveBeenCalledWith([
      { id: 'p1', time: 0, event: 1, group: 'A', sourceRow: 2 },
      { id: 'p2', time: 5, event: 0, group: 'B', sourceRow: 3 },
      { id: 'p3', time: 8, event: 1, group: 'C', sourceRow: 4 },
    ], 'renamed.csv', 'days')
    expect(network).not.toHaveBeenCalled()
    const clearCalls = onClear.mock.calls.length
    await user.selectOptions(screen.getByLabelText('Group (optional)'), '')
    expect(onClear).toHaveBeenCalledTimes(clearCalls + 1)
    expect(screen.queryByText(/Dataset loaded below/)).not.toBeInTheDocument()
  })

  it('accepts a single observed status as censored without requesting an absent event code', async () => {
    const user = userEvent.setup()
    const onDataset = vi.fn()
    render(<UploadPanel onDataset={onDataset} />)
    await user.upload(screen.getByLabelText('Choose a CSV file'), csvFile('time,status\n2,unknown\n4,unknown\n'))
    await screen.findByRole('heading', { name: '1. Preview and choose columns' })
    await user.selectOptions(screen.getByLabelText('Follow-up time'), 'time')
    await user.selectOptions(screen.getByLabelText('Event / censoring status'), 'status')
    await user.selectOptions(screen.getByLabelText('Code "unknown" means'), '0')
    await user.type(screen.getByLabelText('Common time unit'), 'months')
    await user.click(screen.getByRole('checkbox', { name: /I confirm one independent subject/ }))
    await user.click(screen.getByRole('button', { name: 'Validate mapping' }))
    expect(screen.getByText(/All observations are censored/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Explore this dataset' }))
    expect(onDataset).toHaveBeenCalledWith([
      { id: 'row-2', time: 2, event: 0, sourceRow: 2 },
      { id: 'row-3', time: 4, event: 0, sourceRow: 3 },
    ], 'observations.csv', 'months')
  })

  it('blocks a partial analysis on invalid rows and clears the local file and mapping', async () => {
    const user = userEvent.setup()
    const onDataset = vi.fn()
    const onClear = vi.fn()
    render(<UploadPanel onDataset={onDataset} onClear={onClear} />)
    await user.upload(screen.getByLabelText('Choose a CSV file'), csvFile('time,status\n2,1\n-1,1\n'))
    await screen.findByRole('heading', { name: '1. Preview and choose columns' })
    await user.selectOptions(screen.getByLabelText('Follow-up time'), 'time')
    await user.selectOptions(screen.getByLabelText('Event / censoring status'), 'status')
    await user.selectOptions(screen.getByLabelText('Code "1" means'), '1')
    await user.type(screen.getByLabelText('Common time unit'), 'days')
    await user.click(screen.getByRole('checkbox', { name: /I confirm one independent subject/ }))
    await user.click(screen.getByRole('button', { name: 'Validate mapping' }))
    expect(screen.getByText('Source line 3:')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Explore this dataset' })).toBeDisabled()
    expect(onDataset).not.toHaveBeenCalled()
    const previousClearCalls = onClear.mock.calls.length
    await user.click(screen.getByRole('button', { name: 'Clear data' }))
    expect(onClear).toHaveBeenCalledTimes(previousClearCalls + 1)
    expect(screen.queryByRole('heading', { name: '1. Preview and choose columns' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Choose a CSV file')).toHaveValue('')
  })
})
