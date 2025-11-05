import { streamText, type CoreMessage } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAI } from '@ai-sdk/openai';

export const dynamic = 'force-dynamic';

// Setup both providers using environment variables
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();
  const coreMessages = (messages ?? []) as CoreMessage[];

  try {
    // Try OpenRouter first (provider/model format required)
    const model = openrouter('openai/gpt-4o-mini');
    const result = await streamText({
      model,
      messages: coreMessages,
      temperature: 0.6,
      maxTokens: 400
    });
    return result.toAIStreamResponse();
  } catch (error) {
    // If OpenRouter fails, use OpenAI as fallback
    const model = openai('gpt-4o-mini');
    const result = await streamText({
      model,
      messages: coreMessages,
      temperature: 0.6,
      maxTokens: 400
    });
    return result.toAIStreamResponse();
  }
}
