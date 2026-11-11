/**
 * Simulador HTTP do Supabase para os testes de sistema (E2E).
 * Intercepta, no navegador do Playwright, as chamadas a /auth/v1 e /rest/v1
 * e as resolve no MemoryBackend (com RLS). Assim a jornada completa roda de
 * ponta a ponta — interface real, roteamento real, cliente supabase-js real —
 * sem tocar em dados reais e sem depender de rede.
 */
import type { Page, Route } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  BackendFailure,
  MemoryBackend,
  project,
  type Filter,
  type TableName,
} from "../../support/memory-backend";

export function supabaseUrl(): string {
  if (process.env["VITE_SUPABASE_URL"]) return process.env["VITE_SUPABASE_URL"];
  const env = readFileSync(new URL("../../../.env", import.meta.url), "utf8");
  const match = /^VITE_SUPABASE_URL="?([^"\n]+)"?/m.exec(env);
  if (!match) throw new Error("VITE_SUPABASE_URL não encontrado no .env");
  return match[1]!.replace(/\/+$/, "");
}

const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString("base64url");

export class MockSupabase {
  readonly backend = new MemoryBackend();
  private tokens = new Map<string, string>(); // access_token -> userId
  /** Quando true, toda chamada REST falha (simula nuvem fora do ar). */
  offline = false;
  requests: { method: string; path: string }[] = [];

