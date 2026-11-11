/**
 * Backend em memória que imita o comportamento relevante do Supabase/PostgREST:
 * - tabelas do Bloom com chaves únicas (user_id+log_date, user_id em preferências, id em perfis);
 * - Row Level Security: cada operação só enxerga/alteras linhas da usuária autenticada;
 * - erros com os mesmos códigos usados pelo PostgREST (42501, 23505, PGRST116).
 *
 * Usado pelos testes de integração (adaptador do cliente JS) e pelos testes E2E
 * (adaptador HTTP no Playwright). Nunca contém dados reais.
 */

export type TableName = "cycles" | "daily_logs" | "mood_logs" | "profiles" | "user_preferences";
export type Row = Record<string, unknown>;

export interface Filter {
  column: string;
  op: "eq";
  value: string;
}

export interface BackendError {
  status: number;
  code: string;
  message: string;
}

export class BackendFailure extends Error {
  constructor(readonly error: BackendError) {
    super(error.message);
  }
}

const OWNER_COLUMN: Record<TableName, string> = {
  cycles: "user_id",
  daily_logs: "user_id",
  mood_logs: "user_id",
  profiles: "id",
  user_preferences: "user_id",
};

const UNIQUE_KEYS: Record<TableName, string[][]> = {
  cycles: [["id"], ["user_id", "start_date"]],
  daily_logs: [["id"], ["user_id", "log_date"]],
  mood_logs: [["id"], ["user_id", "log_date"]],
  profiles: [["id"]],
  user_preferences: [["user_id"]],
};

export interface MemoryUser {
  id: string;
  email: string;
  password: string;
  display_name: string;
  created_at: string;
}

let idCounter = 0;
export function fakeId(prefix = "id"): string {
  idCounter += 1;
  const hex = (idCounter + Math.floor(Math.random() * 1e6))
    .toString(16)
    .padStart(12, "0")
    .slice(-12);
  return `00000000-0000-4000-8000-${hex}`.replace(
    "00000000",
    prefix === "user" ? "11111111" : "00000000",
  );
}

export class MemoryBackend {
  tables: Record<TableName, Row[]> = {
    cycles: [],
    daily_logs: [],
    mood_logs: [],
    profiles: [],
    user_preferences: [],
  };
  users: MemoryUser[] = [];
  /** Log de operações, útil para asserções ("o frontend gravou X?"). */
  log: { op: string; table: TableName; userId: string | null }[] = [];
  private failures: { table: TableName | "*"; error: BackendError }[] = [];

  createUser(email: string, password: string, displayName = ""): MemoryUser {
    if (this.users.some((u) => u.email === email)) {
      throw new BackendFailure({
        status: 422,
        code: "user_already_exists",
        message: "User already registered",
      });
    }
    const user: MemoryUser = {
      id: fakeId("user"),
      email,
      password,
      display_name: displayName,
      created_at: new Date().toISOString(),
    };
    this.users.push(user);
    // Gatilho equivalente ao do banco: cria perfil e preferências padrão
    this.tables.profiles.push({
      id: user.id,
      display_name: displayName || null,
      locale: "pt-BR",
      created_at: user.created_at,
      updated_at: user.created_at,
    });
    this.tables.user_preferences.push({
      user_id: user.id,
      notifications_enabled: false,
      temperature_unit: "celsius",
      locale: "pt-BR",
      average_cycle_length: null,
      average_period_length: null,
      onboarding_completed: false,
      created_at: user.created_at,
      updated_at: user.created_at,
    });
    return user;
  }

  deleteUser(userId: string): void {
    this.users = this.users.filter((u) => u.id !== userId);
    for (const t of Object.keys(this.tables) as TableName[]) {
      this.tables[t] = this.tables[t].filter((r) => r[OWNER_COLUMN[t]] !== userId);
    }
  }

  /** Programa a próxima operação na tabela para falhar (falha de comunicação simulada). */
  failNext(table: TableName | "*", error: Partial<BackendError> = {}): void {
    this.failures.push({
      table,
      error: { status: 503, code: "503", message: "Failed to fetch", ...error },
    });
  }

  private checkFailure(table: TableName): void {
    const idx = this.failures.findIndex((f) => f.table === table || f.table === "*");
    if (idx >= 0) {
      const [f] = this.failures.splice(idx, 1);
      throw new BackendFailure(f!.error);
    }
  }

  private requireUser(userId: string | null): string {
    if (!userId)
      throw new BackendFailure({
        status: 401,
        code: "PGRST301",
        message: "JWT expired or not authenticated",
      });
    return userId;
  }

  private visible(table: TableName, userId: string): Row[] {
    return this.tables[table].filter((r) => r[OWNER_COLUMN[table]] === userId);
  }

