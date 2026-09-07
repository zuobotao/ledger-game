import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { RoomClient } from '@/network/RoomClient'
import type { ClientMessage } from '@/network/protocol'

class FakeWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  static instances: FakeWebSocket[] = []

  readyState = FakeWebSocket.CONNECTING
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null
  sent: string[] = []

  constructor(_url: string) {
    FakeWebSocket.instances.push(this)
  }

  send(payload: string): void {
    this.sent.push(payload)
  }

  close(): void {
    this.readyState = FakeWebSocket.CLOSED
    this.onclose?.()
  }
}

const NativeWebSocket = globalThis.WebSocket

function openSocket(ws: FakeWebSocket): void {
  ws.readyState = FakeWebSocket.OPEN
  ws.onopen?.()
}

describe('RoomClient unexpected close recovery', () => {
  beforeEach(() => {
    FakeWebSocket.instances = []
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket
  })

  afterEach(() => {
    globalThis.WebSocket = NativeWebSocket
  })

  it('keeps the replacement socket and sends its reconnect attachment', () => {
    const reconnect: ClientMessage = {
      type: 'reconnect',
      sessionId: 'session-1',
      roomId: 'room-1',
      token: 'token-1',
    }
    let client: RoomClient
    client = new RoomClient({
      url: 'ws://example.test/ws',
      onUnexpectedClose: () => client.connect(reconnect),
    })

    client.connect({ type: 'ping', t: 1 })
    const first = FakeWebSocket.instances[0]!
    openSocket(first)

    first.readyState = FakeWebSocket.CLOSED
    first.onclose?.()

    const replacement = FakeWebSocket.instances[1]!
    expect(replacement).toBeDefined()
    openSocket(replacement)

    expect(client.isOpen).toBe(true)
    expect(replacement.sent.map((payload) => JSON.parse(payload))).toContainEqual(reconnect)
    client.disconnect()
  })
})