  issueSession(userId: string) {
    const user = this.backend.users.find((u) => u.id === userId)!;
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const access_token = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: user.id, email: user.email, role: "authenticated", aud: "authenticated", exp })}.dGVzdA`;
    this.tokens.set(access_token, user.id);
    return {
      access_token,
      token_type: "bearer",
      expires_in: 3600,
      expires_at: exp,
      refresh_token: `refresh-${user.id}-${Date.now()}`,
      user: this.userJson(user.id),
    };
  }

  userJson(userId: string) {
    const u = this.backend.users.find((x) => x.id === userId)!;
    return {
      id: u.id,
      aud: "authenticated",
      role: "authenticated",
      email: u.email,
      email_confirmed_at: u.created_at,
      last_sign_in_at: new Date().toISOString(),
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: { display_name: u.display_name },
      identities: [],
      created_at: u.created_at,
      updated_at: u.created_at,
    };
  }

  private uidFrom(route: Route): string | null {
    const auth = route.request().headers()["authorization"] ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    return this.tokens.get(token) ?? null;
  }

  async install(page: Page) {
    const base = supabaseUrl();
    await page.route(`${base}/auth/v1/**`, (route) => this.handleAuth(route));
    await page.route(`${base}/rest/v1/**`, (route) => this.handleRest(route));
  }

  private json(route: Route, status: number, body: unknown) {
    return route.fulfill({
      status,
      contentType: "application/json",
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "*",
      },
      body: body === undefined ? "" : JSON.stringify(body),
    });
  }

  private async handleAuth(route: Route) {
    const req = route.request();
    const url = new URL(req.url());
    this.requests.push({ method: req.method(), path: url.pathname });
    if (req.method() === "OPTIONS") return this.json(route, 200, {});
    const path = url.pathname.replace(/^.*\/auth\/v1/, "");
    const body = (req.postDataJSON() ?? {}) as Record<string, unknown>;

    if (path === "/signup" && req.method() === "POST") {
      try {
        const data = (body["data"] ?? {}) as Record<string, string>;
        const user = this.backend.createUser(
          String(body["email"]),
          String(body["password"]),
          data["display_name"] ?? "",
        );
        return this.json(route, 200, this.issueSession(user.id));
      } catch {
        return this.json(route, 422, {
          code: 422,
          error_code: "user_already_exists",
          msg: "User already registered",
        });
      }
    }
    if (path === "/token" && url.searchParams.get("grant_type") === "password") {
      const user = this.backend.users.find(
        (u) => u.email === body["email"] && u.password === body["password"],
      );
      if (!user)
        return this.json(route, 400, {
          code: 400,
          error_code: "invalid_credentials",
          msg: "Invalid login credentials",
        });
      return this.json(route, 200, this.issueSession(user.id));
    }
    if (path === "/token" && url.searchParams.get("grant_type") === "refresh_token") {
      const userId = String(body["refresh_token"] ?? "")
        .split("-")
        .slice(1, -1)
        .join("-");
      if (!this.backend.users.some((u) => u.id === userId))
        return this.json(route, 400, {
          error_code: "refresh_token_not_found",
          msg: "Invalid Refresh Token",
        });
      return this.json(route, 200, this.issueSession(userId));
    }
    if (path === "/user") {
      const uid = this.uidFrom(route);
      if (!uid || !this.backend.users.some((u) => u.id === uid))
        return this.json(route, 401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
      if (req.method() === "PUT") {
        const u = this.backend.users.find((x) => x.id === uid)!;
        if (typeof body["password"] === "string") {
          if (body["password"] === u.password)
            return this.json(route, 422, {
              code: 422,
              error_code: "same_password",
              msg: "New password should be different from the old password.",
            });
          u.password = body["password"];
        }
      }
      return this.json(route, 200, this.userJson(uid));
    }
    if (path === "/logout") {
      const uid = this.uidFrom(route);
      const scope = url.searchParams.get("scope") ?? "global";
      for (const [t, u] of this.tokens) {
        const current = route.request().headers()["authorization"]?.endsWith(t);
        if (
          u === uid &&
          (scope === "global" || (scope === "others" && !current) || (scope === "local" && current))
        )
          this.tokens.delete(t);
      }
      return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
    }
    return this.json(route, 404, { msg: `rota de auth não simulada: ${path}` });
  }

  private async handleRest(route: Route) {
    const req = route.request();
    const url = new URL(req.url());
    this.requests.push({ method: req.method(), path: url.pathname + url.search });
    if (req.method() === "OPTIONS") return this.json(route, 200, {});
    if (this.offline) return route.abort("internetdisconnected");

    const table = url.pathname.split("/").pop() as TableName;
    const uid = this.uidFrom(route);
    const filters: Filter[] = [];
    let order: { column: string; ascending: boolean } | undefined;
    for (const [k, v] of url.searchParams) {
      if (k === "select" || k === "on_conflict" || k === "columns") continue;
      if (k === "order") {
        const [column, dir] = v.split(".");
        order = { column: column!, ascending: dir !== "desc" };
        continue;
      }
      if (v.startsWith("eq."))
        filters.push({ column: k, op: "eq", value: decodeURIComponent(v.slice(3)) });
    }
    const select = url.searchParams.get("select");
    const accept = req.headers()["accept"] ?? "";
    const prefer = req.headers()["prefer"] ?? "";
    const wantsObject = accept.includes("vnd.pgrst.object");
    const returning = prefer.includes("return=representation");

    try {
      let rows;
      const payload = req.postDataJSON() as
        Record<string, unknown> | Record<string, unknown>[] | null;
      const list = payload ? (Array.isArray(payload) ? payload : [payload]) : [];
      switch (req.method()) {
        case "GET":
        case "HEAD":
          rows = this.backend.select(table, uid, filters, order);
          break;
        case "POST":
          rows = prefer.includes("resolution=merge-duplicates")
            ? this.backend.upsert(
                table,
                uid,
                list,
                (url.searchParams.get("on_conflict") ?? "id").split(","),
              )
            : this.backend.insert(table, uid, list);
          break;
        case "PATCH":
          rows = this.backend.update(
            table,
            uid,
            (payload ?? {}) as Record<string, unknown>,
            filters,
          );
          break;
        case "DELETE":
          rows = this.backend.delete(table, uid, filters);
          break;
        default:
          return this.json(route, 405, { message: "método não simulado" });
      }
      const shaped = project(rows, select);
      if (req.method() !== "GET" && !returning)
        return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
      if (wantsObject) {
        if (shaped.length !== 1)
          return this.json(route, 406, {
            code: "PGRST116",
            message: "JSON object requested, multiple (or no) rows returned",
            details: `The result contains ${shaped.length} rows`,
            hint: null,
          });
        return this.json(route, 200, shaped[0]);
      }
      return this.json(route, 200, shaped);
    } catch (e) {
      if (e instanceof BackendFailure)
        return this.json(route, e.error.status, {
          code: e.error.code,
          message: e.error.message,
          details: null,
          hint: null,
        });
      throw e;
    }
  }
}
