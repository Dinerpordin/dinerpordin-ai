import { streamText, type CoreMessage } from 'ai';
import { openai } from '@ai-sdk/openai';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const coreMessages = (messages ?? []) as CoreMessage[];

  // TEMP type-cast to avoid SDK version type conflicts during build
  const model = openai('gpt-4o-mini') as any;

  const result = await streamText({
    model,
    messages: coreMessages,
    temperature: 0.6,
    maxTokens: 400
  });

  return result.toAIStreamResponse();
}
