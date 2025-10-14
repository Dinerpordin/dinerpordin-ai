import { NextRequest } from 'next/server';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  try {
    const { q, compact = true, want_bn = false } = await req.json();
    if (!q || typeof q !== 'string') {
      return new Response(JSON.stringify({ error: 'Empty question' }), { status: 400 });
    }

    const HealthSchema = z.object({
      summary: z.string(),
      possible_causes: z.array(z.string()).default([]),
      red_flags: z.array(z.string()).default([]),
      self_care: z.array(z.string()).default([]),
      bn_summary: z.string().nullable().default(null)
    });

    // TEMP type-cast to avoid SDK version type conflicts during build
    const model = openai('gpt-4o-mini') as any;

    const { object, usage } = await generateObject({
      model,
      schema: HealthSchema,
      prompt: [
        'You are a careful, evidence-based health information assistant.',
        'Educational only; do not diagnose or prescribe.',
        compact ? 'Be concise.' : 'Be clear and measured.',
        'User input:',
        q,
        want_bn ? 'Also include a short Bangla bn_summary.' : 'Set bn_summary to null.'
      ].join('\n'),
      temperature: compact ? 0.2 : 0.3,
      maxTokens: 500
    });

    return new Response(
      JSON.stringify({
        ...object,
        usage: {
          input_tokens: usage?.promptTokens ?? null,
          output_tokens: usage?.completionTokens ?? null,
          total_tokens: usage?.totalTokens ?? null,
          model: 'gpt-4o-mini'
        }
      }),
      { headers: { 'content-type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Server error' }), { status: 500 });
  }
}
