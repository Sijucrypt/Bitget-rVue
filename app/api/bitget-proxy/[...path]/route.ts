import { NextRequest } from "next/server";
import { fetch as undiciFetch } from "undici";
import { dohModelAgent } from "@/lib/net/doh";

export const dynamic = "force-dynamic";

async function proxy(request: NextRequest, context: any) {
  const params = await context.params;
  const path = params.path.join("/");
  const searchParams = request.nextUrl.searchParams.toString();
  const query = searchParams ? `?${searchParams}` : "";
  const url = `https://hackathon.bitgetops.com/v1/${path}${query}`;
  
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");

  try {
    const response = await undiciFetch(url, {
      dispatcher: dohModelAgent,
      method: request.method,
      headers: headers as any,
      body: request.method !== "GET" && request.method !== "HEAD" ? await request.arrayBuffer() : undefined,
      duplex: 'half'
    });
    
    const responseHeaders = new Headers(response.headers as any);
    responseHeaders.delete("content-encoding");

    return new Response(response.body as any, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "proxy_failed", detail: String(error) }), { status: 502, headers: { "content-type": "application/json" } });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
export const PATCH = proxy;
