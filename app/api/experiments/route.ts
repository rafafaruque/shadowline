import { NextResponse } from "next/server";
import { experimentActionSchema } from "@/lib/experiments/schemas";
import {
  approveIntervention,
  diagnoseBaseline,
  editIntervention,
  executeIntervention,
} from "@/lib/experiments/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development")
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  let origin: URL;
  try {
    origin = new URL(request.headers.get("origin") ?? "");
  } catch {
    return NextResponse.json(
      { error: "Local, same-origin requests only." },
      { status: 403 },
    );
  }
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname) ||
    origin.origin !== request.headers.get("origin") ||
    origin.host !== request.headers.get("host") ||
    origin.protocol !== new URL(request.url).protocol
  )
    return NextResponse.json(
      { error: "Local, same-origin requests only." },
      { status: 403 },
    );
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return NextResponse.json(
      { error: "Expected application/json." },
      { status: 415 },
    );
  let payload: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Missing body");
    let size = 0;
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 12000) {
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
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = experimentActionSchema.safeParse(payload);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid experiment action or intervention fields." },
      { status: 400 },
    );
  try {
    const action = parsed.data;
    const record =
      action.action === "diagnose"
        ? await diagnoseBaseline(action.baselineRunId)
        : action.action === "edit"
          ? await editIntervention(action.id, action.revision, action.draft)
          : action.action === "approve"
            ? await approveIntervention(
                action.id,
                action.revision,
                action.proposalSha256,
                "UI",
              )
            : await executeIntervention(action.id, action.proposalSha256);
    return NextResponse.json(record, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Experiment could not complete.",
      },
      { status: 409 },
    );
  }
}
