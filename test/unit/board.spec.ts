import { describe, expect, it } from 'vitest'
import { RAT_RACE_CELLS, FAST_TRACK_CELLS, getRatRaceCell, getFastTrackCell } from '@/data/board'

describe('Board Data', () => {
  it('rat race board should have 24 cells', () => {
    expect(RAT_RACE_CELLS.length).toBe(24)
  })

  it('rat race board should have required cell types', () => {
    const types = RAT_RACE_CELLS.map((cell) => cell.type)
    expect(types).toContain('payday')
    expect(types).toContain('small_opportunity')
    expect(types).toContain('big_opportunity')
    expect(types).toContain('market')
    expect(types).toContain('doodad')
    expect(types).toContain('charity')
  })

  it('rat race board cells should have unique indices', () => {
    const indices = RAT_RACE_CELLS.map((cell) => cell.index)
    expect(new Set(indices).size).toBe(indices.length)
  })

  it('fast track board should have 24 cells', () => {
    expect(FAST_TRACK_CELLS.length).toBe(24)
  })

  it('getRatRaceCell should wrap around', () => {
    expect(getRatRaceCell(0).index).toBe(0)
    expect(getRatRaceCell(24).index).toBe(0)
    expect(getRatRaceCell(25).index).toBe(1)
  })

  it('getFastTrackCell should wrap around', () => {
    expect(getFastTrackCell(0).index).toBe(0)
    expect(getFastTrackCell(24).index).toBe(0)
    expect(getFastTrackCell(25).index).toBe(1)
  })
})
