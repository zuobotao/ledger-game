import type { CardDeck, DoodadCard, MarketEventCard, OpportunityCard, StoryCard } from '@/types/game'
import { STORY_CARDS } from './storyCards'

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

export function createDecks(): CardDeck {
  return {
    opportunity: shuffle(OPPORTUNITY_CARDS),
    market: shuffle(MARKET_CARDS),
    doodad: shuffle(DOODAD_CARDS),
    fastTrackOpportunity: shuffle(FAST_TRACK_OPPORTUNITY_CARDS),
    story: shuffle(STORY_CARDS),
  }
}

export function drawOpportunityCard(deck: OpportunityCard[]): {
  card: OpportunityCard
  remaining: OpportunityCard[]
} {
  if (deck.length === 0) {
    const fresh = shuffle(OPPORTUNITY_CARDS)
    return { card: fresh[0]!, remaining: fresh.slice(1) }
  }
  return { card: deck[0]!, remaining: deck.slice(1) }
}

export function drawMarketCard(deck: MarketEventCard[]): {
  card: MarketEventCard
  remaining: MarketEventCard[]
} {
  if (deck.length === 0) {
    const fresh = shuffle(MARKET_CARDS)
    return { card: fresh[0]!, remaining: fresh.slice(1) }
  }
  return { card: deck[0]!, remaining: deck.slice(1) }
}

export function drawDoodadCard(deck: DoodadCard[]): { card: DoodadCard; remaining: DoodadCard[] } {
  if (deck.length === 0) {
    const fresh = shuffle(DOODAD_CARDS)
    return { card: fresh[0]!, remaining: fresh.slice(1) }
  }
  return { card: deck[0]!, remaining: deck.slice(1) }
}

export function drawStoryCard(deck: StoryCard[]): { card: StoryCard; remaining: StoryCard[] } {
  if (deck.length === 0) {
    const fresh = shuffle(STORY_CARDS)
    return { card: fresh[0]!, remaining: fresh.slice(1) }
  }
  return { card: deck[0]!, remaining: deck.slice(1) }
}

