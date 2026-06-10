import { NextRequest } from 'next/server';
import { estimateTokens } from '@/lib/utils/tokenEstimator';

const HF_API_URL = 'https://router.huggingface.co/v1/chat/completions';
const HF_MODEL = 'deepseek-ai/DeepSeek-R1';

function sseEvent(event: Record<string, unknown>): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sseEvent(event)));
      };

      try {
        const body = await request.json();
        const { messages, systemPrompt, useLocalModel, localModelName, localModelUrl, localApiType } = body;

        if (!messages || !Array.isArray(messages)) {
          send({ type: 'error', message: 'Invalid messages' });
          controller.close();
          return;
        }

        if (!useLocalModel && !process.env.HF_TOKEN) {
          send({ type: 'error', message: 'HF_TOKEN not configured' });
          controller.close();
          return;
        }

        const apiMessages = [
          { role: 'system', content: systemPrompt || 'You are a helpful assistant. Reply in the same language as the user.' },
          ...messages,
        ];

        const fullPrompt = apiMessages.map((m) => m.content).join('\n');

        if (useLocalModel) {
          const localModel = localModelName || 'google/gemma-4-e2b';
          const lastMessage = messages[messages.length - 1]?.content || '';
          const url = localModelUrl || (localApiType === 'openai' ? 'http://localhost:1234/v1/chat/completions' : 'http://localhost:1234/api/v1/chat');

          if (localApiType === 'openai') {
            const localResponse = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: localModel,
                messages: apiMessages,
                max_tokens: 4096,
                temperature: 0.7,
                stream: true,
              }),
            });

            if (!localResponse.ok) {
              const errText = await localResponse.text();
              throw new Error(`Local model OpenAI API error ${localResponse.status}: ${errText}`);
            }

            const reader = localResponse.body?.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';
            let fullReasoning = '';
            let buffer = '';
            let isThinking = false;

            if (reader) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  if (!line.startsWith('data: ')) continue;
                  const dataStr = line.slice(6).trim();
                  if (dataStr === '[DONE]') continue;

                  try {
                    const parsed = JSON.parse(dataStr);
                    const choice = parsed.choices?.[0];
                    const delta = choice?.delta;

                    const reasoningDelta = delta?.reasoning_content || delta?.reasoning;
                    if (reasoningDelta) {
                      fullReasoning += reasoningDelta;
                      send({ type: 'reasoning', content: reasoningDelta });
                      continue;
                    }

                    let contentDelta = delta?.content;
                    if (contentDelta) {
                      if (contentDelta.includes('<think>')) {
                        isThinking = true;
                        contentDelta = contentDelta.replace('<think>', '');
                      }
                      if (contentDelta.includes('</think>')) {
                        isThinking = false;
                        contentDelta = contentDelta.replace('</think>', '');
                      }

                      if (isThinking) {
                        fullReasoning += contentDelta;
                        send({ type: 'reasoning', content: contentDelta });
                      } else if (contentDelta) {
                        fullContent += contentDelta;
                        send({ type: 'chunk', content: contentDelta });
                      }
                    }
                  } catch {
                    // ignore malformed chunks
                  }
                }
              }
            }

            const promptTokens = estimateTokens(fullPrompt);
            const completionTokens = estimateTokens(fullReasoning + fullContent);

            send({
              type: 'done',
              usage: {
                prompt_tokens: promptTokens,
                completion_tokens: completionTokens,
                total_tokens: promptTokens + completionTokens,
              },
            });
            controller.close();
            return;
          } else {
            // Custom API: Non-Streaming with simulated streaming
            const localResponse = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: localModel,
                system_prompt: systemPrompt || 'You are a helpful assistant.',
                input: lastMessage,
              }),
            });

            if (!localResponse.ok) {
              const errText = await localResponse.text();
              throw new Error(`Local model API error: ${errText}`);
            }

            const localData = await localResponse.json();
            const output = localData.output;
            let content = '';
            let reasoning = '';

            if (Array.isArray(output)) {
              const rObj = output.find((o: any) => o.type === 'reasoning');
              const mObj = output.find((o: any) => o.type === 'message');
              if (rObj) reasoning = rObj.content || '';
              if (mObj) content = mObj.content || '';
            } else {
              content = localData.choices?.[0]?.message?.content || 
                        localData.choices?.[0]?.text || 
                        localData.content || 
                        localData.text || 
                        localData.response || 
                        JSON.stringify(localData);
            }

            if (reasoning) {
              const chunkSize = 8;
              for (let i = 0; i < reasoning.length; i += chunkSize) {
                send({ type: 'reasoning', content: reasoning.slice(i, i + chunkSize) });
                await new Promise((resolve) => setTimeout(resolve, 20));
              }
            }

            if (content) {
              const chunkSize = 12;
              for (let i = 0; i < content.length; i += chunkSize) {
                send({ type: 'chunk', content: content.slice(i, i + chunkSize) });
                await new Promise((resolve) => setTimeout(resolve, 15));
              }
            }

            const promptTokens = estimateTokens(systemPrompt + '\n' + lastMessage);
            const completionTokens = estimateTokens(content);
            send({
              type: 'done',
              usage: {
                prompt_tokens: promptTokens,
                completion_tokens: completionTokens,
                total_tokens: promptTokens + completionTokens,
              },
            });
            controller.close();
            return;
          }
        }

        const response = await fetch(HF_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.HF_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: HF_MODEL,
            messages: apiMessages,
            max_tokens: 4096,
            temperature: 0.7,
            stream: true,
          }),
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

            buffer += decoder.decode(value, { stream: true });
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
              } catch {
                // ignore malformed chunks
              }
            }
          }
        }

        // Estimate tokens
        const promptTokens = estimateTokens(fullPrompt);
        const completionTokens = estimateTokens(fullContent);

        send({
          type: 'done',
          usage: {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: promptTokens + completionTokens,
          },
        });

        controller.close();
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Chat failed';
        send({ type: 'error', message: msg });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
