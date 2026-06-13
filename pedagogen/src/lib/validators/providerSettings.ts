import { z } from "zod/v4";

export const providerSettingsSchema = z.object({
  provider: z.enum(["none", "huggingface", "lmstudio", "opencode"]),
  huggingfaceToken: z.string().optional(),
  lmstudioUrl: z.string().url().optional(),
  lmstudioModel: z.string().optional(),
  opencodeModel: z.string().optional(),
});

export type ProviderSettings = z.infer<typeof providerSettingsSchema>;

export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  provider: "none",
  huggingfaceToken: "",
  lmstudioUrl: "http://localhost:1234/v1/chat/completions",
  lmstudioModel: "local-model",
  opencodeModel: "opencode/kimi-k2.5-free",
};
