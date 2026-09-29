import { geminiProvider } from "./provider";
import { codexCliProvider } from "./codex-cli";
import type { ProviderId } from "./schemas";

export function createProvider(id: ProviderId) {
  return id === "codex-cli" ? codexCliProvider() : geminiProvider();
}
