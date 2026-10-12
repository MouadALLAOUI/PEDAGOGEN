import { NextRequest, NextResponse } from 'next/server';
import { estimateTokens } from '@/lib/utils/tokenEstimator';
import { getDbSetting as getSetting } from '@/lib/db/settings';
import { checkRateLimit } from '@/lib/utils/rateLimit';

const HF_API_URL = 'https://router.huggingface.co/v1/chat/completions';

function sseEvent(event: Record<string, unknown>): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  const userId = request.headers.get('x-user-id') || undefined;

  const rateKey = userId ? `chat:user:${userId}` : `chat:ip:${request.headers.get('x-forwarded-for') || 'anon'}`;
  const rateCheck = await checkRateLimit(rateKey, 40, 60 * 1000);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Limite de messages atteinte. Veuillez patienter un instant.' },
      { status: 429 }
    );
  }

  const [provider, hfToken, lmstudioUrl, lmstudioModel, opencodeModel] = await Promise.all([
    getSetting('provider', userId),
    getSetting('huggingface_token', userId),
    getSetting('lmstudio_url', userId),
    getSetting('lmstudio_model', userId),
    getSetting('opencode_model', userId),
  ]);

  const activeProvider = (provider || 'none') as string;
  const token = hfToken || process.env.HF_TOKEN || '';

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sseEvent(event)));
      };

      try {
        const body = await request.json();
        const { messages, systemPrompt } = body;

        if (!messages || !Array.isArray(messages)) {
          send({ type: 'error', message: 'Invalid messages' });
          controller.close();
          return;
        }

        const sysContent = systemPrompt || 'You are a helpful assistant. Reply in the same language as the user.';
        const apiMessages = [
          { role: 'system', content: sysContent },
          ...messages,
        ];
        const fullPrompt = apiMessages.map((m: any) => m.content).join('\n');

        if (activeProvider === 'opencode') {
          const modelId = opencodeModel || 'opencode/big-pickle';
          const { opencode } = await import('ai-sdk-provider-opencode-sdk');
          const { streamText } = await import('ai');

          let fullContent = '';
          const result = streamText({
            model: opencode(modelId),
            system: sysContent,
            messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
          });

          for await (const chunk of result.textStream) {
            fullContent += chunk;
            send({ type: 'chunk', content: chunk });
          }

          const promptTokens = estimateTokens(fullPrompt);
          const completionTokens = estimateTokens(fullContent);
          send({ type: 'done', usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens } });
          controller.close();
          return;
        }

        if (activeProvider === 'lmstudio') {
          const url = lmstudioUrl || 'http://localhost:1234/v1/chat/completions';
          const model = lmstudioModel || 'local-model';

          const localResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages: apiMessages, max_tokens: 4096, temperature: 0.7, stream: false }),
          });

          if (!localResponse.ok) {
            const errText = await localResponse.text();
            throw new Error(`LM Studio error ${localResponse.status}: ${errText}`);
          }

          const reader = localResponse.body?.getReader();
          const decoder = new TextDecoder();
          let fullContent = '';
          let fullReasoning = '';
          let buffer = '';

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: false });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const dataStr = line.slice(6).trim();
                if (dataStr === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(dataStr);
                  const delta = parsed.choices?.[0]?.delta;
                  const reasoningDelta = delta?.reasoning_content || delta?.reasoning;
                  if (reasoningDelta) {
                    fullReasoning += reasoningDelta;
                    send({ type: 'reasoning', content: reasoningDelta });
                    continue;
                  }
                  const contentDelta = delta?.content;
                  if (contentDelta) {
                    fullContent += contentDelta;
                    send({ type: 'chunk', content: contentDelta });
                  }
                } catch { /* skip */ }
              }
            }
          }

          const promptTokens = estimateTokens(fullPrompt);
          const completionTokens = estimateTokens(fullReasoning + fullContent);
          send({ type: 'done', usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens } });
          controller.close();
          return;
        }

        if (activeProvider === 'huggingface') {
          if (!token) {
            send({ type: 'error', message: 'Aucun token HuggingFace configuré. Ajoutez-le dans Paramètres.' });
            controller.close();
            return;
          }

          const response = await fetch(HF_API_URL, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'deepseek-ai/DeepSeek-R1', messages: apiMessages, max_tokens: 4096, temperature: 0.7, stream: false }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            send({ type: 'error', message: `HuggingFace API error ${response.status}: ${errorText}` });
            controller.close();
            return;
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let fullContent = '';
          let buffer = '';

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: false });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta?.content;
                  if (delta) {
                    fullContent += delta;
                    send({ type: 'chunk', content: delta });
                  }
                } catch { /* skip */ }
              }
            }
          }

          const promptTokens = estimateTokens(fullPrompt);
          const completionTokens = estimateTokens(fullContent);
          send({ type: 'done', usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens } });
          controller.close();
          return;
        }

        send({ type: 'error', message: 'Aucun fournisseur actif. Configurez-en un dans Paramètres.' });
        controller.close();
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Chat failed';
        send({ type: 'error', message: msg });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
