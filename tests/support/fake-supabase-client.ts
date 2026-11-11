/**
 * Adaptador que expõe o MemoryBackend com a mesma interface do cliente supabase-js
 * usada pela camada de serviços (from/select/order/eq/insert/upsert/update/delete,
 * single/maybeSingle e auth). Permite testar serviços + regras + "banco" juntos.
 */
import {
  BackendFailure,
  MemoryBackend,
  project,
  type Filter,
  type Row,
  type TableName,
} from "./memory-backend";

type Result<T> = { data: T | null; error: { message: string; code?: string } | null };

class QueryBuilder implements PromiseLike<Result<unknown>> {
  private filters: Filter[] = [];
  private orderBy: { column: string; ascending: boolean } | undefined;
  private selectCols: string | null = null;
  private mode: "many" | "single" | "maybeSingle" = "many";
  private action: "select" | "insert" | "upsert" | "update" | "delete" = "select";
  private payload: Row[] = [];
  private patch: Row = {};
  private onConflict: string[] = [];
  private returning = false;

  constructor(
    private readonly client: FakeSupabaseClient,
    private readonly table: TableName,
  ) {}

  select(cols = "*") {
    this.selectCols = cols;
    if (this.action !== "select") this.returning = true;
    return this;
  }
  order(column: string, opts: { ascending?: boolean } = {}) {
    this.orderBy = { column, ascending: opts.ascending ?? true };
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push({ column, op: "eq", value: String(value) });
    return this;
  }
  insert(rows: Row | Row[]) {
    this.action = "insert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  upsert(rows: Row | Row[], opts: { onConflict?: string } = {}) {
    this.action = "upsert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    this.onConflict = (opts.onConflict ?? "id").split(",").map((s) => s.trim());
    return this;
  }
  update(patch: Row) {
    this.action = "update";
    this.patch = patch;
    return this;
  }
  delete() {
    this.action = "delete";
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybeSingle";
    return this;
  }

  private execute(): Result<unknown> {
    const db = this.client.backend;
    const uid = this.client.currentUserId;
    try {
      if (this.client.rawResponse) {
        const raw = this.client.rawResponse;
        this.client.rawResponse = null;
        return { data: raw as unknown, error: null };
      }
      let rows: Row[];
      switch (this.action) {
        case "select":
          rows = db.select(this.table, uid, this.filters, this.orderBy);
          break;
        case "insert":
          rows = db.insert(this.table, uid, this.payload);
          break;
        case "upsert":
          rows = db.upsert(this.table, uid, this.payload, this.onConflict);
          break;
        case "update":
          rows = db.update(this.table, uid, this.patch, this.filters);
          break;
        case "delete":
          rows = db.delete(this.table, uid, this.filters);
          break;
      }
      const shaped =
        this.action === "select" || this.returning ? project(rows, this.selectCols) : [];
      if (this.mode === "single") {
        if (shaped.length !== 1) {
          return {
            data: null,
            error: {
              message: "JSON object requested, multiple (or no) rows returned",
              code: "PGRST116",
            },
          };
        }
        return { data: shaped[0]!, error: null };
      }
      if (this.mode === "maybeSingle") return { data: shaped[0] ?? null, error: null };
      return { data: this.action === "select" || this.returning ? shaped : null, error: null };
    } catch (e) {
      if (e instanceof BackendFailure)
        return { data: null, error: { message: e.error.message, code: e.error.code } };
      throw e;
    }
  }

  then<R1 = Result<unknown>, R2 = never>(
    onfulfilled?: ((value: Result<unknown>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return Promise.resolve()
      .then(() => this.execute())
      .then(onfulfilled, onrejected);
  }
}

export class FakeSupabaseClient {
  currentUserId: string | null = null;
  /** Quando definido, a próxima consulta devolve esse valor bruto (resposta inválida simulada). */
  rawResponse: unknown = null;
  signOutCalls: string[] = [];
  passwordUpdates: string[] = [];

  constructor(readonly backend: MemoryBackend = new MemoryBackend()) {}

  from(table: TableName) {
    return new QueryBuilder(this, table);
  }

  signInAs(userId: string | null) {
    this.currentUserId = userId;
  }

  auth = {
    getUser: async () => {
      const user = this.backend.users.find((u) => u.id === this.currentUserId);
      return user
        ? { data: { user: { id: user.id, email: user.email } }, error: null }
        : { data: { user: null }, error: { message: "Auth session missing!" } };
    },
    getSession: async () => ({
      data: { session: this.currentUserId ? { access_token: "fake" } : null },
      error: null,
    }),
    updateUser: async (attrs: { password?: string }) => {
      if (!this.currentUserId)
        return { data: { user: null }, error: { message: "Auth session missing!" } };
      const user = this.backend.users.find((u) => u.id === this.currentUserId)!;
      if (attrs.password) {
        if (attrs.password === user.password) {
          return {
            data: { user: null },
            error: { message: "New password should be different from the old password." },
          };
        }
        user.password = attrs.password;
        this.passwordUpdates.push(attrs.password);
      }
      return { data: { user: { id: user.id } }, error: null };
    },
    signOut: async (opts: { scope?: string } = {}) => {
      this.signOutCalls.push(opts.scope ?? "global");
      if (opts.scope !== "others") this.currentUserId = null;
      return { error: null };
    },
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
  };
}
