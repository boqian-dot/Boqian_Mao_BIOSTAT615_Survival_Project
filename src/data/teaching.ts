import type { Subject } from '../stats/types'

/** Verified against R 4.4.2 / survival 3.8.6; see reference/generate_fixtures.R. */
export const TEACHING_DATA: Subject[] = [
  { id: '1', time: 1, event: 1, group: 'A' },
  { id: '2', time: 2, event: 0, group: 'B' },
  { id: '3', time: 3, event: 1, group: 'A' },
  { id: '4', time: 3, event: 1, group: 'B' },
  { id: '5', time: 3, event: 0, group: 'A' },
  { id: '6', time: 5, event: 1, group: 'B' },
  { id: '7', time: 6, event: 0, group: 'A' },
  { id: '8', time: 7, event: 1, group: 'B' },
]
