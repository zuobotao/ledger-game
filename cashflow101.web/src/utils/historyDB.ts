import initSqlJs, { Database } from 'sql.js'
import type { SqlJsStatic } from 'sql.js'
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import type {
  GameHistoryRecord,
  GameHistoryDetail,
  GameHistoryPlayerSummary,
  TransactionRecord,
  CardHistoryRecord,
  FinancialSnapshot,
  GameConfig,
  GameResult,
} from '@/types/game'

const DB_NAME = 'ledger101-history.db'
const MAX_RECORDS = 50

let SQL: SqlJsStatic | null = null
let db: Database | null = null
let initPromise: Promise<void> | null = null

/**
 * 初始化 sql.js 和数据库
 * 数据库内容保存在 IndexedDB 中以实现持久化
 */
async function initDB(): Promise<void> {
  if (db) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    // 加载 sql.js WASM（Vite 通过 ?url 后缀将 WASM 作为资源处理）
    SQL = await initSqlJs({
      locateFile: () => sqlWasmUrl,
    })

    // 尝试从 IndexedDB 加载已有数据库
    const savedData = await loadDBFromIndexedDB()
    if (savedData) {
      db = new SQL.Database(savedData)
    } else {
      db = new SQL.Database()
    }

    createTables()
  })()

  return initPromise
}

/**
 * 从 IndexedDB 加载数据库二进制数据
 */
function loadDBFromIndexedDB(): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('ledger101-db', 1)
      req.onupgradeneeded = () => {
        const idb = req.result
        if (!idb.objectStoreNames.contains('databases')) {
          idb.createObjectStore('databases')
        }
      }
      req.onsuccess = () => {
        const idb = req.result
        try {
          const tx = idb.transaction('databases', 'readonly')
          const store = tx.objectStore('databases')
          const getReq = store.get(DB_NAME)
          getReq.onsuccess = () => {
            resolve(getReq.result ?? null)
            idb.close()
          }
          getReq.onerror = () => {
            resolve(null)
            idb.close()
          }
        } catch (e) {
          resolve(null)
          idb.close()
        }
      }
      req.onerror = () => resolve(null)
    } catch (e) {
      resolve(null)
    }
  })
}

/**
 * 保存数据库到 IndexedDB
 */
function saveDBToIndexedDB(): void {
  if (!db) return
  const data = db.export()
  try {
    const req = indexedDB.open('ledger101-db', 1)
    req.onupgradeneeded = () => {
      const idb = req.result
      if (!idb.objectStoreNames.contains('databases')) {
        idb.createObjectStore('databases')
      }
    }
    req.onsuccess = () => {
      const idb = req.result
      try {
        const tx = idb.transaction('databases', 'readwrite')
        const store = tx.objectStore('databases')
        store.put(data, DB_NAME)
        tx.oncomplete = () => idb.close()
      } catch (e) {
        console.error('Failed to save DB to IndexedDB:', e)
        idb.close()
      }
    }
  } catch (e) {
    console.error('Failed to save DB to IndexedDB:', e)
  }
}

/**
 * 创建数据表
 */
function createTables(): void {
  if (!db) return

  db.run(`
    CREATE TABLE IF NOT EXISTS game_history (
      id TEXT PRIMARY KEY,
      startTime INTEGER NOT NULL,
      endTime INTEGER NOT NULL,
      totalTurns INTEGER NOT NULL,
      ratRaceTurns INTEGER NOT NULL,
      fastTrackTurns INTEGER NOT NULL,
      result TEXT NOT NULL,
      playerCount INTEGER NOT NULL,
      aiCount INTEGER NOT NULL,
      mainPlayerId TEXT NOT NULL,
      dreamName TEXT,
      grade TEXT,
      configJson TEXT NOT NULL,
      playersJson TEXT NOT NULL,
      note TEXT
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS game_transactions (
      id TEXT PRIMARY KEY,
      gameId TEXT NOT NULL,
      playerId TEXT NOT NULL,
      turnNumber INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      assetSymbol TEXT,
      assetQuantity INTEGER,
      unitPrice REAL,
      costBasis REAL,
      assetName TEXT,
      assetType TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (gameId) REFERENCES game_history(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS game_card_history (
      id TEXT PRIMARY KEY,
      gameId TEXT NOT NULL,
      playerId TEXT NOT NULL,
      turnNumber INTEGER NOT NULL,
      type TEXT NOT NULL,
      cardId TEXT NOT NULL,
      cardTitle TEXT NOT NULL,
      cardDescription TEXT NOT NULL,
      action TEXT,
      amount REAL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (gameId) REFERENCES game_history(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS game_financial_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gameId TEXT NOT NULL,
      playerId TEXT NOT NULL,
      turn INTEGER NOT NULL,
      cash REAL NOT NULL,
      totalAssets REAL NOT NULL,
      totalLiabilities REAL NOT NULL,
      netWorth REAL NOT NULL,
      totalIncome REAL NOT NULL,
      totalExpenses REAL NOT NULL,
      monthlyCashFlow REAL NOT NULL,
      stockValue REAL NOT NULL,
      realEstateValue REAL NOT NULL,
      businessValue REAL NOT NULL,
      FOREIGN KEY (gameId) REFERENCES game_history(id) ON DELETE CASCADE
    )
  `)

  // 索引
  db.run('CREATE INDEX IF NOT EXISTS idx_game_history_startTime ON game_history(startTime DESC)')
  db.run('CREATE INDEX IF NOT EXISTS idx_game_history_result ON game_history(result)')
  db.run('CREATE INDEX IF NOT EXISTS idx_transactions_gameId ON game_transactions(gameId)')
  db.run('CREATE INDEX IF NOT EXISTS idx_card_history_gameId ON game_card_history(gameId)')
  db.run('CREATE INDEX IF NOT EXISTS idx_snapshots_gameId ON game_financial_snapshots(gameId)')
}

