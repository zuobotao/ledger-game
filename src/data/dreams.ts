import type { Dream } from '@/types/game'
import { defaultRandom } from '@/engine/randomSource'

export const DREAMS: Dream[] = [
  // 生活类 lifestyle
  {
    id: 'world-travel',
    name: '环球旅行',
    description: '带着家人环游世界，体验不同文化。',
    price: 50000,
    icon: 'plane',
    category: 'lifestyle',
    story: '你用财富换来了一段难忘的环球之旅。从巴黎铁塔到东京樱花，从埃及金字塔到巴西狂欢节，每一站都成为生命中最珍贵的回忆。',
  },
  {
    id: 'beach-house',
    name: '海边别墅',
    description: '拥有一座面朝大海的度假别墅。',
    price: 120000,
    icon: 'home',
    category: 'lifestyle',
    story: '推开窗就是蔚蓝大海，听着海浪声入睡。周末的午后，在露台上品一杯红酒，看日落缓缓沉入海平面。',
  },
  {
    id: 'supercar',
    name: '梦想跑车',
    description: '驾驶一辆梦寐以求的跑车。',
    price: 200000,
    icon: 'car',
    category: 'lifestyle',
    story: '引擎的轰鸣声是自由的旋律。你终于拥有了那辆少年时贴在墙上的跑车，每一次加速都是心跳的证明。',
  },
  {
    id: 'private-jet',
    name: '私人飞机',
    description: '拥有自己的私人飞机，随时出发。',
    price: 300000,
    icon: 'plane',
    category: 'lifestyle',
    story: '不再需要排队候机，不再受航班时间限制。你的私人飞机随时待命，说走就走的旅行不再是梦想。',
  },
  {
    id: 'luxury-yacht',
    name: '豪华游艇',
    description: '驾驶豪华游艇畅游碧海蓝天。',
    price: 400000,
    icon: 'ship',
    category: 'lifestyle',
    story: '你买下了一艘豪华游艇，在爱琴海上抛锚，跃入清澈的海水中畅游。夕阳西下时，在甲板上享用海鲜大餐。',
  },

  // 慈善类 charity
  {
    id: 'charity-foundation',
    name: '慈善基金',
    description: '成立自己的慈善基金会，回馈社会。',
    price: 350000,
    icon: 'heart-handshake',
    category: 'charity',
    story: '你成立了以自己名字命名的慈善基金会。每年帮助成千上万的贫困儿童获得教育机会，改变他们的命运。',
  },
  {
    id: 'hope-school',
    name: '建希望小学',
    description: '在山区捐建希望小学。',
    price: 150000,
    icon: 'graduation-cap',
    category: 'charity',
    story: '你在偏远山区捐建了一所希望小学。看到孩子们背着新书包走进明亮的教室，你知道这是最有价值的投资。',
  },

  // 投资类 investment
  {
    id: 'private-island',
    name: '私人岛屿',
    description: '在私人岛屿上享受宁静与自由。',
    price: 500000,
    icon: 'palmtree',
    category: 'investment',
    story: '你买下了一座属于自己的私人岛屿。椰林树影，白沙碧水，这里是只属于你的世外桃源。',
  },
  {
    id: 'space-travel',
    name: '太空旅行',
    description: '乘坐私人飞船俯瞰地球。',
    price: 1000000,
    icon: 'rocket',
    category: 'investment',
    story: '你成为了少数有幸进入太空的普通人之一。从太空中回望蓝色星球，所有的烦恼都变得渺小而微不足道。',
  },

  // 事业类 career
  {
    id: 'tech-startup',
    name: '创办科技公司',
    description: '创办一家改变世界的科技公司。',
    price: 250000,
    icon: 'lightbulb',
    category: 'career',
    story: '你创办了自己的科技公司，从一个想法开始，一步步将它变成现实。公司的每一次成长，都是你能力的证明。',
  },
  {
    id: 'hotel-chain',
    name: '收购连锁酒店',
    description: '收购一家连锁酒店品牌。',
    price: 800000,
    icon: 'building',
    category: 'career',
    story: '你成功收购了一家知名连锁酒店品牌。从投资人到实业家，你的商业版图在不断扩张。',
  },

  // 家庭类 family
  {
    id: 'family-immigration',
    name: '全家移民',
    description: '带着全家移民到理想的国度。',
    price: 300000,
    icon: 'globe',
    category: 'family',
    story: '你带着全家移民到了一直向往的国家。孩子们在更好的环境中成长，一家人在新的土地上开始了全新的生活。',
  },
  {
    id: 'ivy-fund',
    name: '子女藤校基金',
    description: '为子女设立藤校教育基金。',
    price: 400000,
    icon: 'graduation-cap',
    category: 'family',
    story: '你为孩子们设立了常青藤教育基金。他们可以毫无经济压力地追求最好的教育，去实现自己的人生梦想。',
  },

  // 艺术类
  {
    id: 'art-collection',
    name: '私人艺术收藏',
    description: '建立世界级的私人艺术收藏。',
    price: 600000,
    icon: 'palette',
    category: 'investment',
    story: '你的私人艺术收藏足以媲美小型博物馆。从莫奈到毕加索，每一幅作品都是人类文明的璀璨明珠。',
  },

  // 自由类 freedom
  {
    id: 'fire-retire',
    name: '提前退休（FIRE）',
    description: '实现财务自由，提前退休享受人生。',
    price: 200000,
    icon: 'sunset',
    category: 'freedom',
    story: '你实现了 FIRE（财务自由，提前退休）。不再为五斗米折腰，每一天都可以做自己真正热爱的事情。',
  },
]

export function getRandomDream(): Dream {
  return defaultRandom.pick(DREAMS)
}

export function getDreamById(id: string): Dream | undefined {
  return DREAMS.find((d) => d.id === id)
}

export function getDreamsByCategory(category: Dream['category']): Dream[] {
  return DREAMS.filter((d) => d.category === category)
}
