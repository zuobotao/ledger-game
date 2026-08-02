import type { StoryCard } from '@/types/game'

/**
 * 24 张历史故事卡，按 6 大商帮/文化分类，每类 4 张。
 * 每张卡片讲述一段商业历史，并对玩家产生现金或被动收入的影响。
 */

export const STORY_CARDS: StoryCard[] = [
  // ===== 晋商（jin）- 棕色调 =====
  {
    id: 'jin-piaohao',
    category: 'jin',
    title: '票号传奇',
    story: '清代晋商首创票号，开创了中国银行业的先河。你从晋商票号的经营智慧中获得启发，提升了现金管理能力。',
    effect: {
      type: 'cash',
      amount: 500,
      description: '现金 +$500',
    },
    historicalNote: '日升昌票号创立于1823年，是中国第一家专营汇兑业务的票号，被誉为"大清金融第一街"。',
  },
  {
    id: 'jin-qiaojiadayuan',
    category: 'jin',
    title: '乔家大院',
    story: '你效仿乔致庸"诚信为本"的经营理念，赢得了客户的信任，获得了一笔意外的生意收入。',
    effect: {
      type: 'cash',
      amount: 1000,
      description: '现金 +$1,000',
    },
    historicalNote: '乔致庸是晋商代表人物，以"信义"立商，将乔家生意发展成遍布全国的商业帝国。',
  },
  {
    id: 'jin-zouxikou',
    category: 'jin',
    title: '走西口',
    story: '你跟随走西口的商队北上做了一笔小生意。塞外风沙漫漫，既有商机也有风险……',
    effect: {
      type: 'cash',
      amount: 300,
      description: '现金 +$300（幸运获利）',
    },
    historicalNote: '"走西口"是明清时期山西、陕西等地民众前往长城以北谋生经商的移民潮，持续三百余年。',
  },
  {
    id: 'jin-wanlichalu',
    category: 'jin',
    title: '万里茶路',
    story: '你参与了横跨亚欧大陆的万里茶路贸易，从福建运茶到俄罗斯。稳定的商路为你带来持续收益。',
    effect: {
      type: 'passive_income',
      amount: 50,
      description: '被动收入 +$50/月',
    },
    historicalNote: '万里茶路全长1.3万公里，从福建武夷山到俄罗斯恰克图，是继丝绸之路后又一条国际商路。',
  },

  // ===== 徽商（hui）- 红色调 =====
  {
    id: 'hui-hongdingshangren',
    category: 'hui',
    title: '红顶商人',
    story: '你效仿胡雪岩结交官场、政商结合的策略，获得了一个难得的商业机会。',
    effect: {
      type: 'cash',
      amount: 800,
      description: '现金 +$800',
    },
    historicalNote: '胡雪岩是晚清著名徽商，官居二品，头戴红顶花翎，被称为"红顶商人"，创办了胡庆余堂。',
  },
  {
    id: 'hui-yanshangshijia',
    category: 'hui',
    title: '盐商世家',
    story: '你继承了徽商世代经营的盐业生意，垄断的盐引为你带来源源不断的财富。',
    effect: {
      type: 'passive_income',
      amount: 100,
      description: '被动收入 +$100/月',
    },
    historicalNote: '明清徽商以盐业起家，扬州盐商几乎全为徽州人垄断，积累了富可敌国的财富。',
  },
  {
    id: 'hui-jiaerhaoru',
    category: 'hui',
    title: '贾而好儒',
    story: '你从徽商"贾而好儒"的文化中领悟到读书与经商并重的道理，知识带来了新的商机。',
    effect: {
      type: 'cash',
      amount: 300,
      description: '现金 +$300',
    },
    historicalNote: '徽商"贾而好儒"，亦商亦儒，许多商人科举入仕，形成独特的儒商文化。',
  },
  {
    id: 'hui-huxueyanpochan',
    category: 'hui',
    title: '胡雪岩破产',
    story: '你投资失利，像胡雪岩一样遭遇了商业危机。资金链断裂，不得不折价变卖资产……',
    effect: {
      type: 'cash',
      amount: -1000,
      description: '现金 -$1,000',
    },
    historicalNote: '1883年胡雪岩在与洋商的生丝大战中失败，庞大的商业帝国顷刻间崩塌，最终郁郁而终。',
  },

  // ===== 下南洋（nanyang）- 蓝色调 =====
  {
    id: 'nanyang-chuangnanyang',
    category: 'nanyang',
    title: '闯南洋',
    story: '你下南洋闯荡，在马来亚的橡胶园找到了工作机会。勤劳肯干让你攒下了第一桶金。',
    effect: {
      type: 'cash',
      amount: 600,
      description: '现金 +$600',
    },
    historicalNote: '19世纪末至20世纪初，大量华人下南洋谋生，在东南亚的橡胶、锡矿等行业中扮演重要角色。',
  },
  {
    id: 'nanyang-xiangjiaowangguo',
    category: 'nanyang',
    title: '橡胶王国',
    story: '你投资的橡胶园大获成功！20世纪初汽车工业爆发，橡胶价格飞涨，你成了"橡胶大王"。',
    effect: {
      type: 'passive_income',
      amount: 150,
      description: '被动收入 +$150/月',
    },
    historicalNote: '陈嘉庚被誉为"橡胶大王"，在马来亚经营橡胶园，巅峰时期拥有1.5万英亩橡胶园。',
  },
  {
    id: 'nanyang-xikuangdaheng',
    category: 'nanyang',
    title: '锡矿大亨',
    story: '你在马来亚经营锡矿发了财。从一名矿工到拥有自己的矿场，这是南洋华侨的传奇。',
    effect: {
      type: 'cash',
      amount: 1500,
      description: '现金 +$1,500',
    },
    historicalNote: '19世纪马来亚锡矿开采业蓬勃发展，华人矿工占锡矿工人的绝大多数，涌现出多位锡矿大亨。',
  },
  {
    id: 'nanyang-huaqiaoyinhang',
    category: 'nanyang',
    title: '华侨银行',
    story: '你参与创办了华侨银行，为南洋华商提供金融服务。稳定的银行业务为你带来分红收入。',
    effect: {
      type: 'passive_income',
      amount: 80,
      description: '被动收入 +$80/月',
    },
    historicalNote: '1912年李光前等人参与创办华侨银行，后发展为东南亚最大的金融集团之一。',
  },

  // ===== 旅蒙商（lvmeng）- 绿色调 =====
  {
    id: 'lvmeng-chayezhilu',
    category: 'lvmeng',
    title: '茶叶之路',
    story: '你跟随旅蒙商队穿越草原戈壁，将茶叶、丝绸运往蒙古。这一趟你赚了不少。',
    effect: {
      type: 'cash',
      amount: 400,
      description: '现金 +$400',
    },
    historicalNote: '旅蒙商是清代往返于内地与蒙古地区的商人，以山西人居多，主要经营茶叶、布匹、毛皮贸易。',
  },
  {
    id: 'lvmeng-maopimaoyi',
    category: 'lvmeng',
    title: '毛皮贸易',
    story: '你在蒙古草原做毛皮生意，上等的貂皮、狐皮在内地市场供不应求，你狠狠赚了一笔。',
    effect: {
      type: 'cash',
      amount: 700,
      description: '现金 +$700',
    },
    historicalNote: '旅蒙商从蒙古收购各种珍贵毛皮，贩往内地市场，毛皮贸易是其最重要的生意之一。',
  },
  {
    id: 'lvmeng-dashengkui',
    category: 'lvmeng',
    title: '大盛魁',
    story: '你加入了旅蒙商第一商号"大盛魁"，学习经营管理之道。这套生意经让你的收入稳步增长。',
    effect: {
      type: 'passive_income',
      amount: 60,
      description: '被动收入 +$60/月',
    },
    historicalNote: '大盛魁是清代旅蒙商中规模最大的商号，极盛时有员工六七千人，资本达几千万两白银。',
  },
  {
    id: 'lvmeng-caoyuanfengxian',
    category: 'lvmeng',
    title: '草原风险',
    story: '商队在草原上遭遇罕见的暴风雪，迷失了方向，损失了部分货物。这是旅蒙商必须面对的风险。',
    effect: {
      type: 'cash',
      amount: -500,
      description: '现金 -$500',
    },
    historicalNote: '旅蒙商往返一次需数月甚至半年，沿途要穿越沙漠戈壁，面临风暴、盗匪等重重风险。',
  },

  // ===== 美国梦（usa）- 金色调 =====
  {
    id: 'usa-taojinre',
    category: 'usa',
    title: '淘金热',
    story: '1849年加州淘金热！你加入了淘金大军，幸运地在河床中淘到了金子！',
    effect: {
      type: 'cash',
      amount: 2000,
      description: '现金 +$2,000',
    },
    historicalNote: '1848-1855年加州淘金热吸引了约30万人涌入，旧金山从一个小村庄迅速发展为繁华城市。',
  },
  {
    id: 'usa-shiyoudaheng',
    category: 'usa',
    title: '石油大亨',
    story: '你投资的油田出油了！黑色的黄金喷涌而出，每月都有稳定的石油收入进账。',
    effect: {
      type: 'passive_income',
      amount: 200,
      description: '被动收入 +$200/月',
    },
    historicalNote: '洛克菲勒创立标准石油公司，19世纪末控制了美国90%的炼油业，成为人类历史上首位亿万富翁。',
  },
  {
    id: 'usa-huaerjie',
    category: 'usa',
    title: '华尔街',
    story: '你在华尔街投资股票，踩准了市场节奏，大赚一笔！资本运作的魔力让你惊叹。',
    effect: {
      type: 'cash',
      amount: 1500,
      description: '现金 +$1,500',
    },
    historicalNote: '华尔街位于纽约曼哈顿，是全球金融中心，纽约证券交易所是世界上最大的证券交易所。',
  },
  {
    id: 'usa-jingjidadaxiaotiao',
    category: 'usa',
    title: '经济大萧条',
    story: '1929年华尔街股灾爆发，你遭遇了经济危机。银行倒闭、股市崩盘，投资损失惨重……',
    effect: {
      type: 'cash',
      amount: -2000,
      description: '现金 -$2,000',
    },
    historicalNote: '1929-1939年经济大萧条是20世纪最严重的经济危机，美国失业率高达25%，全球贸易锐减。',
  },

  // ===== 西方（western）- 灰紫色调 =====
  {
    id: 'western-gongyegeming',
    category: 'western',
    title: '工业革命',
    story: '你投资了工业革命中的新发明——蒸汽机驱动的纺织厂。机械化生产带来了滚滚利润。',
    effect: {
      type: 'passive_income',
      amount: 120,
      description: '被动收入 +$120/月',
    },
    historicalNote: '工业革命18世纪发源于英国，以蒸汽机的发明和广泛使用为标志，彻底改变了人类生产方式。',
  },
  {
    id: 'western-tieludaheng',
    category: 'western',
    title: '铁路大亨',
    story: '你投资铁路建设获得丰厚回报。铁路连接了东西海岸，也为你带来了巨额财富。',
    effect: {
      type: 'cash',
      amount: 1800,
      description: '现金 +$1,800',
    },
    historicalNote: '1869年第一条横贯大陆的太平洋铁路通车，范德比尔特等铁路大亨积累了惊人的财富。',
  },
  {
    id: 'western-mogencaituan',
    category: 'western',
    title: '摩根财团',
    story: '你效仿摩根进行资本运作，通过重组并购整合了多家企业。金融杠杆的力量让你受益匪浅。',
    effect: {
      type: 'cash',
      amount: 1200,
      description: '现金 +$1,200',
    },
    historicalNote: 'J.P.摩根是美国金融史上最具影响力的银行家，曾两次出手拯救美国经济于危机之中。',
  },
  {
    id: 'western-nanhaipaomo',
    category: 'western',
    title: '南海泡沫',
    story: '你在南海公司股票泡沫中损失惨重。疯狂的投机过后是一地鸡毛，这是人类最早的股灾之一。',
    effect: {
      type: 'cash',
      amount: -1500,
      description: '现金 -$1,500',
    },
    historicalNote: '1720年南海泡沫是人类历史上最早的股市泡沫之一，牛顿也在这场泡沫中损失了2万英镑。',
  },
]

