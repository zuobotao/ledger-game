// sql.js TypeScript type declarations (minimal, for our use case)
declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: typeof Database
  }

  export interface QueryExecResult {
    columns: string[]
    values: any[][]
  }

  export class Database {
    constructor(data?: Uint8Array | number[] | null)
    run(sql: string, params?: any[]): Database
    exec(sql: string, params?: any[]): QueryExecResult[]
    prepare(sql: string, params?: any[]): Statement
    export(): Uint8Array
    close(): void
    getRowsModified(): number
  }

  export interface Statement {
    run(params?: any[]): void
    get(params?: any[]): any[]
    step(): boolean
    getAsObject(params?: any[]): Record<string, any>
    free(): boolean
    reset(): void
    bind(params?: any[]): boolean
  }

  export interface SqlJsConfig {
    locateFile?: (file: string) => string
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>
}
