
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = await streamText({
    model: openai('gpt-4o-mini'),
    messages,
    temperature: 0.6,
    maxTokens: 400
  });
  return result.toAIStreamResponse();
}
