import type { AIProvider, ProviderId } from "./types";
import { noneProvider } from "./providers/none";
import { huggingfaceProvider } from "./providers/huggingface";
import { lmstudioProvider } from "./providers/lmstudio";
import { opencodeProvider } from "./providers/opencode";

const providers = new Map<ProviderId, AIProvider>();

providers.set("none", noneProvider);
providers.set("huggingface", huggingfaceProvider);
providers.set("lmstudio", lmstudioProvider);
providers.set("opencode", opencodeProvider);

export function getProvider(id: ProviderId): AIProvider {
  const provider = providers.get(id);
  if (!provider) {
    throw new Error(`Unknown provider: ${id}`);
  }
  return provider;
}

export function getRegisteredProviders(): AIProvider[] {
  return Array.from(providers.values());
}
