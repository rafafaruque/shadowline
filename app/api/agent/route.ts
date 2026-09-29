import { NextResponse } from "next/server";
import { runCodingAgent } from "@/lib/agent/coding-agent";
import { agentRequestSchema } from "@/lib/agent/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
let inFlight = false;

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development")
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Next's internal request URL may normalize 127.0.0.1 to localhost.
  // Compare the browser Origin to the actual Host header, never proxy headers.
  const originHeader = request.headers.get("origin");
  let origin: URL | undefined;
  try {
    if (originHeader) origin = new URL(originHeader);
  } catch {
    /* rejected below */
  }
  if (
    !origin ||
    !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname) ||
    origin.origin !== originHeader ||
    origin.host !== request.headers.get("host") ||
    origin.protocol !== new URL(request.url).protocol
  ) {
    return NextResponse.json(
      { error: "Local, same-origin requests only." },
      { status: 403 },
    );
  }
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return NextResponse.json(
      { error: "Expected application/json." },
      { status: 415 },
    );
  let payload: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Missing body");
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) {
        await reader.cancel();
        return NextResponse.json(
          { error: "Request body is too large." },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request." },
      { status: 400 },
    );
  }
  const parsed = agentRequestSchema.safeParse(payload);
  if (!parsed.success)
    return NextResponse.json(
      {
        error:
          "Supply only taskId: customers-pagination, configId: baseline or context-rich, and providerId: gemini or codex-cli.",
      },
      { status: 400 },
    );
  // Check only after validation; no await between the check and taking the slot.
  if (inFlight)
    return NextResponse.json(
      { error: "An agent attempt is already running." },
      { status: 409 },
    );
  inFlight = true;
  try {
    return NextResponse.json(await runCodingAgent(parsed.data), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Agent execution could not complete.",
      },
      { status: 500 },
    );
  } finally {
    inFlight = false;
  }
}
