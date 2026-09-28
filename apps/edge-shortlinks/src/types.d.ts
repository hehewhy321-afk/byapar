// Standalone ambient types for Cloudflare Workers & D1
export {};

declare global {
  interface D1PreparedStatement {
    bind(...values: any[]): D1PreparedStatement;
    first<T = unknown>(colName?: string): Promise<T | null>;
    run<T = unknown>(): Promise<{ success: boolean; results?: T[]; meta?: any }>;
    all<T = unknown>(): Promise<{ success: boolean; results: T[]; meta?: any }>;
  }

  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    exec(query: string): Promise<{ count: number; duration: number }>;
  }

  interface Hyperdrive {
    connectionString: string;
    host: string;
    port: number;
    user: string;
    password?: string;
    database: string;
  }

  interface ExecutionContext {
    waitUntil(promise: Promise<any>): void;
    passThroughOnException(): void;
  }
}