  private matches(row: Row, filters: Filter[]): boolean {
    return filters.every((f) => String(row[f.column]) === f.value);
  }

  select(
    table: TableName,
    userId: string | null,
    filters: Filter[] = [],
    order?: { column: string; ascending: boolean },
  ): Row[] {
    this.checkFailure(table);
    this.log.push({ op: "select", table, userId });
    if (!userId) return []; // RLS: anônimo não enxerga nada
    let rows = this.visible(table, userId).filter((r) => this.matches(r, filters));
    if (order) {
      rows = [...rows].sort((a, b) => {
        const cmp = String(a[order.column]).localeCompare(String(b[order.column]));
        return order.ascending ? cmp : -cmp;
      });
    }
    return rows.map((r) => ({ ...r }));
  }

  private assertOwner(table: TableName, userId: string, row: Row): void {
    if (row[OWNER_COLUMN[table]] !== userId) {
      throw new BackendFailure({
        status: 403,
        code: "42501",
        message: `new row violates row-level security policy for table "${table}"`,
      });
    }
  }

  private findConflict(table: TableName, row: Row, keys: string[][]): Row | undefined {
    return this.tables[table].find((r) =>
      keys.some((k) => k.every((c) => row[c] !== undefined && r[c] === row[c])),
    );
  }

  insert(table: TableName, userId: string | null, rows: Row[]): Row[] {
    this.checkFailure(table);
    const uid = this.requireUser(userId);
    this.log.push({ op: "insert", table, userId });
    const out: Row[] = [];
    for (const input of rows) {
      this.assertOwner(table, uid, input);
      const row = this.withDefaults(table, input);
      if (this.findConflict(table, row, UNIQUE_KEYS[table])) {
        throw new BackendFailure({
          status: 409,
          code: "23505",
          message: "duplicate key value violates unique constraint",
        });
      }
      this.tables[table].push(row);
      out.push({ ...row });
    }
    return out;
  }

  upsert(table: TableName, userId: string | null, rows: Row[], onConflict: string[]): Row[] {
    this.checkFailure(table);
    const uid = this.requireUser(userId);
    this.log.push({ op: "upsert", table, userId });
    const out: Row[] = [];
    for (const input of rows) {
      this.assertOwner(table, uid, input);
      const existing = this.findConflict(table, input, [onConflict]);
      if (existing) {
        Object.assign(existing, input, { updated_at: new Date().toISOString() });
        out.push({ ...existing });
      } else {
        const row = this.withDefaults(table, input);
        this.tables[table].push(row);
        out.push({ ...row });
      }
    }
    return out;
  }

  update(table: TableName, userId: string | null, patch: Row, filters: Filter[]): Row[] {
    this.checkFailure(table);
    const uid = this.requireUser(userId);
    this.log.push({ op: "update", table, userId });
    const rows = this.visible(table, uid).filter((r) => this.matches(r, filters));
    for (const r of rows) {
      const next = { ...r, ...patch };
      this.assertOwner(table, uid, next);
      Object.assign(r, patch, { updated_at: new Date().toISOString() });
    }
    return rows.map((r) => ({ ...r }));
  }

  delete(table: TableName, userId: string | null, filters: Filter[]): Row[] {
    this.checkFailure(table);
    const uid = this.requireUser(userId);
    this.log.push({ op: "delete", table, userId });
    const doomed = this.visible(table, uid).filter((r) => this.matches(r, filters));
    this.tables[table] = this.tables[table].filter((r) => !doomed.includes(r));
    return doomed.map((r) => ({ ...r }));
  }

  private withDefaults(table: TableName, input: Row): Row {
    const now = new Date().toISOString();
    const base: Row = { created_at: now, updated_at: now };
    if (table === "cycles") Object.assign(base, { id: fakeId(), end_date: null, notes: null });
    if (table === "daily_logs")
      Object.assign(base, { id: fakeId(), flow_intensity: null, symptoms: [], notes: null });
    if (table === "mood_logs")
      Object.assign(base, { id: fakeId(), moods: [], intensity: null, notes: null });
    if (table === "user_preferences")
      Object.assign(base, {
        notifications_enabled: false,
        temperature_unit: "celsius",
        locale: "pt-BR",
        average_cycle_length: null,
        average_period_length: null,
        onboarding_completed: false,
      });
    if (table === "profiles") Object.assign(base, { display_name: null, locale: "pt-BR" });
    return { ...base, ...input };
  }
}

/** Projeta apenas as colunas pedidas em "select=a, b, c" (ou todas com "*"). */
export function project(rows: Row[], select: string | null): Row[] {
  if (!select || select.trim() === "*") return rows;
  const cols = select
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  return rows.map((r) => Object.fromEntries(cols.map((c) => [c, r[c] ?? null])));
}
