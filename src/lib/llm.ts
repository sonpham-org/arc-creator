export type LLMProvider = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'unknown';

interface ProviderConfig {
  url: string;
  headers: Record<string, string>;
  model: string;
}

export function detectProvider(apiKey: string): LLMProvider {
  if (apiKey.startsWith('sk-ant-')) return 'anthropic';
  if (apiKey.startsWith('sk-')) return 'openai';
  if (apiKey.startsWith('gsk_')) return 'groq';
  if (apiKey.startsWith('AIza')) return 'gemini';
  return 'unknown';
}

export const PROVIDER_MODELS: Record<LLMProvider, string[]> = {
  openai: [
    'o3-mini',
    'o1',
    'o1-preview',
    'gpt-4o',
    'gpt-4o-mini',
  ],
  anthropic: [
    'claude-3-5-sonnet-latest',
    'claude-3-5-haiku-latest',
    'claude-3-opus-latest',
  ],
  gemini: [
    'gemini-3-flash-preview',
    'gemini-3-pro-preview',
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro-002',
    'gemini-1.5-flash-002',
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash-latest',
  ],
  groq: [
    'llama-3.3-70b-versatile',
    'llama-3.1-405b-reasoning',
    'deepseek-r1-distill-llama-70b',
    'mixtral-8x7b-32768',
  ],
  unknown: [],
};

export function getProviderConfig(provider: LLMProvider, apiKey: string, model?: string): ProviderConfig {
  const selectedModel = model || PROVIDER_MODELS[provider][0];

  switch (provider) {
    case 'openai':
      return {
        url: 'https://api.openai.com/v1/chat/completions',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        model: selectedModel,
      };
    case 'anthropic':
      return {
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        model: selectedModel,
      };
    case 'groq':
      return {
        url: 'https://api.groq.com/openai/v1/chat/completions',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        model: selectedModel,
      };
    case 'gemini':
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`,
        headers: {
          'Content-Type': 'application/json',
        },
        model: selectedModel,
      };
    default:
      throw new Error('Unsupported or unknown API key provider');
  }
}

export async function callLLM(provider: LLMProvider, apiKey: string, systemPrompt: string, userPrompt: string, model?: string) {
  const config = getProviderConfig(provider, apiKey, model);
  
  let body: any;
  if (provider === 'openai' || provider === 'groq') {
    body = {
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    };
  } else if (provider === 'anthropic') {
    body = {
      model: config.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    };
  } else if (provider === 'gemini') {
    body = {
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [{
        parts: [{ text: userPrompt }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    };
  }

  const response = await fetch(config.url, {
    method: 'POST',
    headers: config.headers,
    body: JSON.stringify(body),
  });

  const data = await response.json();
  
  if (!response.ok) {
    if (provider === 'gemini' && response.status === 404) {
      // Diagnostic: Try to list models to help the user
      try {
        const listResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const listData = await listResp.json();
        const modelNames = listData.models?.map((m: any) => m.name.replace('models/', '')) || [];
        console.error('--- GEMINI DIAGNOSTIC ---');
        console.error('Available Gemini models for your API key:', modelNames);
        console.error('Current model attempting:', model);
        console.error('-------------------------');
      } catch (logErr) {
        // ignore
      }
    }
    throw new Error(data.error?.message || `LLM Call failed with status ${response.status}`);
  }

  let content = '';
  let tokensUsed = 0;

  if (provider === 'openai' || provider === 'groq') {
    content = data.choices[0].message.content;
    tokensUsed = data.usage?.total_tokens || 0;
  } else if (provider === 'anthropic') {
    content = data.content[0].text;
    tokensUsed = data.usage?.input_tokens + data.usage?.output_tokens || 0;
  } else if (provider === 'gemini') {
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error(`Gemini Error: ${JSON.stringify(data)}`);
    }
    content = data.candidates[0].content.parts[0].text;
    tokensUsed = data.usageMetadata?.totalTokenCount || 0;
  }

  return { content, tokensUsed };
}
