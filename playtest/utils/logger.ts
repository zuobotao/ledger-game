import fs from 'node:fs'
import path from 'node:path'
import type { ActionLog, UXIssue, GameStateSnapshot } from '../types'

/**
 * Playtest logger — records actions, states, issues, and events
 * to files in the run directory.
 */
export class PlaytestLogger {
  private runDir: string
  private gameId: string
  private actions: ActionLog[] = []
  private issues: UXIssue[] = []
  private states: GameStateSnapshot[] = []
  private events: string[] = []

  constructor(runDir: string, gameId: string) {
    this.runDir = runDir
    this.gameId = gameId
    this.ensureDirs()
  }

  private ensureDirs() {
    const dirs = ['logs', 'states', 'events', 'screenshots', 'videos']
    for (const dir of dirs) {
      fs.mkdirSync(path.join(this.runDir, dir), { recursive: true })
    }
  }

  logAction(action: ActionLog) {
    this.actions.push(action)
  }

  logIssue(issue: UXIssue) {
    this.issues.push(issue)
  }

  logState(state: GameStateSnapshot) {
    this.states.push(state)
  }

  logEvent(event: string) {
    this.events.push(`${new Date().toISOString()} ${event}`)
  }

  getActions(): ActionLog[] {
    return [...this.actions]
  }

  getIssues(): UXIssue[] {
    return [...this.issues]
  }

  getEvents(): string[] {
    return [...this.events]
  }

  getStates(): GameStateSnapshot[] {
    return [...this.states]
  }

  getScreenshotPath(name: string): string {
    return path.join(this.runDir, 'screenshots', `${name}.png`)
  }

  getVideoDir(): string {
    return path.join(this.runDir, 'videos')
  }

  /**
   * Flush all logs to disk.
   * Called at the end of a game.
   */
  flush() {
    // Actions log
    fs.writeFileSync(
      path.join(this.runDir, 'logs', `${this.gameId}-actions.json`),
      JSON.stringify(this.actions, null, 2),
      'utf-8',
    )

    // Issues log
    fs.writeFileSync(
      path.join(this.runDir, 'logs', `${this.gameId}-issues.json`),
      JSON.stringify(this.issues, null, 2),
      'utf-8',
    )

    // States snapshot (sampled)
    fs.writeFileSync(
      path.join(this.runDir, 'states', `${this.gameId}-states.json`),
      JSON.stringify(this.states, null, 2),
      'utf-8',
    )

    // Events log
    fs.writeFileSync(
      path.join(this.runDir, 'events', `${this.gameId}-events.txt`),
      this.events.join('\n'),
      'utf-8',
    )
  }
}
