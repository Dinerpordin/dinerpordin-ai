import { streamText, type CoreMessage } from 'ai';
import { openai } from '@ai-sdk/openai';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Ensure messages are typed to what the SDK expects
  const coreMessages = (messages ?? []) as CoreMessage[];

  const result = await streamText({
    model: openai('gpt-4o-mini'),
    messages: coreMessages,
    temperature: 0.6,
    maxTokens: 400
  });

  return result.toAIStreamResponse();
}
