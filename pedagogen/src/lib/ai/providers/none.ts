import type { AIProvider, GenerateRequest, GenerateEvent, GenerateWithToolsRequest, ToolCallResult } from "../types";

const MODELS = [
  { id: "template", name: "Template Mode (no AI)", provider: "none" as const },
];

async function* generate(request: GenerateRequest): AsyncIterable<GenerateEvent> {
  const template = buildTemplate(request.systemPrompt, request.userPrompt);
  yield { type: "chunk", text: template };
  yield { type: "done", fullText: template };
}

function buildTemplate(systemPrompt: string, userPrompt: string): string {
  return `# Generated Document

## Metadata

${systemPrompt}

## Content

${userPrompt}

---

*Generated in Template Mode (no AI connected). Connect a provider for AI-powered generation.*
`;
}

async function generateWithTools(request: GenerateWithToolsRequest): Promise<ToolCallResult> {
  const toolName = request.tools?.[0]?.function?.name || 'default';
  const mockContent = buildTemplate(request.systemPrompt || '', request.userPrompt || '');
  const contentBlocks: unknown[] = [{ type: 'text', text: mockContent }];
  const toolResults: Record<string, unknown> = { [toolName]: { content: mockContent } };
  return { content: contentBlocks, toolResults, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } };
}

export const noneProvider: AIProvider = {
  id: "none",
  name: "Template Mode",
  models: MODELS,
  generate,
  generateWithTools,
};
