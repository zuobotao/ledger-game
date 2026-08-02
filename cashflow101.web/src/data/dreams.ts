import type { Dream } from '@/types/game'

export const DREAMS: Dream[] = [
  {
    id: 'world-travel',
    name: '环球旅行',
    description: '带着家人环游世界，体验不同文化。',
    price: 50000,
    icon: 'plane',
  },
  {
    id: 'beach-house',
    name: '海边别墅',
    description: '拥有一座面朝大海的度假别墅。',
    price: 120000,
    icon: 'home',
  },
  {
    id: 'supercar',
    name: '梦想跑车',
    description: '驾驶一辆梦寐以求的跑车。',
    price: 200000,
    icon: 'car',
  },
  {
    id: 'charity-foundation',
    name: '慈善基金',
    description: '成立自己的慈善基金会，回馈社会。',
    price: 350000,
    icon: 'heart-handshake',
  },
  {
    id: 'private-island',
    name: '私人岛屿',
    description: '在私人岛屿上享受宁静与自由。',
    price: 500000,
    icon: 'island',
  },
  {
    id: 'space-travel',
    name: '太空旅行',
    description: '乘坐私人飞船俯瞰地球。',
    price: 1000000,
    icon: 'rocket',
  },
]

export function getRandomDream(): Dream {
  return DREAMS[Math.floor(Math.random() * DREAMS.length)] as Dream
}