/**
 * 故事卡类别对应的颜色主题（顶部装饰条渐变色）
 */
export const STORY_CATEGORY_COLORS: Record<string, { gradient: string; label: string }> = {
  jin: { gradient: 'from-amber-700 to-yellow-600', label: '晋商' },
  hui: { gradient: 'from-red-600 to-rose-500', label: '徽商' },
  nanyang: { gradient: 'from-blue-600 to-cyan-500', label: '下南洋' },
  lvmeng: { gradient: 'from-emerald-600 to-green-500', label: '旅蒙商' },
  usa: { gradient: 'from-yellow-500 to-amber-400', label: '美国梦' },
  western: { gradient: 'from-slate-600 to-purple-600', label: '西方' },
}

/**
 * 洗牌辅助函数
 */
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

/**
 * 创建洗好的故事卡牌堆
 */
export function createStoryDeck(): StoryCard[] {
  return shuffle(STORY_CARDS)
}

/**
 * 抽一张故事卡（牌堆空了自动重洗）
 */
export function drawStoryCard(deck: StoryCard[]): { card: StoryCard; remaining: StoryCard[] } {
  if (deck.length === 0) {
    const fresh = shuffle(STORY_CARDS)
    return { card: fresh[0]!, remaining: fresh.slice(1) }
  }
  return { card: deck[0]!, remaining: deck.slice(1) }
}
