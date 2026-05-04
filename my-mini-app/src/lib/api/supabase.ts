const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) ?? "";
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_KEY as string) ?? "";

const headers = {
  apikey: SUPABASE_KEY,
  authorization: `Bearer ${SUPABASE_KEY}`,
  "content-type": "application/json",
  prefer: "return=representation",
};

export async function supabaseGet<T>(table: string, query: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers });
  if (!res.ok) throw new Error(`Supabase GET ${table} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function supabasePost<T>(table: string, body: unknown): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...headers, prefer: "return=representation,resolution=merge-duplicates" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase POST ${table} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function supabasePatch<T>(table: string, query: string, body: unknown): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${table} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function supabaseDelete(table: string, query: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error(`Supabase DELETE ${table} failed: ${res.status}`);
}
