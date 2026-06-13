import { opencode } from 'ai-sdk-provider-opencode-sdk';
import { streamText } from 'ai';
import type { AIProvider, GenerateRequest, GenerateEvent, GenerateWithToolsRequest, ToolCallResult, Model } from "../types";

const MODELS: Model[] = [
  { id: "opencode/kimi-k2.5-free", name: "Kimi K2.5 Free", provider: "opencode" },
  { id: "opencode/minimax-m2.5-free", name: "MiniMax M2.5 Free", provider: "opencode" },
  { id: "opencode/big-pickle", name: "Big Pickle (GLM 4.6)", provider: "opencode" },
  { id: "opencode/glm-4.7-free", name: "GLM 4.7 Free", provider: "opencode" },
  { id: "opencode/mimo-v2-pro-free", name: "Mimo V2 Pro Free", provider: "opencode" },
];

async function* generate(request: GenerateRequest): AsyncIterable<GenerateEvent> {
  const modelId = request.opencodeModel || request.model || "opencode/kimi-k2.5-free";

  try {
    const result = streamText({
      model: opencode(modelId),
      system: request.systemPrompt,
      prompt: request.userPrompt,
    });

    let fullText = "";

    for await (const chunk of result.textStream) {
      fullText += chunk;
      yield { type: "chunk", text: chunk };
    }

    yield { type: "done", fullText };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    yield { type: "error", message: `OpenCode error: ${message}` };
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
  const modelId = request.opencodeModel || request.model || "opencode/kimi-k2.5-free";

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
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`OpenCode generation error: ${message}`);
  }
}

export const opencodeProvider: AIProvider = {
  id: "opencode",
  name: "OpenCode",
  models: MODELS,
  generate,
  generateWithTools,
};
