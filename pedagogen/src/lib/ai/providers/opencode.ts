import { createOpencode } from 'ai-sdk-provider-opencode-sdk';
import { streamText } from 'ai';
import type { AIProvider, GenerateRequest, GenerateEvent, GenerateWithToolsRequest, ToolCallResult, Model } from "../types";

// The SDK's default serverTimeout is 10s, but a cold `opencode serve` start
// (first run, Windows, auth refresh) routinely exceeds it and every document
// generation fails with "timed out after 10000ms during server startup".
// 90s covers slow starts; override with OPENCODE_SERVER_TIMEOUT if needed.
const SERVER_TIMEOUT = Number(process.env.OPENCODE_SERVER_TIMEOUT) || 90000;

// OPENCODE_URL connects to an already-running server and skips autostart
// entirely — the most reliable option when OpenCode is slow to boot.
const EXTERNAL_URL = process.env.OPENCODE_URL;

// One module-level instance: the underlying client manager is a process
// singleton whose options are captured on first use, so per-call settings
// would be silently ignored after the first request.
const opencode = createOpencode({
  ...(EXTERNAL_URL ? { baseUrl: EXTERNAL_URL } : {}),
  serverTimeout: SERVER_TIMEOUT,
});

function friendlyOpenCodeError(err: unknown, modelId: string): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('timed out') && message.includes('server startup')) {
    return `OpenCode n'a pas démarré dans le délai imparti (${Math.round(SERVER_TIMEOUT / 1000)}s). Lancez "opencode serve" manuellement dans un terminal puis réessayez, ou définissez OPENCODE_URL=http://127.0.0.1:4096 dans .env.local pour vous connecter à un serveur déjà lancé.`;
  }
  if (message.includes('fetch failed') || message.includes('returned no response data')) {
    return `OpenCode indisponible pour le modèle "${modelId}". Vérifiez qu'OpenCode est lancé ou changez de modèle/fournisseur dans Paramètres. (${message})`;
  }
  return `OpenCode error: ${message}`;
}

const MODELS: Model[] = [
  { id: "opencode/kimi-k2.5-free", name: "Kimi K2.5 Free", provider: "opencode" },
  { id: "opencode/minimax-m2.5-free", name: "MiniMax M2.5 Free", provider: "opencode" },
  { id: "opencode/big-pickle", name: "Big Pickle (GLM 4.6)", provider: "opencode" },
  { id: "opencode/glm-4.7-free", name: "GLM 4.7 Free", provider: "opencode" },
  { id: "opencode/mimo-v2-pro-free", name: "Mimo V2 Pro Free", provider: "opencode" },
];

async function* generate(request: GenerateRequest): AsyncIterable<GenerateEvent> {
  const modelId = request.opencodeModel || request.model || "opencode/big-pickle";

  try {
    const result = streamText({
      model: opencode(modelId),
      system: request.systemPrompt,
      prompt: request.userPrompt,
      // Server startup is the slow part — don't multiply it by the SDK's
      // default 3-attempt retry loop when OpenCode is genuinely down.
      maxRetries: 1,
    });

    let fullText = "";

    for await (const chunk of result.textStream) {
      fullText += chunk;
      yield { type: "chunk", text: chunk };
    }

    yield { type: "done", fullText };
  } catch (err) {
    yield { type: "error", message: friendlyOpenCodeError(err, modelId) };
  }
}

function messagesToPrompt(messages: { role: string; content: string }[]): string {
  return messages
    .map(m => {
      switch (m.role) {
        case 'system': return `[System]\n${m.content}\n`;
        case 'user': return `[User]\n${m.content}\n`;
        case 'assistant': return `[Assistant]\n${m.content}\n`;
        default: return m.content;
      }
    })
    .join('\n');
}

async function generateWithTools(request: GenerateWithToolsRequest): Promise<ToolCallResult> {
  const modelId = request.opencodeModel || request.model || "opencode/big-pickle";

  let promptText: string;
  if (request.messages) {
    promptText = messagesToPrompt(request.messages);
  } else {
    promptText = `[System]\n${request.systemPrompt}\n\n[User]\n${request.userPrompt}`;
  }

  if (request.tools && request.tools.length > 0) {
    const tool = request.tools[0]!;
    promptText += `\n\n[INSTRUCTION]\nYou MUST respond with ONLY valid JSON matching this schema. No other text.
Schema: ${JSON.stringify(tool.function.parameters)}
Generate the JSON for "${tool.function.name}" now.`;
  }

  try {
    const result = streamText({
      model: opencode(modelId),
      prompt: promptText,
      maxRetries: 1,
    });

    let fullText = "";
    for await (const chunk of result.textStream) {
      fullText += chunk;
    }

    const toolName = request.tools?.[0]?.function?.name;
    const contentBlocks: unknown[] = [];
    const toolResults: Record<string, unknown> = {};

    if (toolName) {
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      let parsed: Record<string, unknown> = {};
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          parsed = { raw: fullText };
        }
      } else if (fullText.trim()) {
        parsed = { raw: fullText.trim() };
      }

      // Unwrap tool wrapper if the model returned an enclosing key
      if (parsed && typeof parsed === 'object') {
        const docType = toolName.replace('generate_', '');
        if (parsed[toolName] && typeof parsed[toolName] === 'object') {
          parsed = parsed[toolName] as Record<string, unknown>;
        } else if (parsed[docType] && typeof parsed[docType] === 'object') {
          parsed = parsed[docType] as Record<string, unknown>;
        } else if (parsed.arguments && typeof parsed.arguments === 'object') {
          parsed = parsed.arguments as Record<string, unknown>;
        } else if (typeof parsed.arguments === 'string') {
          try { parsed = JSON.parse(parsed.arguments); } catch {}
        }
      }

      toolResults[toolName] = parsed;
      contentBlocks.push({ type: 'tool_use', name: toolName, input: parsed });
    } else {
      contentBlocks.push({ type: 'text', text: fullText });
    }

    return {
      content: contentBlocks,
      toolResults,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  } catch (err) {
    throw new Error(friendlyOpenCodeError(err, modelId));
  }
}

export const opencodeProvider: AIProvider = {
  id: "opencode",
  name: "OpenCode",
  models: MODELS,
  generate,
  generateWithTools,
};
