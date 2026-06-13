export type ProviderId = "none" | "huggingface" | "lmstudio" | "opencode";

export interface Model {
  id: string;
  name: string;
  provider: ProviderId;
}

export interface ToolCallResult {
  content: unknown[];
  toolResults: Record<string, unknown>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export type ToolDefinition = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export interface GenerateWithToolsRequest {
  systemPrompt?: string;
  userPrompt?: string;
  messages?: { role: string; content: string }[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
  opencodeModel?: string;
  tools?: ToolDefinition[];
  signal?: AbortSignal;
}

export interface AIProvider {
  readonly id: ProviderId;
  readonly name: string;
  readonly models: Model[];
  generate(request: GenerateRequest): AsyncIterable<GenerateEvent>;
  generateWithTools?(request: GenerateWithToolsRequest): Promise<ToolCallResult>;
}

export interface GenerateRequest {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
  opencodeModel?: string;
}

export type GenerateEvent =
  | { type: "chunk"; text: string }
  | { type: "done"; fullText: string }
  | { type: "error"; message: string };
