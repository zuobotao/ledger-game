import { GameSession, type SessionPlayerSetup } from '../server/game/GameSession'
import type { GameAction } from '@/engine/contract'
import type { GameConfig } from '@/types/game'

const CONFIG: GameConfig = { playerCount: 2, insurance: false, bigFamily: false, mortgage: false, fastStart: false, ageLimit: true }
const players: SessionPlayerSetup[] = [
  { name: 'P1', colorId: 'blue', careerId: 'programmer', dreamId: 'beach-house' },
  { name: 'P2', colorId: 'red', careerId: 'doctor', dreamId: 'charity-foundation' },
]
function pass(a: GameAction): string { return `${a.type}` }
function buildAction(type: string, playerId: string, tryBuy = true): GameAction {
  const base = { type, playerId } as GameAction
  switch (type) {
    case 'buy_opportunity': return { ...base, quantity: 1 } as GameAction
    case 'handle_charity': return { ...base, accepted: tryBuy } as GameAction
    case 'fast_track_dream': case 'fast_track_opportunity': return { ...base, accepted: tryBuy } as GameAction
    case 'take_bank_loan': return { ...base } as GameAction
    case 'sell_opportunity': return { ...base, assetId: '', price: 0, quantity: 1 } as GameAction
    case 'skip_stock_sell': return { ...base } as GameAction
    case 'fast_track_stock_trading': return { ...base, symbol: '', quantity: 1, isBuy: tryBuy } as GameAction
    default: return base
  }
}
function passAction(pending: string | null, playerId: string): GameAction {
  const base = { playerId } as GameAction
  switch (pending) {
    case 'opportunity': case 'need_loan': return { ...base, type: 'decline_opportunity' } as GameAction
    case 'charity': return { ...base, type: 'handle_charity', accepted: false } as GameAction
    case 'market': return { ...base, type: 'handle_market' } as GameAction
    case 'doodad': return { ...base, type: 'handle_doodad' } as GameAction
    case 'story': return { ...base, type: 'handle_story' } as GameAction
    case 'stock_sell_opportunity': return { ...base, type: 'skip_stock_sell' } as GameAction
    case 'bankrupt': return { ...base, type: 'declare_bankruptcy' } as GameAction
    case 'fast_track_opportunity': case 'fast_track_dream': return { ...base, type: 'fast_track_dream', accepted: false } as GameAction
    case 'fast_track_stock_trading': return { ...base, type: 'fast_track_stock_trading', symbol: '', quantity: 0, isBuy: false } as GameAction
    default: return { ...base, type: 'end_turn' } as GameAction
  }
}

const s = new GameSession({ id: 'dbg', roomId: 'dbg', seed: 200, version: '2.4.0', config: CONFIG, players, startedAt: 1000 })
let justRolled = false
let lastHash = ''
let stall = 0
let actions = 0
let buyFails = 0
let declineFails = 0
const trace: string[] = []
while (actions < 400 && s.status !== 'finished') {
  const snap = s.snapshot()
  if (snap.stateHash === lastHash) { stall++; if (stall > 25) { console.log('== STALL after', actions, trace.slice(-20).join('\n')); break } }
  else { lastHash = snap.stateHash; stall = 0 }
  const pending = snap.turn.pendingAction
  const allowed = snap.turn.allowedActions
  let action: GameAction
  if (pending) {
    const buy = allowed.includes('buy_opportunity')
    if (buy) { action = buildAction('buy_opportunity', snap.turn.currentPlayerId, true); }
    else if (pending === 'stock_sell_opportunity') {
      const card = snap.state.pendingAction?.card as { symbol?: string; cost?: number } | null | undefined
      action = { ...buildAction('sell_opportunity', snap.turn.currentPlayerId, true), assetId: card?.symbol ?? '', price: card?.cost ?? 0, quantity: 1 }
    }
    else action = buildAction(passAction(pending, snap.turn.currentPlayerId).type, snap.turn.currentPlayerId, true)
  } else if (!justRolled) { action = buildAction('roll_dice', snap.turn.currentPlayerId); justRolled = true }
  else { action = buildAction('end_turn', snap.turn.currentPlayerId); justRolled = false }
  const before = s.snapshot().stateHash
  const r = s.dispatch(action)
  actions++
  trace.push(`#${actions} ${pass(action).padEnd(24)} pending=${pending ?? 'null'} allowed=[${allowed}] ok=${r.success} hashChange=${s.snapshot().stateHash !== before}`)
  if (trace.length > 40) trace.shift()
  if (!r.success) {
    if (action.type === 'buy_opportunity') buyFails++
    const fb = passAction(s.snapshot().turn.pendingAction, s.snapshot().turn.currentPlayerId)
    const fbr = s.dispatch(fb); actions++
    trace.push(`   fallback=${fb.type} ok=${fbr.success}`)
    if (!fbr.success && fb.type === 'decline_opportunity') declineFails++
  }
}
console.log('buyFails', buyFails, 'declineFails', declineFails, 'totalActions', actions, 'finished', s.status === 'finished', 'turns', s.snapshot().session.turnNumber, 'hash', s.snapshot().stateHash)