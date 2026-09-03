import { describe, expect, it } from 'vitest'
import {
  createDecks,
  drawOpportunityCard,
  drawSmallOpportunityCard,
  drawBigOpportunityCard,
  drawMarketCard,
  drawDoodadCard,
  drawStoryCard,
} from '@/data/cards'

describe('Card Decks', () => {
  it('should create all deck types', () => {
    const decks = createDecks()
    expect(decks.opportunity.length).toBeGreaterThan(0)
    expect(decks.smallOpportunity.length).toBeGreaterThan(0)
    expect(decks.bigOpportunity.length).toBeGreaterThan(0)
    expect(decks.market.length).toBeGreaterThan(0)
    expect(decks.doodad.length).toBeGreaterThan(0)
    expect(decks.fastTrackOpportunity.length).toBeGreaterThan(0)
    expect(decks.story.length).toBeGreaterThan(0)
  })

  it('should draw a card and reduce deck size', () => {
    const decks = createDecks()
    const initialLength = decks.opportunity.length
    const { card, remaining } = drawOpportunityCard(decks.opportunity)
    expect(card).toBeDefined()
    expect(remaining.length).toBe(initialLength - 1)
  })

  it('should reshuffle when opportunity deck is empty', () => {
    const { card, remaining } = drawOpportunityCard([])
    expect(card).toBeDefined()
    expect(remaining.length).toBeGreaterThan(0)
  })

  it('should draw small opportunity cards only', () => {
    const decks = createDecks()
    const { card } = drawSmallOpportunityCard(decks.smallOpportunity)
    expect(card.size).toBe('small')
  })

  it('should draw big opportunity cards only', () => {
    const decks = createDecks()
    const { card } = drawBigOpportunityCard(decks.bigOpportunity)
    expect(card.size).toBe('big')
  })

  it('should draw market cards', () => {
    const decks = createDecks()
    const { card, remaining } = drawMarketCard(decks.market)
    expect(card).toBeDefined()
    expect(remaining.length).toBe(decks.market.length - 1)
  })

  it('should draw doodad cards', () => {
    const decks = createDecks()
    const { card, remaining } = drawDoodadCard(decks.doodad)
    expect(card).toBeDefined()
    expect(remaining.length).toBe(decks.doodad.length - 1)
  })

  it('should draw story cards', () => {
    const decks = createDecks()
    const { card, remaining } = drawStoryCard(decks.story)
    expect(card).toBeDefined()
    expect(remaining.length).toBe(decks.story.length - 1)
  })
})
