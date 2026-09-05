/**
 * 协议运行时校验 — 非法消息全部拒绝
 *
 * 说明：TS 类型只在编译期存在，这里提供轻量运行时守卫。
 * - 未知字段不拒绝（前向兼容）
 * - 缺少必需字段 / 字段类型错误 → 拒绝
 * - GameAction 在协议层只校验信封与 type 枚举，深入校验由 GameSession 完成
 */

import {
  ErrorCodes,
  MAX_NICKNAME_LENGTH,
  ROOM_CODE_LENGTH,
  type ClientMessage,
  type GameActionMessage,
  type JoinRoomMessage,
  type ReadyMessage,
  type SetPlayerSetupMessage,
  type StartGameMessage,
  type ReconnectMessage,
  type LeaveRoomMessage,
  type PingMessage,
} from '../../src/network/protocol'
import { GAME_ACTION_TYPES } from '../../src/engine/contract'

export type ValidationResult =
  | { ok: true; message: ClientMessage }
  | { ok: false; code: string; message: string }

function fail(code: string, message: string): ValidationResult {
  return { ok: false, code, message }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isStr(v: unknown, max = Infinity): v is string {
  return typeof v === 'string' && v.length <= max
}

function isNonEmptyStr(v: unknown, max: number): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= max
}

export function parseClientMessage(raw: unknown): ValidationResult {
  if (!isObject(raw)) return fail(ErrorCodes.INVALID_MESSAGE, '消息必须是对象')
  const type = raw.type
  if (!isStr(type)) return fail(ErrorCodes.INVALID_MESSAGE, '缺少消息类型')

  switch (type) {
    case 'join_room': {
      const m = raw as JoinRoomMessage
      if (!isStr(m.roomCode) || m.roomCode.length > ROOM_CODE_LENGTH) return fail(ErrorCodes.INVALID_MESSAGE, 'roomCode 非法')
      if (!isStr(m.sessionId) || m.sessionId.length === 0) return fail(ErrorCodes.INVALID_MESSAGE, 'sessionId 非法')
      if (!isNonEmptyStr(m.nickname, MAX_NICKNAME_LENGTH)) return fail(ErrorCodes.INVALID_MESSAGE, 'nickname 非法')
      return { ok: true, message: { type: 'join_room', roomCode: m.roomCode, sessionId: m.sessionId, nickname: m.nickname } }
    }
    case 'ready': {
      const m = raw as ReadyMessage
      if (typeof m.ready !== 'boolean') return fail(ErrorCodes.INVALID_MESSAGE, 'ready 必须为布尔')
      return { ok: true, message: { type: 'ready', ready: m.ready } }
    }
    case 'set_player_setup': {
      const m = raw as SetPlayerSetupMessage
      if (!isStr(m.careerId) || m.careerId.length === 0) return fail(ErrorCodes.INVALID_MESSAGE, 'careerId 非法')
      return { ok: true, message: { type: 'set_player_setup', careerId: m.careerId, dreamId: m.dreamId, colorId: m.colorId } }
    }
    case 'start_game': {
      const m = raw as StartGameMessage
      return { ok: true, message: { type: 'start_game' } }
    }
    case 'game_action': {
      const m = raw as GameActionMessage
      if (!isStr(m.requestId) || m.requestId.length === 0) return fail(ErrorCodes.INVALID_MESSAGE, 'requestId 非法')
      if (!isObject(m.action)) return fail(ErrorCodes.INVALID_MESSAGE, 'action 非法')
      const atype = m.action.type
      if (!isStr(atype) || !(GAME_ACTION_TYPES as readonly string[]).includes(atype)) {
        return fail(ErrorCodes.INVALID_ACTION, `未知动作类型: ${String(atype)}`)
      }
      return { ok: true, message: { type: 'game_action', requestId: m.requestId, action: m.action as never } }
    }
    case 'reconnect': {
      const m = raw as ReconnectMessage
      if (!isStr(m.sessionId) || m.sessionId.length === 0) return fail(ErrorCodes.INVALID_MESSAGE, 'sessionId 非法')
      if (!isStr(m.roomId) || m.roomId.length === 0) return fail(ErrorCodes.INVALID_MESSAGE, 'roomId 非法')
      if (!isNonEmptyStr(m.token, 512)) return fail(ErrorCodes.INVALID_MESSAGE, 'token 非法')
      return { ok: true, message: { type: 'reconnect', sessionId: m.sessionId, roomId: m.roomId, token: m.token } }
    }
    case 'leave_room': {
      const m = raw as LeaveRoomMessage
      return { ok: true, message: { type: 'leave_room' } }
    }
    case 'ping': {
      const m = raw as PingMessage
      return { ok: true, message: { type: 'ping', t: typeof m.t === 'number' ? m.t : Date.now() } }
    }
    default:
      return fail(ErrorCodes.INVALID_MESSAGE, `未知消息类型: ${String(type)}`)
  }
}