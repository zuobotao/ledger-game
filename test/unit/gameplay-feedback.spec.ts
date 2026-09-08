import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { createSingleGameplayAdapter } from '@/gameplay/adapters/singleGameplayAdapter'
import GameBoardSection from '@/gameplay/components/GameBoardSection.vue'

vi.hoisted(() => {
  if (typeof window !== 'undefined' && !window.matchMedia) {
    window.matchMedia = (() => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })) as typeof window.matchMedia
  }
})

describe('shared gameplay feedback', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('renders a pending message once instead of duplicating the outer and inner copy', async () => {
    const store = useGameStore()
    store.startGame(
      { playerCount: 1, insurance: false, bigFamily: false, mortgage: false, fastStart: false, ageLimit: true },
      [{ name: 'TestPlayer', careerId: 'engineer', colorId: 'red', isAI: false }],
    )
    const message = '裁员：你失去了工作，将跳过 1 个回合的工资。'
    store.setPending('layoff', message)
    store.turnStatus = 'resolving'
    const adapter = createSingleGameplayAdapter(store)

    const wrapper = mount(GameBoardSection, {
      props: { adapter, boardKind: 'rat_race' },
      global: {
        stubs: {
          RatRaceBoard: { template: '<div />' },
          FastTrackBoard: { template: '<div />' },
          MobileBoardScroller: { template: '<div><slot /></div>' },
        },
      },
    })
    await nextTick()

    expect(wrapper.text().match(new RegExp(message, 'g'))).toHaveLength(1)
    wrapper.unmount()
  })
})
