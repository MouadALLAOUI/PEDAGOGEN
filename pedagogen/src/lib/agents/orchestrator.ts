import type { AIProvider } from "@/lib/ai/types";
import type { GenerationRequestInput, CourseMetadataInput } from "@/lib/validators/generation";
import { TOOLS, type ToolDefinition } from "./tools/definitions";

export interface GenerationStep {
  id: string;
  label: string;
  toolName: string;
  docType: string;
  format: string;
}

export interface GenerationEvent {
  type: "progress" | "tokens" | "file" | "result" | "error";
  step?: string;
  label?: string;
  status?: "pending" | "active" | "done" | "error";
  error?: string;
  used?: number;
  file?: { name: string; type: string; format: string; sizeKb: number };
  result?: unknown;
}

export function getStepsForRequest(request: GenerationRequestInput): GenerationStep[] {
  if (request.mode === "light") {
    return [{
      id: "light",
      label: "Génération Markdown",
      toolName: "cours_complet",
      docType: "cours_complet",
      format: "md",
    }];
  }

  const docTypes = request.documentsToGenerate || Object.keys(TOOLS);
  return docTypes.map((docType) => {
    const tool = TOOLS[docType];
    if (!tool) return null;
    const def = tool(request.metadata);
    return {
      id: docType,
      label: def.description,
      toolName: def.name,
      docType,
      format: def.outputFormat,
    };
  }).filter(Boolean) as GenerationStep[];
}

export async function* runAgent(
  provider: AIProvider,
  request: GenerationRequestInput,
  extraOptions?: { apiKey?: string; baseUrl?: string; modelName?: string; opencodeModel?: string },
): AsyncIterable<GenerationEvent> {
  const steps = getStepsForRequest(request);

  for (const step of steps) {
    const toolDef = TOOLS[step.docType];
    if (!toolDef) continue;

    const def = toolDef(request.metadata);

    yield {
      type: "progress",
      step: step.id,
      label: `${def.description} — IA en cours...`,
      status: "active",
    };

    try {
      const gen = provider.generate({
        systemPrompt: def.systemPrompt,
        userPrompt: buildUserPrompt(request.metadata),
        model: request.mode === "heavy" ? undefined : undefined,
        maxTokens: request.mode === "light" ? 2048 : 4096,
        temperature: 0.7,
        apiKey: extraOptions?.apiKey,
        baseUrl: extraOptions?.baseUrl,
        modelName: extraOptions?.modelName,
        opencodeModel: extraOptions?.opencodeModel,
      });

      let fullText = "";
      for await (const event of gen) {
        if (event.type === "chunk") {
          fullText += event.text;
        } else if (event.type === "error") {
          yield {
            type: "progress",
            step: step.id,
            label: `${def.description} — Erreur`,
            status: "error",
            error: event.message,
          };
          continue;
        } else if (event.type === "done") {
          fullText = event.fullText;
        }
      }

      const content = request.debugMode
        ? buildDebugContent(def, fullText)
        : fullText;

      yield {
        type: "file",
        file: {
          name: `${step.docType}.md`,
          type: step.docType,
          format: "md",
          sizeKb: Math.round(new Blob([content]).size / 1024),
        },
      };

      yield {
        type: "progress",
        step: step.id,
        label: `${def.description} — Terminé`,
        status: "done",
      };
    } catch (err) {
      yield {
        type: "progress",
        step: step.id,
        label: `${def.description} — Erreur`,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
}

function buildUserPrompt(meta: CourseMetadataInput): string {
  return `Génère le document pédagogique pour:
Niveau: ${meta.niveau}
Matière: ${meta.matiere}
Unité: ${meta.unite}
Leçon: ${meta.lecon}
Durée: ${meta.duree} minutes
Langue: ${meta.langue}`;
}

function buildDebugContent(def: ToolDefinition, _fullText: string): string {
  return `# DEBUG MODE

## Tool: ${def.name}
## Output Format: ${def.outputFormat}

## System Prompt:
${def.systemPrompt}

## AI Response (blocked in debug mode):
${_fullText || '[No response - debug mode active]'}`;
}
