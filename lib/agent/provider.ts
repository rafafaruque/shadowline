import { z } from "zod";
import {
  agentProposalSchema,
  type ContextSnapshot,
  type RealAgentRun,
} from "./schemas";

export interface ProviderResult {
  text: string;
  model: string;
  responseId: string | null;
  tokenUsage: RealAgentRun["tokenUsage"];
  error: string | null;
}
export interface ModelProvider {
  readonly id: string;
  generate(context: ContextSnapshot): Promise<ProviderResult>;
}
/** Upstream transport/API failure, not a generated-code outcome. */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number | null = null,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
export function configuredModel() {
  return process.env.SHADOWLINE_MODEL?.trim() || "gemini-3.7-flash";
}

const responseSchema = z.object({
  modelVersion: z.string().optional(),
  responseId: z.string().optional(),
  candidates: z
    .array(
      z.object({
        finishReason: z.string().optional(),
        content: z
          .object({
            parts: z.array(
              z.object({
                text: z.string().optional(),
                thought: z.boolean().optional(),
              }),
            ),
          })
          .optional(),
      }),
    )
    .optional(),
  usageMetadata: z
    .object({
      promptTokenCount: z.number().default(0),
      cachedContentTokenCount: z.number().default(0),
      candidatesTokenCount: z.number().default(0),
      thoughtsTokenCount: z.number().default(0),
      totalTokenCount: z.number().default(0),
    })
    .optional(),
});

/** Server-only REST adapter: exactly one request, no SDK retries, tools, or fallback. */
export function geminiProvider(): ModelProvider {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey)
    throw new Error(
      "Set GEMINI_API_KEY in .env.local before running a coding agent.",
    );
  return {
    id: "gemini",
    async generate(context) {
      if (!/^gemini-[a-z0-9.-]+$/.test(context.model))
        throw new Error("Invalid Gemini model identifier.");
      let response: Response;
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${context.model}:generateContent`,
          {
            method: "POST",
            redirect: "error",
            signal: AbortSignal.timeout(180_000),
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: context.systemPrompt }] },
              contents: [
                { role: "user", parts: [{ text: context.userPrompt }] },
              ],
              generationConfig: {
                candidateCount: 1,
                maxOutputTokens: 12000,
                responseFormat: {
                  text: {
                    mimeType: "APPLICATION_JSON",
                    schema: z.toJSONSchema(agentProposalSchema),
                  },
                },
              },
            }),
          },
        );
      } catch {
        throw new ProviderError(
          "Gemini request failed or timed out. No automatic retry was made.",
        );
      }
      // Never persist provider error bodies: they may echo credentials or request details.
      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        throw new ProviderError(
          `Gemini returned HTTP ${response.status}. Check model access, key, and free-tier quota. No automatic retry was made.`,
          response.status,
        );
      }
      const reader = response.body?.getReader();
      if (!reader)
        throw new ProviderError("Gemini returned an empty response.");
      const chunks: Uint8Array[] = [];
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read().catch(() => {
          throw new ProviderError(
            "Gemini response was interrupted. No automatic retry was made.",
          );
        });
        if (done) break;
        size += value.byteLength;
        if (size > 1_000_000) {
          await reader.cancel();
          throw new Error("Gemini response exceeded the size limit.");
        }
        chunks.push(value);
      }
      const result = responseSchema.parse(
        JSON.parse(Buffer.concat(chunks).toString("utf8")),
      );
      const candidate = result.candidates?.[0];
      const text =
        candidate?.content?.parts
          .filter((part) => !part.thought)
          .map((part) => part.text ?? "")
          .join("") ?? "";
      const usage = result.usageMetadata;
      return {
        text,
        model: result.modelVersion ?? context.model,
        responseId: result.responseId ?? null,
        tokenUsage: usage
          ? {
              input: usage.promptTokenCount,
              cachedInput: usage.cachedContentTokenCount,
              output: usage.candidatesTokenCount + usage.thoughtsTokenCount,
              total: usage.totalTokenCount,
            }
          : null,
        error:
          candidate?.finishReason !== "STOP" || !text
            ? `Gemini did not complete structured output (${candidate?.finishReason ?? "blocked or empty"}).`
            : null,
      };
    },
  };
}

/** Optional operator-supplied USD rates; never invent prices for an arbitrary configured model. */
export function estimateCost(usage: RealAgentRun["tokenUsage"]) {
  const raw = [
    process.env.SHADOWLINE_INPUT_USD_PER_MILLION,
    process.env.SHADOWLINE_CACHED_INPUT_USD_PER_MILLION,
    process.env.SHADOWLINE_OUTPUT_USD_PER_MILLION,
  ];
  if (!usage || raw.some((value) => value === undefined || value.trim() === ""))
    return { estimatedInferenceCost: null, costBasis: null };
  const [input, cached, output] = raw.map(Number);
  if (
    [input, cached, output].some((rate) => !Number.isFinite(rate) || rate < 0)
  )
    return { estimatedInferenceCost: null, costBasis: null };
  return {
    estimatedInferenceCost:
      ((usage.input - usage.cachedInput) * input +
        usage.cachedInput * cached +
        usage.output * output) /
      1_000_000,
    costBasis: `Operator-supplied USD / million tokens: input ${input}, cached input ${cached}, output ${output}. Estimate, not an invoice.`,
  };
}