/**
 * 行数据转 GameHistoryRecord
 */
function rowToRecord(row: any[]): GameHistoryRecord {
  return {
    id: row[0] as string,
    startTime: row[1] as number,
    endTime: row[2] as number,
    totalTurns: row[3] as number,
    ratRaceTurns: row[4] as number,
    fastTrackTurns: row[5] as number,
    result: row[6] as GameResult,
    playerCount: row[7] as number,
    aiCount: row[8] as number,
    mainPlayerId: row[9] as string,
    dreamName: row[10] as string | undefined,
    grade: (row[11] as string | undefined) as 'S' | 'A' | 'B' | 'C' | 'D' | undefined,
    config: JSON.parse(row[12] as string) as GameConfig,
    players: JSON.parse(row[13] as string) as GameHistoryPlayerSummary[],
    note: row[14] as string | undefined,
  }
}

// ==================== 公共 API ====================

/**
 * 获取所有历史记录（按开始时间倒序）
 */
export async function getAllRecords(): Promise<GameHistoryRecord[]> {
  await initDB()
  if (!db) return []

  const result = db.exec(
    'SELECT id, startTime, endTime, totalTurns, ratRaceTurns, fastTrackTurns, result, playerCount, aiCount, mainPlayerId, dreamName, grade, configJson, playersJson, note FROM game_history ORDER BY startTime DESC LIMIT ?',
    [MAX_RECORDS],
  )

  if (result.length === 0) return []
  return result[0]!.values.map(rowToRecord)
}

/**
 * 根据 ID 获取记录详情
 */