export const OPPORTUNITY_CARDS: OpportunityCard[] = [
  // 小机会 - 股票（每种股票4个价位，共20张）
  // ON2U
  {
    id: 'stock-on2u-5',
    size: 'small',
    type: 'stock',
    title: 'ON2U 股票 · $5 买入机会',
    description: '每股价格 $5，可低价买入，等待市场上涨后卖出获利。',
    cost: 5,
    cashFlow: 0,
    symbol: 'ON2U',
    maxQuantity: 5000,
    action: 'buy',
  },
  {
    id: 'stock-on2u-10',
    size: 'small',
    type: 'stock',
    title: 'ON2U 股票 · $10 买入机会',
    description: '每股价格 $10，可低价买入，等待市场上涨后卖出获利。',
    cost: 10,
    cashFlow: 0,
    symbol: 'ON2U',
    maxQuantity: 5000,
    action: 'buy',
  },
  {
    id: 'stock-on2u-20',
    size: 'small',
    type: 'stock',
    title: 'ON2U 股票 · $20 卖出机会',
    description: '每股价格 $20，有持仓可以卖出获利了结。',
    cost: 20,
    cashFlow: 0,
    symbol: 'ON2U',
    action: 'sell',
  },
  {
    id: 'stock-on2u-30',
    size: 'small',
    type: 'stock',
    title: 'ON2U 股票 · $30 卖出机会',
    description: '每股价格 $30，有持仓可以卖出获利了结。',
    cost: 30,
    cashFlow: 0,
    symbol: 'ON2U',
    action: 'sell',
  },
  // MYT4U
  {
    id: 'stock-myt4u-10',
    size: 'small',
    type: 'stock',
    title: 'MYT4U 股票 · $10 买入机会',
    description: '每股价格 $10，可低价买入，等待市场上涨后卖出获利。',
    cost: 10,
    cashFlow: 0,
    symbol: 'MYT4U',
    maxQuantity: 5000,
    action: 'buy',
  },
  {
    id: 'stock-myt4u-20',
    size: 'small',
    type: 'stock',
    title: 'MYT4U 股票 · $20 买入机会',
    description: '每股价格 $20，可低价买入，等待市场上涨后卖出获利。',
    cost: 20,
    cashFlow: 0,
    symbol: 'MYT4U',
    maxQuantity: 2000,
    action: 'buy',
  },
  {
    id: 'stock-myt4u-30',
    size: 'small',
    type: 'stock',
    title: 'MYT4U 股票 · $30 卖出机会',
    description: '每股价格 $30，有持仓可以卖出获利了结。',
    cost: 30,
    cashFlow: 0,
    symbol: 'MYT4U',
    action: 'sell',
  },
  {
    id: 'stock-myt4u-40',
    size: 'small',
    type: 'stock',
    title: 'MYT4U 股票 · $40 卖出机会',
    description: '每股价格 $40，有持仓可以卖出获利了结。',
    cost: 40,
    cashFlow: 0,
    symbol: 'MYT4U',
    action: 'sell',
  },
  // GRO4US
  {
    id: 'stock-gro4us-5',
    size: 'small',
    type: 'stock',
    title: 'GRO4US 股票 · $5 买入机会',
    description: '每股价格 $5，可低价买入，等待市场上涨后卖出获利。',
    cost: 5,
    cashFlow: 0,
    symbol: 'GRO4US',
    maxQuantity: 5000,
    action: 'buy',
  },
  {
    id: 'stock-gro4us-12',
    size: 'small',
    type: 'stock',
    title: 'GRO4US 股票 · $12 买入机会',
    description: '每股价格 $12，可低价买入，等待市场上涨后卖出获利。',
    cost: 12,
    cashFlow: 0,
    symbol: 'GRO4US',
    maxQuantity: 2000,
    action: 'buy',
  },
  {
    id: 'stock-gro4us-25',
    size: 'small',
    type: 'stock',
    title: 'GRO4US 股票 · $25 卖出机会',
    description: '每股价格 $25，有持仓可以卖出获利了结。',
    cost: 25,
    cashFlow: 0,
    symbol: 'GRO4US',
    action: 'sell',
  },
  {
    id: 'stock-gro4us-40',
    size: 'small',
    type: 'stock',
    title: 'GRO4US 股票 · $40 卖出机会',
    description: '每股价格 $40，有持仓可以卖出获利了结。',
    cost: 40,
    cashFlow: 0,
    symbol: 'GRO4US',
    action: 'sell',
  },
  // OK4U
  {
    id: 'stock-ok4u-15',
    size: 'small',
    type: 'stock',
    title: 'OK4U 股票 · $15 买入机会',
    description: '每股价格 $15，可低价买入，等待市场上涨后卖出获利。',
    cost: 15,
    cashFlow: 0,
    symbol: 'OK4U',
    maxQuantity: 2000,
    action: 'buy',
  },
  {
    id: 'stock-ok4u-20',
    size: 'small',
    type: 'stock',
    title: 'OK4U 股票 · $20 买入机会',
    description: '每股价格 $20，可低价买入，等待市场上涨后卖出获利。',
    cost: 20,
    cashFlow: 0,
    symbol: 'OK4U',
    maxQuantity: 2000,
    action: 'buy',
  },
  {
    id: 'stock-ok4u-30',
    size: 'small',
    type: 'stock',
    title: 'OK4U 股票 · $30 卖出机会',
    description: '每股价格 $30，有持仓可以卖出获利了结。',
    cost: 30,
    cashFlow: 0,
    symbol: 'OK4U',
    action: 'sell',
  },
  {
    id: 'stock-ok4u-50',
    size: 'small',
    type: 'stock',
    title: 'OK4U 股票 · $50 卖出机会',
    description: '每股价格 $50，有持仓可以卖出获利了结。',
    cost: 50,
    cashFlow: 0,
    symbol: 'OK4U',
    action: 'sell',
  },
  // 2BIG
  {
    id: 'stock-2big-20',
    size: 'small',
    type: 'stock',
    title: '2BIG 股票 · $20 买入机会',
    description: '每股价格 $20，可低价买入，等待市场上涨后卖出获利。',
    cost: 20,
    cashFlow: 0,
    symbol: '2BIG',
    maxQuantity: 2000,
    action: 'buy',
  },
  {
    id: 'stock-2big-30',
    size: 'small',
    type: 'stock',
    title: '2BIG 股票 · $30 买入机会',
    description: '每股价格 $30，可低价买入，等待市场上涨后卖出获利。',
    cost: 30,
    cashFlow: 0,
    symbol: '2BIG',
    maxQuantity: 1000,
    action: 'buy',
  },
  {
    id: 'stock-2big-50',
    size: 'small',
    type: 'stock',
    title: '2BIG 股票 · $50 卖出机会',
    description: '每股价格 $50，有持仓可以卖出获利了结。',
    cost: 50,
    cashFlow: 0,
    symbol: '2BIG',
    action: 'sell',
  },
  {
    id: 'stock-2big-80',
    size: 'small',
    type: 'stock',
    title: '2BIG 股票 · $80 卖出机会',
    description: '每股价格 $80，有持仓可以卖出获利了结。',
    cost: 80,
    cashFlow: 0,
    symbol: '2BIG',
    action: 'sell',
  },
  // 小机会 - 股票拆分/合股（每只股票各一张拆分、一张合股）
  // 拆分类（1 拆 2）
  {
    id: 'stock-split-on2u-2',
    size: 'small',
    type: 'stock',
    title: 'ON2U 宣布 1 拆 2',
    description: 'ON2U公司股价过高，董事会宣布股票拆分。你持有的ON2U股票数量将翻倍，价格减半。',
    cost: 0,
    cashFlow: 0,
    symbol: 'ON2U',
    action: 'buy',
    splitRatio: 2,
  },
  {
    id: 'stock-split-myt4u-2',
    size: 'small',
    type: 'stock',
    title: 'MYT4U 宣布 1 拆 2',
    description: 'MYT4U公司股价过高，董事会宣布股票拆分。你持有的MYT4U股票数量将翻倍，价格减半。',
    cost: 0,
    cashFlow: 0,
    symbol: 'MYT4U',
    action: 'buy',
    splitRatio: 2,
  },
  {
    id: 'stock-split-gro4us-2',
    size: 'small',
    type: 'stock',
    title: 'GRO4US 宣布 1 拆 2',
    description: 'GRO4US公司股价过高，董事会宣布股票拆分。你持有的GRO4US股票数量将翻倍，价格减半。',
    cost: 0,
    cashFlow: 0,
    symbol: 'GRO4US',
    action: 'buy',
    splitRatio: 2,
  },
  {
    id: 'stock-split-ok4u-2',
    size: 'small',
    type: 'stock',
    title: 'OK4U 宣布 1 拆 2',
    description: 'OK4U公司股价过高，董事会宣布股票拆分。你持有的OK4U股票数量将翻倍，价格减半。',
    cost: 0,
    cashFlow: 0,
    symbol: 'OK4U',
    action: 'buy',
    splitRatio: 2,
  },
  {
    id: 'stock-split-2big-2',
    size: 'small',
    type: 'stock',
    title: '2BIG 宣布 1 拆 2',
    description: '2BIG公司股价过高，董事会宣布股票拆分。你持有的2BIG股票数量将翻倍，价格减半。',
    cost: 0,
    cashFlow: 0,
    symbol: '2BIG',
    action: 'buy',
    splitRatio: 2,
  },
  // 合股类（2 合 1）
  {
    id: 'stock-merge-on2u-2',
    size: 'small',
    type: 'stock',
    title: 'ON2U 进行 2 合 1',
    description: 'ON2U公司股价持续低迷，为维持上市地位进行合股。你持有的ON2U股票数量将减半，价格翻倍。',
    cost: 0,
    cashFlow: 0,
    symbol: 'ON2U',
    action: 'buy',
    splitRatio: 0.5,
  },
  {
    id: 'stock-merge-myt4u-2',
    size: 'small',
    type: 'stock',
    title: 'MYT4U 进行 2 合 1',
    description: 'MYT4U公司股价持续低迷，为维持上市地位进行合股。你持有的MYT4U股票数量将减半，价格翻倍。',
    cost: 0,
    cashFlow: 0,
    symbol: 'MYT4U',
    action: 'buy',
    splitRatio: 0.5,
  },
  {
    id: 'stock-merge-gro4us-2',
    size: 'small',
    type: 'stock',
    title: 'GRO4US 进行 2 合 1',
    description: 'GRO4US公司股价持续低迷，为维持上市地位进行合股。你持有的GRO4US股票数量将减半，价格翻倍。',
    cost: 0,
    cashFlow: 0,
    symbol: 'GRO4US',
    action: 'buy',
    splitRatio: 0.5,
  },
  {
    id: 'stock-merge-ok4u-2',
    size: 'small',
    type: 'stock',
    title: 'OK4U 进行 2 合 1',
    description: 'OK4U公司股价持续低迷，为维持上市地位进行合股。你持有的OK4U股票数量将减半，价格翻倍。',
    cost: 0,
    cashFlow: 0,
    symbol: 'OK4U',
    action: 'buy',
    splitRatio: 0.5,
  },
  {
    id: 'stock-merge-2big-2',
    size: 'small',
    type: 'stock',
    title: '2BIG 进行 2 合 1',
    description: '2BIG公司股价持续低迷，为维持上市地位进行合股。你持有的2BIG股票数量将减半，价格翻倍。',
    cost: 0,
    cashFlow: 0,
    symbol: '2BIG',
    action: 'buy',
    splitRatio: 0.5,
  },
  // 小机会 - 房地产
  {
    id: 're-house-small',
    size: 'small',
    type: 'real_estate',
    title: '2室1卫出租房',
    description: '首付 $5,000，月净现金流 $220。',
    cost: 5000,
    cashFlow: 220,
  },
  {
    id: 're-condo',
    size: 'small',
    type: 'real_estate',
    title: '市中心公寓',
    description: '首付 $12,000，月净现金流 $500。',
    cost: 12000,
    cashFlow: 500,
  },
  {
    id: 're-duplex',
    size: 'small',
    type: 'real_estate',
    title: ' duplex 双拼别墅',
    description: '首付 $20,000，月净现金流 $800。',
    cost: 20000,
    cashFlow: 800,
  },
  // 小机会 - 企业
  {
    id: 'biz-car-wash',
    size: 'small',
    type: 'business',
    title: '自动洗车店',
    description: '投资 $25,000，月净现金流 $1,200。',
    cost: 25000,
    cashFlow: 1200,
  },
  {
    id: 'biz-pizza',
    size: 'small',
    type: 'business',
    title: '披萨连锁店',
    description: '投资 $35,000，月净现金流 $1,500。',
    cost: 35000,
    cashFlow: 1500,
  },
  // 大机会 - 房地产
  {
    id: 're-apartment',
    size: 'big',
    type: 'real_estate',
    title: '8户公寓楼',
    description: '首付 $80,000，月净现金流 $2,500。',
    cost: 80000,
    cashFlow: 2500,
  },
  {
    id: 're-office',
    size: 'big',
    type: 'real_estate',
    title: '小型写字楼',
    description: '首付 $150,000，月净现金流 $4,500。',
    cost: 150000,
    cashFlow: 4500,
  },
  // 大机会 - 企业
  {
    id: 'biz-factory',
    size: 'big',
    type: 'business',
    title: '零部件制造厂',
    description: '投资 $200,000，月净现金流 $6,000。',
    cost: 200000,
    cashFlow: 6000,
  },
  {
    id: 'biz-tech',
    size: 'big',
    type: 'business',
    title: '软件公司股权',
    description: '投资 $300,000，月净现金流 $9,000。',
    cost: 300000,
    cashFlow: 9000,
  },
  // 其他
  {
    id: 'other-cd',
    size: 'small',
    type: 'other',
    title: '大额存单',
    description: '投资 $1,000，月利息 $20。',
    cost: 1000,
    cashFlow: 20,
  },
  {
    id: 'other-bond',
    size: 'small',
    type: 'other',
    title: '市政债券',
    description: '投资 $5,000，月利息 $100。',
    cost: 5000,
    cashFlow: 100,
  },
]

