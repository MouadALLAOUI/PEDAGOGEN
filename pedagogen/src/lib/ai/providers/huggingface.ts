import type { AIProvider, GenerateRequest, GenerateEvent, GenerateWithToolsRequest, ToolCallResult, Model } from "../types";
import { callHuggingFace } from '@/lib/agents/agentTools';

const MODELS: Model[] = [
  { id: "openai/gpt-oss-120b:fastest", name: "GPT-OSS-120B (Fastest)", provider: "huggingface" },
];

async function* generate(request: GenerateRequest): AsyncIterable<GenerateEvent> {
  const token = request.apiKey || process.env.HF_TOKEN;
  if (!token) {
    yield { type: "error", message: "Aucun token HuggingFace configuré. Ajoutez-le dans Paramètres." };
    return;
  }

  const model = request.model || MODELS[0]!.id;
  const url = `https://router.huggingface.co/v1/chat/completions`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: request.systemPrompt },
          { role: "user", content: request.userPrompt },
        ],
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature || 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      yield { type: "error", message: `HuggingFace API error: ${response.status} — ${error}` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", message: "No response body from HuggingFace" };
      return;
    }

    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            yield { type: "chunk", text: content };
          }
        } catch {
          // skip malformed JSON lines
        }
      }
    }

    yield { type: "done", fullText };
  } catch (err) {
    yield { type: "error", message: `HuggingFace connection error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function generateWithTools(request: GenerateWithToolsRequest): Promise<ToolCallResult> {
  return callHuggingFace(
    request.messages || [
      { role: 'system', content: request.systemPrompt },
      { role: 'user', content: request.userPrompt },
    ],
    undefined,
    request.tools as any,
    request.maxTokens || 4096,
    request.model || MODELS[0]!.id,
    { signal: request.signal },
  );
}

export const huggingfaceProvider: AIProvider = {
  id: "huggingface",
  name: "HuggingFace",
  models: MODELS,
  generate,
  generateWithTools,
};