export async function getRecordDetail(id: string): Promise<GameHistoryDetail | null> {
  await initDB()
  if (!db) return null

  const recordResult = db.exec(
    'SELECT id, startTime, endTime, totalTurns, ratRaceTurns, fastTrackTurns, result, playerCount, aiCount, mainPlayerId, dreamName, grade, configJson, playersJson, note FROM game_history WHERE id = ?',
    [id],
  )

  if (recordResult.length === 0) return null
  const record = rowToRecord(recordResult[0]!.values[0]!)

  // 主玩家交易记录
  const txResult = db.exec(
    'SELECT id, playerId, turnNumber, type, amount, description, assetSymbol, assetQuantity, unitPrice, costBasis, assetName, assetType, timestamp FROM game_transactions WHERE gameId = ? AND playerId = ? ORDER BY timestamp ASC',
    [id, record.mainPlayerId],
  )
  const transactions: TransactionRecord[] =
    txResult.length > 0
      ? txResult[0]!.values.map((row) => ({
          id: row[0] as string,
          playerId: row[1] as string,
          turnNumber: row[2] as number,
          type: row[3] as TransactionRecord['type'],
          amount: row[4] as number,
          description: row[5] as string,
          assetSymbol: row[6] as string | undefined,
          assetQuantity: row[7] as number | undefined,
          unitPrice: row[8] as number | undefined,
          costBasis: row[9] as number | undefined,
          assetName: row[10] as string | undefined,
          assetType: row[11] as TransactionRecord['assetType'],
          timestamp: row[12] as number,
        }))
      : []

  // 主玩家卡牌历史
  const cardResult = db.exec(
    'SELECT id, playerId, turnNumber, type, cardId, cardTitle, cardDescription, action, amount, timestamp FROM game_card_history WHERE gameId = ? AND playerId = ? ORDER BY timestamp ASC',
    [id, record.mainPlayerId],
  )
  const cardHistory: CardHistoryRecord[] =
    cardResult.length > 0
      ? cardResult[0]!.values.map((row) => ({
          id: row[0] as string,
          playerId: row[1] as string,
          turnNumber: row[2] as number,
          type: row[3] as CardHistoryRecord['type'],
          cardId: row[4] as string,
          cardTitle: row[5] as string,
          cardDescription: row[6] as string,
          action: row[7] as CardHistoryRecord['action'],
          amount: row[8] as number | undefined,
          timestamp: row[9] as number,
        }))
      : []

  // 主玩家财务快照
  const snapResult = db.exec(
    'SELECT turn, cash, totalAssets, totalLiabilities, netWorth, totalIncome, totalExpenses, monthlyCashFlow, stockValue, realEstateValue, businessValue FROM game_financial_snapshots WHERE gameId = ? AND playerId = ? ORDER BY turn ASC',
    [id, record.mainPlayerId],
  )
  const snapshots: FinancialSnapshot[] =
    snapResult.length > 0
      ? snapResult[0]!.values.map((row) => ({
          turn: row[0] as number,
          cash: row[1] as number,
          totalAssets: row[2] as number,
          totalLiabilities: row[3] as number,
          netWorth: row[4] as number,
          totalIncome: row[5] as number,
          totalExpenses: row[6] as number,
          monthlyCashFlow: row[7] as number,
          stockValue: row[8] as number,
          realEstateValue: row[9] as number,
          businessValue: row[10] as number,
        }))
      : []

  return {
    ...record,
    mainPlayerTransactions: transactions,
    mainPlayerCardHistory: cardHistory,
    mainPlayerSnapshots: snapshots,
  }
}

/**
 * 保存一局游戏的历史记录
 */
