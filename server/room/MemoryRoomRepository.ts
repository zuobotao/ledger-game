/**
 * MemoryRoomRepository — 第一版仅内存实现的房间仓库
 *
 * 未来可替换为 RedisRoomRepository / DatabaseRoomRepository。
 * 接口与 RoomManager 解耦，便于替换。
 */

import type { Room } from './Room'

export interface RoomRepository {
  create(room: Room): void
  get(roomId: string): Room | undefined
  getByCode(code: string, normalize?: (c: string) => string): Room | undefined
  save(room: Room): void
  delete(roomId: string): void
  all(): Room[]
  clear(): void
}

export class MemoryRoomRepository implements RoomRepository {
  private rooms = new Map<string, Room>()
  private byCode = new Map<string, string>()

  create(room: Room): void {
    this.rooms.set(room.id, room)
    this.byCode.set(room.code, room.id)
  }

  get(roomId: string): Room | undefined {
    return this.rooms.get(roomId)
  }

  getByCode(code: string, normalize: (c: string) => string = (c) => c): Room | undefined {
    const id = this.byCode.get(normalize(code))
    return id ? this.rooms.get(id) : undefined
  }

  save(room: Room): void {
    this.rooms.set(room.id, room)
    this.byCode.set(room.code, room.id)
  }

  delete(roomId: string): void {
    const room = this.rooms.get(roomId)
    if (room) {
      this.byCode.delete(room.code)
    }
    this.rooms.delete(roomId)
  }

  all(): Room[] {
    return [...this.rooms.values()]
  }

  clear(): void {
    this.rooms.clear()
    this.byCode.clear()
  }
}