export const MARKET_CARDS: MarketEventCard[] = [
  {
    id: 'market-on2u-boom',
    title: 'ON2U 股票大涨',
    description: 'ON2U 股价飙升，持有者可以每股 $40 卖出。',
    targetType: 'stock',
    targetSymbol: 'ON2U',
    multiplier: 1,
    fixedPrice: 40,
  },
  {
    id: 'market-myt4u-boom',
    title: 'MYT4U 股票大涨',
    description: 'MYT4U 股价飙升，持有者可以每股 $50 卖出。',
    targetType: 'stock',
    targetSymbol: 'MYT4U',
    multiplier: 1,
    fixedPrice: 50,
  },
  {
    id: 'market-gro4us-boom',
    title: 'GRO4US 股票大涨',
    description: 'GRO4US 股价飙升，持有者可以每股 $45 卖出。',
    targetType: 'stock',
    targetSymbol: 'GRO4US',
    multiplier: 1,
    fixedPrice: 45,
  },
  {
    id: 'market-ok4u-boom',
    title: 'OK4U 股票大涨',
    description: 'OK4U 股价飙升，持有者可以每股 $80 卖出。',
    targetType: 'stock',
    targetSymbol: 'OK4U',
    multiplier: 1,
    fixedPrice: 80,
  },
  {
    id: 'market-2big-boom',
    title: '2BIG 股票大涨',
    description: '2BIG 股价飙升，持有者可以每股 $120 卖出。',
    targetType: 'stock',
    targetSymbol: '2BIG',
    multiplier: 1,
    fixedPrice: 120,
  },
  {
    id: 'market-realestate-boom',
    title: '房地产市场繁荣',
    description: '所有房地产资产可以以 2 倍成本价卖出。',
    targetType: 'real_estate',
    multiplier: 2,
  },
  {
    id: 'market-business-boom',
    title: '企业并购潮',
    description: '所有企业资产可以以 2 倍成本价卖出。',
    targetType: 'business',
    multiplier: 2,
  },
  {
    id: 'market-crash',
    title: '市场恐慌',
    description: '所有股票资产贬值 50%。',
    targetType: 'stock',
    multiplier: 0.5,
  },
]