export async function saveGameRecord(params: {
  result: GameResult
  players: { id: string; name: string; color: string; career: { name: string }; isAI: boolean; isBankrupt: boolean; cash: number; passiveIncome: number; totalExpenses: number; assets: any[]; financialSnapshots: FinancialSnapshot[] }[]
  winnerId: string | null
  mainPlayerId: string
  config: GameConfig
  totalTurns: number
  ratRaceTurns: number
  fastTrackTurns: number
  startTime: number
  transactions: TransactionRecord[]
  cardHistory: CardHistoryRecord[]
  dreamName?: string
  grade?: 'S' | 'A' | 'B' | 'C' | 'D'
}): Promise<string> {
  await initDB()
  if (!db) throw new Error('Database not initialized')

  const {
    result,
    players,
    winnerId,
    mainPlayerId,
    config,
    totalTurns,
    ratRaceTurns,
    fastTrackTurns,
    startTime,
    transactions,
    cardHistory,
    dreamName,
    grade,
  } = params

  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const endTime = Date.now()

  // 构建玩家摘要
  const playerSummaries: GameHistoryPlayerSummary[] = players.map((p) => {
    const assetValue = p.assets.reduce(
      (sum, a) => sum + (a.marketPrice ?? a.cost) * a.quantity,
      0,
    )
    const liabilityValue = 0 // 摘要中不包含负债明细
    const finalNetWorth = p.cash + assetValue - liabilityValue
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      careerName: p.career.name,
      isAI: p.isAI,
      isWinner: p.id === winnerId,
      isBankrupt: p.isBankrupt,
      finalCash: p.cash,
      finalNetWorth,
      passiveIncome: p.passiveIncome,
      totalExpenses: p.totalExpenses,
      assetCount: p.assets.length,
    }
  })

  // 插入主记录
  db.run(
    `INSERT INTO game_history 
     (id, startTime, endTime, totalTurns, ratRaceTurns, fastTrackTurns, result, playerCount, aiCount, mainPlayerId, dreamName, grade, configJson, playersJson)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      startTime,
      endTime,
      totalTurns,
      ratRaceTurns,
      fastTrackTurns,
      result,
      players.length,
      players.filter((p) => p.isAI).length,
      mainPlayerId,
      dreamName ?? null,
      grade ?? null,
      JSON.stringify(config),
      JSON.stringify(playerSummaries),
    ],
  )

  // 插入交易记录（所有玩家）
  const txStmt = db.prepare(
    `INSERT INTO game_transactions 
     (id, gameId, playerId, turnNumber, type, amount, description, assetSymbol, assetQuantity, unitPrice, costBasis, assetName, assetType, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  for (const tx of transactions) {
    txStmt.run([
      tx.id,
      id,
      tx.playerId,
      tx.turnNumber,
      tx.type,
      tx.amount,
      tx.description,
      tx.assetSymbol ?? null,
      tx.assetQuantity ?? null,
      tx.unitPrice ?? null,
      tx.costBasis ?? null,
      tx.assetName ?? null,
      tx.assetType ?? null,
      tx.timestamp,
    ])
  }
  txStmt.free()

  // 插入卡牌历史（所有玩家）
  const cardStmt = db.prepare(
    `INSERT INTO game_card_history 
     (id, gameId, playerId, turnNumber, type, cardId, cardTitle, cardDescription, action, amount, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  for (const card of cardHistory) {
    cardStmt.run([
      card.id,
      id,
      card.playerId,
      card.turnNumber,
      card.type,
      card.cardId,
      card.cardTitle,
      card.cardDescription,
      card.action ?? null,
      card.amount ?? null,
      card.timestamp,
    ])
  }
  cardStmt.free()

  // 插入主玩家财务快照
  const mainPlayer = players.find((p) => p.id === mainPlayerId)
  if (mainPlayer) {
    const snapStmt = db.prepare(
      `INSERT INTO game_financial_snapshots 
       (gameId, playerId, turn, cash, totalAssets, totalLiabilities, netWorth, totalIncome, totalExpenses, monthlyCashFlow, stockValue, realEstateValue, businessValue)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    for (const snap of mainPlayer.financialSnapshots) {
      snapStmt.run([
        id,
        mainPlayerId,
        snap.turn,
        snap.cash,
        snap.totalAssets,
        snap.totalLiabilities,
        snap.netWorth,
        snap.totalIncome,
        snap.totalExpenses,
        snap.monthlyCashFlow,
        snap.stockValue,
        snap.realEstateValue,
        snap.businessValue,
      ])
    }
    snapStmt.free()
  }

  // 限制最大记录数，超出则删除最旧的
  const countResult = db.exec('SELECT COUNT(*) FROM game_history')
  const count = countResult[0]?.values[0]?.[0] as number
  if (count > MAX_RECORDS) {
    const oldIds = db.exec(
      `SELECT id FROM game_history ORDER BY startTime ASC LIMIT ?`,
      [count - MAX_RECORDS],
    )
    if (oldIds.length > 0) {
      for (const row of oldIds[0]!.values) {
        const oldId = row[0] as string
        db.run('DELETE FROM game_transactions WHERE gameId = ?', [oldId])
        db.run('DELETE FROM game_card_history WHERE gameId = ?', [oldId])
        db.run('DELETE FROM game_financial_snapshots WHERE gameId = ?', [oldId])
        db.run('DELETE FROM game_history WHERE id = ?', [oldId])
      }
    }
  }

  // 持久化到 IndexedDB
  saveDBToIndexedDB()

  return id
}

/**
 * 删除一条记录
 */
export async function deleteRecord(id: string): Promise<void> {
  await initDB()
  if (!db) return

  db.run('DELETE FROM game_transactions WHERE gameId = ?', [id])
  db.run('DELETE FROM game_card_history WHERE gameId = ?', [id])
  db.run('DELETE FROM game_financial_snapshots WHERE gameId = ?', [id])
  db.run('DELETE FROM game_history WHERE id = ?', [id])

  saveDBToIndexedDB()
}

/**
 * 清空所有记录
 */
export async function clearAllRecords(): Promise<void> {
  await initDB()
  if (!db) return

  db.run('DELETE FROM game_transactions')
  db.run('DELETE FROM game_card_history')
  db.run('DELETE FROM game_financial_snapshots')
  db.run('DELETE FROM game_history')

  saveDBToIndexedDB()
}

/**
 * 从 localStorage 迁移数据到 SQLite（首次使用时自动迁移）
 */
export async function migrateFromLocalStorage(): Promise<number> {
  const STORAGE_KEY = 'ledger101-history'
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return 0

    const records = JSON.parse(raw) as GameHistoryRecord[]
    if (records.length === 0) return 0

    // 检查数据库中是否已有数据
    const existing = await getAllRecords()
    if (existing.length > 0) return 0

    let migrated = 0
    for (const record of records) {
      // 读取详情
      const detailRaw = localStorage.getItem(`${STORAGE_KEY}-detail-${record.id}`)
      if (detailRaw) {
        const detail = JSON.parse(detailRaw) as GameHistoryDetail & { config: GameConfig; players: GameHistoryPlayerSummary[] }

        // 重建 players 数组为 saveGameRecord 期望的格式
        const players = detail.players.map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color,
          career: { name: p.careerName },
          isAI: p.isAI,
          isBankrupt: p.isBankrupt,
          cash: p.finalCash,
          passiveIncome: p.passiveIncome,
          totalExpenses: p.totalExpenses,
          assets: new Array(p.assetCount).fill(null).map((_, i) => ({
            marketPrice: 0,
            cost: 0,
            quantity: 0,
          })),
          financialSnapshots: detail.mainPlayerSnapshots?.filter(
            // 只给主玩家加上快照
            (s) => detail.mainPlayerId === detail.players.find((pp) => pp.id === p.id)?.id,
          ) ?? [],
        }))

        // 找出 winner
        const winner = detail.players.find((p) => p.isWinner)

        // 直接插入数据库（复用 saveGameRecord 逻辑但跳过部分计算）
        await initDB()
        if (!db) break

        // 用手动方式插入，确保 ID 不变
        db.run(
          `INSERT INTO game_history 
           (id, startTime, endTime, totalTurns, ratRaceTurns, fastTrackTurns, result, playerCount, aiCount, mainPlayerId, dreamName, grade, configJson, playersJson)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            record.id,
            record.startTime,
            record.endTime,
            record.totalTurns,
            record.ratRaceTurns,
            record.fastTrackTurns,
            record.result,
            record.playerCount,
            record.aiCount,
            record.mainPlayerId,
            record.dreamName ?? null,
            record.grade ?? null,
            JSON.stringify(detail.config ?? record.config),
            JSON.stringify(detail.players),
          ],
        )

        // 插入交易记录
        if (detail.mainPlayerTransactions?.length) {
          const txStmt = db.prepare(
            `INSERT INTO game_transactions 
             (id, gameId, playerId, turnNumber, type, amount, description, assetSymbol, assetQuantity, unitPrice, costBasis, assetName, assetType, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          for (const tx of detail.mainPlayerTransactions) {
            txStmt.run([
              tx.id,
              record.id,
              tx.playerId,
              tx.turnNumber,
              tx.type,
              tx.amount,
              tx.description,
              tx.assetSymbol ?? null,
              tx.assetQuantity ?? null,
              tx.unitPrice ?? null,
              tx.costBasis ?? null,
              tx.assetName ?? null,
              tx.assetType ?? null,
              tx.timestamp,
            ])
          }
          txStmt.free()
        }

        // 插入卡牌历史
        if (detail.mainPlayerCardHistory?.length) {
          const cardStmt = db.prepare(
            `INSERT INTO game_card_history 
             (id, gameId, playerId, turnNumber, type, cardId, cardTitle, cardDescription, action, amount, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          for (const card of detail.mainPlayerCardHistory) {
            cardStmt.run([
              card.id,
              record.id,
              card.playerId,
              card.turnNumber,
              card.type,
              card.cardId,
              card.cardTitle,
              card.cardDescription,
              card.action ?? null,
              card.amount ?? null,
              card.timestamp,
            ])
          }
          cardStmt.free()
        }

        // 插入财务快照
        if (detail.mainPlayerSnapshots?.length) {
          const snapStmt = db.prepare(
            `INSERT INTO game_financial_snapshots 
             (gameId, playerId, turn, cash, totalAssets, totalLiabilities, netWorth, totalIncome, totalExpenses, monthlyCashFlow, stockValue, realEstateValue, businessValue)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          for (const snap of detail.mainPlayerSnapshots) {
            snapStmt.run([
              record.id,
              record.mainPlayerId,
              snap.turn,
              snap.cash,
              snap.totalAssets,
              snap.totalLiabilities,
              snap.netWorth,
              snap.totalIncome,
              snap.totalExpenses,
              snap.monthlyCashFlow,
              snap.stockValue,
              snap.realEstateValue,
              snap.businessValue,
            ])
          }
          snapStmt.free()
        }

        migrated++
      }
    }

    if (migrated > 0) {
      saveDBToIndexedDB()
      // 迁移完成后保留 localStorage 作为备份（不删除）
    }

    return migrated
  } catch (e) {
    console.error('Failed to migrate from localStorage:', e)
    return 0
  }
}
