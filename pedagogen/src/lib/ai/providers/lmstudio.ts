import type { AIProvider, GenerateRequest, GenerateEvent, GenerateWithToolsRequest, ToolCallResult, Model } from "../types";
import { callLocalModel } from '@/lib/agents/agentTools';

const DEFAULT_URL = "http://localhost:1234/v1/chat/completions";
const DEFAULT_MODEL = "local-model";

const MODELS: Model[] = [
  { id: "local-model", name: "LM Studio (Local)", provider: "lmstudio" },
];

async function* generate(request: GenerateRequest): AsyncIterable<GenerateEvent> {
  const baseUrl = request.baseUrl || request.model || DEFAULT_URL;
  const modelName = request.modelName || DEFAULT_MODEL;

  try {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
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
      yield { type: "error", message: `LM Studio error: ${response.status} — ${error}` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", message: "No response body from LM Studio" };
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
    yield { type: "error", message: `LM Studio connection error: ${err instanceof Error ? err.message : String(err)}. Make sure LM Studio is running.` };
  }
}

async function generateWithTools(request: GenerateWithToolsRequest): Promise<ToolCallResult> {
  return callLocalModel(
    request.messages || [
      { role: 'system', content: request.systemPrompt },
      { role: 'user', content: request.userPrompt },
    ],
    undefined,
    request.tools as any,
    request.maxTokens || 4096,
    request.modelName || DEFAULT_MODEL,
    request.baseUrl || DEFAULT_URL,
    'openai',
    request.signal,
  );
}

export const lmstudioProvider: AIProvider = {
  id: "lmstudio",
  name: "LM Studio",
  models: MODELS,
  generate,
  generateWithTools,
};
