import { describe, it, expect } from 'vitest'
import { JoinStateMachine, type JoinStatus } from '@/network/join'

describe('JoinStateMachine — 加入房间流程状态机（计划 §11.1）', () => {
  it('默认 idle，start 后进入 connecting', () => {
    const m = new JoinStateMachine()
    expect(m.current).toBe('idle')
    m.start()
    expect(m.current).toBe('connecting')
    expect(m.isActive).toBe(true)
  })

  it('socket 打开 → joining', () => {
    const m = new JoinStateMachine()
    m.start()
    m.onSocketOpen()
    expect(m.current).toBe('joining')
  })

  it('bootstrap 到位 → bootstrapping', () => {
    const m = new JoinStateMachine()
    m.start()
    m.onSocketOpen()
    m.onBootstrap()
    expect(m.current).toBe('bootstrapping')
  })

  it('快照中找到自己 → syncing', () => {
    const m = new JoinStateMachine()
    m.start()
    m.onSocketOpen()
    m.onSnapshot(true)
    expect(m.current).toBe('syncing')
  })

  it('bootstrap + 快照中找到自己 全部到位 → joined', () => {
    const m = new JoinStateMachine()
    m.start()
    m.onSocketOpen()
    m.onBootstrap()
    m.onSnapshot(true)
    expect(m.current).toBe('joined')
    expect(m.isActive).toBe(false)
  })

  it('快照先于 bootstrap 到达也能正确完成', () => {
    const m = new JoinStateMachine()
    m.start()
    m.onSocketOpen()
    m.onSnapshot(true)
    expect(m.current).toBe('syncing')
    m.onBootstrap()
    expect(m.current).toBe('joined')
  })

  it('快照中找不到自己 → 不推进，等待后续快照', () => {
    const m = new JoinStateMachine()
    m.start()
    m.onSocketOpen()
    m.onBootstrap()
    m.onSnapshot(false)
    expect(m.current).toBe('bootstrapping')
    m.onSnapshot(true)
    expect(m.current).toBe('joined')
  })

  it('任意进行中状态可 fail → failed，且失败后不再推进', () => {
    const m = new JoinStateMachine()
    m.start()
    m.onSocketOpen()
    m.onBootstrap()
    m.fail()
    expect(m.current).toBe('failed')
    expect(m.isActive).toBe(false)
    m.onSnapshot(true)
    m.onBootstrap()
    expect(m.current).toBe('failed')
  })

  it('joined 后重复通知不改变状态', () => {
    const m = new JoinStateMachine()
    m.start()
    m.onSocketOpen()
    m.onBootstrap()
    m.onSnapshot(true)
    m.onSnapshot(true)
    m.onBootstrap()
    expect(m.current).toBe('joined')
  })

  it('reset 回到 idle 并可再次 start', () => {
    const m = new JoinStateMachine()
    m.start()
    m.onSocketOpen()
    m.onBootstrap()
    m.onSnapshot(true)
    expect(m.current).toBe('joined')
    m.reset()
    expect(m.current).toBe('idle')
    m.start()
    expect(m.current).toBe('connecting')
  })

  it('状态变更回调按序触发', () => {
    const seen: JoinStatus[] = []
    const m = new JoinStateMachine({ onStatusChange: (s) => seen.push(s) })
    m.start()
    m.onSocketOpen()
    m.onBootstrap()
    m.onSnapshot(true)
    expect(seen).toEqual(['connecting', 'joining', 'bootstrapping', 'joined'])
  })

  it('重复通知同一状态不重复回调', () => {
    const seen: JoinStatus[] = []
    const m = new JoinStateMachine({ onStatusChange: (s) => seen.push(s) })
    m.start()
    m.onSocketOpen()
    m.onBootstrap()
    m.onBootstrap()
    expect(seen).toEqual(['connecting', 'joining', 'bootstrapping'])
  })
})
