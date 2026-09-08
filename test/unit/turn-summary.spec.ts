import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import TurnSummary from '@/components/TurnSummary.vue'

describe('TurnSummary 落点文案', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it.each([
    ['story', '故事卡（历史故事）'],
    ['opportunity', '投资机会'],
    ['market', '市场事件'],
    ['other', '其他事件'],
    ['unknown', '其他事件'],
  ])('将 %s 落点转换为中文文案', async (cellType, label) => {
    const store = useGameStore()
    store.startGame(
      { playerCount: 1, insurance: false, bigFamily: false, mortgage: false, fastStart: false, ageLimit: true },
      [{ name: 'TestPlayer', careerId: 'engineer', colorId: 'red', isAI: false }],
    )
    store.turnInfo.cellType = cellType
    store.endTurnWithSummary()

    const wrapper = mount(TurnSummary, { attachTo: document.body })
    await nextTick()

    expect(document.body.textContent).toContain(`落点${label}`)
    wrapper.unmount()
  })
})
