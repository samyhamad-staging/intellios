/**
 * Thin fetch wrapper that throws on non-2xx responses.
 * Use instead of fetch(...).then(r => r.json()) everywhere.
 */
export async function fetchJson<T = any>(
  url: string,
  opts?: RequestInit,
): Promise<T> {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
  return r.json() as Promise<T>;
}