export const DOODAD_CARDS: DoodadCard[] = [
  { id: 'doodad-phone', title: '最新款手机', description: '忍不住换了新手机。', cost: 300 },
  { id: 'doodad-vacation', title: '海岛度假', description: '给自己安排了一次短途旅行。', cost: 800 },
  { id: 'doodad-car-repair', title: '汽车维修', description: '爱车需要更换零件。', cost: 600 },
  { id: 'doodad-gadget', title: '智能手表', description: '买了一块新智能手表。', cost: 250 },
  { id: 'doodad-dining', title: '高级餐厅', description: '请朋友吃了一顿大餐。', cost: 150 },
  { id: 'doodad-shopping', title: '购物狂欢', description: '买了很多不需要的东西。', cost: 500 },
  { id: 'doodad-concert', title: '演唱会门票', description: '抢购了心仪乐队的演唱会门票。', cost: 200 },
  { id: 'doodad-gym', title: '健身房年卡', description: '办了一张高端健身房年卡。', cost: 1000 },
  { id: 'doodad-birthday', title: '生日礼物', description: '为家人准备了一份贵重礼物。', cost: 400 },
  { id: 'doodad-pet', title: '宠物开销', description: '带宠物去看兽医。', cost: 350 },
]

export const FAST_TRACK_OPPORTUNITY_CARDS: OpportunityCard[] = [
  {
    id: 'ft-reit',
    size: 'big',
    type: 'real_estate',
    title: 'REIT 投资组合',
    description: '投资 $500,000，月现金流 $25,000。',
    cost: 500000,
    cashFlow: 25000,
  },
  {
    id: 'ft-franchise',
    size: 'big',
    type: 'business',
    title: '国际连锁加盟',
    description: '投资 $800,000，月现金流 $40,000。',
    cost: 800000,
    cashFlow: 40000,
  },
  {
    id: 'ft-tech-ipo',
    size: 'big',
    type: 'stock',
    title: '科技股 IPO',
    description: '每股 $100，可在市场风云中高价卖出。',
    cost: 100,
    cashFlow: 0,
    symbol: 'TECH',
    maxQuantity: 1000,
  },
  {
    id: 'ft-hotel',
    size: 'big',
    type: 'real_estate',
    title: '海滨度假酒店',
    description: '投资 $1,200,000，月现金流 $60,000。',
    cost: 1200000,
    cashFlow: 60000,
  },
  {
    id: 'ft-fund',
    size: 'big',
    type: 'other',
    title: '高收益基金',
    description: '投资 $300,000，月现金流 $15,000。',
    cost: 300000,
    cashFlow: 15000,
  },
]

export function drawFastTrackOpportunity(decks: CardDeck): {
  card: OpportunityCard
  remaining: OpportunityCard[]
} {
  const deck = decks.fastTrackOpportunity
  if (deck.length === 0) {
    const fresh = shuffle(FAST_TRACK_OPPORTUNITY_CARDS)
    return { card: fresh[0]!, remaining: fresh.slice(1) }
  }
  return { card: deck[0]!, remaining: deck.slice(1) }
}

