import fs from 'node:fs'
import path from 'node:path'
import type { ActionLog, UXIssue, GameStateSnapshot, DecisionResult, StateDiff } from '../types'

/**
 * Playtest logger — records actions, states, issues, decisions, diffs, and events
 * to files in the run directory.
 */
export class PlaytestLogger {
  private runDir: string
  private gameId: string
  private actions: ActionLog[] = []
  private issues: UXIssue[] = []
  private states: GameStateSnapshot[] = []
  private events: string[] = []
  private decisions: DecisionResult[] = []
  private diffs: StateDiff[] = []
  private uiStates: string[] = []

  constructor(runDir: string, gameId: string) {
    this.runDir = runDir
    this.gameId = gameId
    this.ensureDirs()
  }

  private ensureDirs() {
    const dirs = ['logs', 'states', 'events', 'screenshots', 'videos', 'ui']
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

  logDecision(decision: DecisionResult) {
    this.decisions.push(decision)
  }

  logDiff(diff: StateDiff) {
    this.diffs.push(diff)
  }

  logUIState(ui: string) {
    this.uiStates.push(`${new Date().toISOString()} ${ui}`)
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

  getDecisions(): DecisionResult[] {
    return [...this.decisions]
  }

  getDiffs(): StateDiff[] {
    return [...this.diffs]
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
    const write = (dir: string, file: string, data: unknown) => {
      fs.writeFileSync(path.join(this.runDir, dir, `${this.gameId}-${file}`), JSON.stringify(data, null, 2), 'utf-8')
    }

    write('logs', 'actions.json', this.actions)
    write('logs', 'issues.json', this.issues)
    write('logs', 'decisions.json', this.decisions)
    write('states', 'states.json', this.states)
    write('states', 'diffs.json', this.diffs)
    write('events', 'events.txt', this.events.join('\n'))

    fs.writeFileSync(path.join(this.runDir, 'ui', `${this.gameId}-ui-states.txt`), this.uiStates.join('\n'), 'utf-8')
  }
}