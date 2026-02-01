export type LLMProvider = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'mistral' | 'cerebras' | 'openrouter' | 'unknown';

interface ProviderConfig {
  url: string;
  headers: Record<string, string>;
  model: string;
}

export function detectProvider(apiKey: string): LLMProvider {
  if (apiKey.startsWith('sk-ant-')) return 'anthropic';
  if (apiKey.startsWith('sk-or-')) return 'openrouter';
  if (apiKey.startsWith('sk-')) return 'openai';
  if (apiKey.startsWith('gsk_')) return 'groq';
  if (apiKey.startsWith('AIza')) return 'gemini';
  // Mistral and Cerebras keys don't have distinctive prefixes,
  // so they must be specified explicitly via provider parameter
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
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768',
  ],
  mistral: [
    'mistral-small-latest',
    'mistral-medium-latest',
    'mistral-large-latest',
  ],
  cerebras: [
    'llama-3.3-70b',
    'llama-3.1-8b',
  ],
  openrouter: [
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-2-9b-it:free',
    'mistralai/mistral-7b-instruct:free',
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
    case 'mistral':
      return {
        url: 'https://api.mistral.ai/v1/chat/completions',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        model: selectedModel,
      };
    case 'cerebras':
      return {
        url: 'https://api.cerebras.ai/v1/chat/completions',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        model: selectedModel,
      };
    case 'openrouter':
      return {
        url: 'https://openrouter.ai/api/v1/chat/completions',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        model: selectedModel,
      };
    default:
      throw new Error('Unsupported or unknown API key provider');
  }
}

export async function callLLM(
  provider: LLMProvider, 
  apiKey: string, 
  systemPrompt: string, 
  userPrompt: string, 
  model?: string,
  onProgress?: (chunk: string, type: 'thought' | 'content') => void,
  isCancelled?: () => boolean
) {
  const config = getProviderConfig(provider, apiKey, model);
  const isOpenAICompatible = ['openai', 'groq', 'mistral', 'cerebras', 'openrouter'].includes(provider);

  // Streaming implementation for progress tracking
  if (onProgress) {
    if (isOpenAICompatible) {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: true,
          // reasoning_effort: 'high' // for o1/o3 models if supported
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Streaming failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      
      while (reader) {
        if (isCancelled?.()) {
          await reader.cancel();
          throw new Error('LLM call cancelled by user');
        }
        
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              const delta = data.choices[0]?.delta;
              
              // Handle reasoning (thought) for models like o1/o3/deepseek
              if (delta?.reasoning_content) {
                onProgress(delta.reasoning_content, 'thought');
              }
              
              if (delta?.content) {
                fullContent += delta.content;
                onProgress(delta.content, 'content');
              }
            } catch (e) { /* ignore parse errors for partial chunks */ }
          }
        }
      }
      return { content: fullContent, tokensUsed: 0 }; // Tokens will be calculated via completion if needed
    }
  }

  // Fallback to non-streaming for now if no progress callback or for unsupported providers
  let body: any;
  if (isOpenAICompatible) {
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

  if (isOpenAICompatible) {
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

/**
 * Resolve API key for a provider from environment variables.
 * Used by the evaluation worker so keys don't need to come from the client.
 */
export function getServerApiKey(provider: LLMProvider): string | null {
  const envMap: Record<string, string | undefined> = {
    gemini: process.env.GEMINI_API_KEY,
    groq: process.env.GROQ_API_KEY,
    mistral: process.env.MISTRAL_API_KEY,
    cerebras: process.env.CEREBRAS_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.PUZZLE_API_KEY,
  };
  return envMap[provider] || null;
}

/**
 * Provider rate limit configuration (requests per minute / requests per day).
 * Based on verified free tier limits as of early 2026.
 */
export const PROVIDER_RATE_LIMITS: Record<string, { rpm: number; rpd: number }> = {
  // Groq
  'groq:llama-3.3-70b-versatile': { rpm: 30, rpd: 1000 },
  'groq:llama-3.1-8b-instant': { rpm: 30, rpd: 14400 },
  'groq:mixtral-8x7b-32768': { rpm: 30, rpd: 14400 },
  // Gemini
  'gemini:gemini-2.5-flash': { rpm: 5, rpd: 20 },
  'gemini:gemini-2.0-flash': { rpm: 10, rpd: 1500 },
  'gemini:gemini-1.5-flash-latest': { rpm: 15, rpd: 1500 },
  // Mistral (Experiment plan: 1 req/sec)
  'mistral:mistral-small-latest': { rpm: 60, rpd: 10000 },
  'mistral:mistral-medium-latest': { rpm: 60, rpd: 10000 },
  'mistral:mistral-large-latest': { rpm: 60, rpd: 10000 },
  // Cerebras
  'cerebras:llama-3.3-70b': { rpm: 30, rpd: 10000 },
  'cerebras:llama-3.1-8b': { rpm: 30, rpd: 10000 },
  // OpenRouter (free models)
  'openrouter:meta-llama/llama-3.3-70b-instruct:free': { rpm: 20, rpd: 50 },
  'openrouter:google/gemma-2-9b-it:free': { rpm: 20, rpd: 50 },
  'openrouter:mistralai/mistral-7b-instruct:free': { rpm: 20, rpd: 50 },
};
