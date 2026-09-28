// Cloudflare Pages Function —— Supabase 反向代理
const SUPABASE_ORIGIN = "https://jjhterjiydwpdzukicen.supabase.co";

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  if (url.pathname === "/" || url.pathname === "/health") {
    return new Response(
      "supabase-proxy OK\n" +
      "target: " + SUPABASE_ORIGIN + "\n" +
      "time: " + new Date().toISOString() + "\n",
      { headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  }

  const target = SUPABASE_ORIGIN + url.pathname + url.search;

  const headers = new Headers(request.headers);
  ["host", "cf-connecting-ip", "cf-ipcountry", "cf-ray",
   "cf-visitor", "x-forwarded-proto", "x-real-ip"].forEach(function (k) {
    headers.delete(k);
  });

  const init = { method: request.method, headers: headers, redirect: "manual" };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  let resp;
  try {
    resp = await fetch(target, init);
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "proxy_fetch_failed", detail: String(e) }),
      { status: 502, headers: { "content-type": "application/json" } }
    );
  }

  const out = new Headers(resp.headers);
  out.set("Access-Control-Allow-Origin", request.headers.get("Origin") || "*");
  out.set("Access-Control-Allow-Credentials", "true");
  out.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  out.set("Access-Control-Allow-Headers",
    request.headers.get("Access-Control-Request-Headers") ||
    "apikey,content-type,authorization,x-client-info,prefer,x-supabase-api-version");
  out.set("Vary", "Origin");
  out.delete("content-security-policy");
  out.delete("content-encoding");
  out.delete("transfer-encoding");

  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers: out
  });
}
