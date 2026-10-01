// HTTP helper. On Android we use Capacitor's native HTTP client (no CORS, proper TLS); in a browser we use fetch.
import { Capacitor, CapacitorHttp } from '@capacitor/core';

export const isNative = () => { try { return Capacitor.isNativePlatform(); } catch { return false; } };

export class HttpError extends Error {
  constructor(status, message, data) { super(message); this.status = status; this.data = data; }
}

/** -> parsed JSON (or text). Throws HttpError for non-2xx. */
export async function http(url, { method = 'GET', headers = {}, json, timeout = 45000 } = {}) {
  const h = { ...headers };
  if (json !== undefined) h['Content-Type'] = 'application/json';
  if (isNative()) {
    let res;
    try {
      res = await CapacitorHttp.request({ url, method, headers: h, data: json, connectTimeout: 15000, readTimeout: timeout, responseType: 'json' });
    } catch (e) { throw new HttpError(0, e?.message || 'Network error'); }
    let data = res.data;
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch { /* keep text */ } }
    if (res.status < 200 || res.status >= 300) throw new HttpError(res.status, errMessage(res.status, data), data);
    return data;
  }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(url, { method, headers: h, body: json !== undefined ? JSON.stringify(json) : undefined, signal: ctl.signal });
    const text = await res.text();
    let data = text;
    try { data = JSON.parse(text); } catch { /* keep text */ }
    if (!res.ok) throw new HttpError(res.status, errMessage(res.status, data), data);
    return data;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(0, e?.name === 'AbortError' ? 'Request timed out' : 'No internet connection');
  } finally { clearTimeout(timer); }
}

function errMessage(status, data) {
  const m = data?.error?.message || data?.error || data?.message || (typeof data === 'string' ? data.slice(0, 200) : '');
  if (status === 401 || status === 403) return `Access denied (${status}). Check your API key. ${typeof m === 'string' ? m : ''}`.trim();
  if (status === 429) return 'Rate limit reached – free tiers are limited. Wait a minute and try again.';
  return typeof m === 'string' && m ? `${m} (${status})` : `Request failed (${status})`;
}
