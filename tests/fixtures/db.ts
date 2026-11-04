// In-process Postgres (PGlite) with the real migrations and just enough of
// Supabase (auth, storage, pg_net, API roles) stubbed in.
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const STUBS = `
  create role anon; create role authenticated; create role service_role;
  create schema auth; create schema storage; create schema net;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}');
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.role() returns text language sql stable as
    $$ select case when auth.uid() is null then 'anon' else 'authenticated' end $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
  alter table storage.objects enable row level security;
  create function net.http_post(url text, headers jsonb, body jsonb) returns bigint language sql as 'select 1::bigint';
`;

export const read = (f: string) => readFileSync(new URL(`../../supabase/migrations/${f}`, import.meta.url), "utf-8");

export interface TestDb {
  db: PGlite;
  one: <T>(sql: string, params?: unknown[]) => Promise<T>;
  /** Run as the API role a browser would have: anon (null) or authenticated with this user id. */
  asUser: (userId: string | null, fn: () => Promise<void>) => Promise<void>;
  addUser: (id: string, email: string, role?: "admin") => Promise<void>;
}

export async function createTestDb(migrations: string[]): Promise<TestDb> {
  const db = new PGlite();
  await db.exec(STUBS);
  for (const f of migrations) {
    try {
      await db.exec(read(f));
    } catch (err) {
      throw new Error(`${f}: ${(err as Error).message}`);
    }
  }
  // Supabase grants these to the API roles; RLS does the real filtering.
  await db.exec(`
    grant usage on schema public, storage to anon, authenticated;
    grant all on all tables in schema public to anon, authenticated;
    grant all on all tables in schema storage to anon, authenticated;
  `);

  const one = async <T>(sql: string, params: unknown[] = []): Promise<T> => {
    const { rows } = await db.query<Record<string, T>>(sql, params);
    return Object.values(rows[0])[0];
  };
  const asUser = async (userId: string | null, fn: () => Promise<void>) => {
    await db.exec(`set role ${userId ? "authenticated" : "anon"}`);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? ""]);
    try {
      await fn();
    } finally {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub', '', false)");
    }
  };
  const addUser = async (id: string, email: string, role?: "admin") => {
    // The signup trigger creates the profile.
    await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
    if (role === "admin") {
      // Fixture only: skip the "only admins can change role" guard trigger.
      await db.exec("set session_replication_role = replica");
      await db.query("update public.profiles set role = 'admin' where id = $1", [id]);
      await db.exec("set session_replication_role = origin");
    }
  };
  return { db, one, asUser, addUser };
}
