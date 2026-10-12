import { NextRequest } from "next/server";
import { getProvider } from "@/lib/ai/factory";
import { runAgent } from "@/lib/agents/orchestrator";
import { generationRequestSchema } from "@/lib/validators/generation";
import { getDbSetting } from "@/lib/db/settings";
import type { ProviderId } from "@/lib/ai/types";

function sseEvent(event: unknown): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = generationRequestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: parsed.error.issues }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const req = parsed.data;
    const userId = request.headers.get("x-user-id") || undefined;

    const providerId = (await getDbSetting("provider", userId)) as ProviderId || "none";
    const provider = getProvider(providerId);

    const [hfToken, lmstudioUrl, lmstudioModel, opencodeModel] = await Promise.all([
      getDbSetting("huggingface_token", userId),
      getDbSetting("lmstudio_url", userId),
      getDbSetting("lmstudio_model", userId),
      getDbSetting("opencode_model", userId),
    ]);

    const extraOptions = {
      apiKey: hfToken || undefined,
      baseUrl: lmstudioUrl || undefined,
      modelName: lmstudioModel || undefined,
      opencodeModel: opencodeModel || undefined,
    };

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of runAgent(provider, req, extraOptions)) {
            controller.enqueue(encoder.encode(sseEvent(event)));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          const errorEvent = {
            type: "error",
            message: err instanceof Error ? err.message : "Unknown error",
          };
          controller.enqueue(encoder.encode(sseEvent(errorEvent)));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
