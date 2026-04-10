declare module "sql.js" {
  export type BindParams = Array<string | number | null>;

  export interface Statement {
    bind(values: BindParams): void;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): void;
  }

  export interface Database {
    exec(sql: string): void;
    run(sql: string, params?: BindParams): void;
    prepare(sql: string): Statement;
    export(): Uint8Array;
  }

  export interface SqlJsStatic {
    Database: {
      new (data?: Uint8Array | Buffer): Database;
    };
  }

  export type SqlJsConfig = {
    locateFile?: (file: string) => string;
  };

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
}
