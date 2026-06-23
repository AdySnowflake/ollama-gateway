/**
 * 提供商注册中心 - 自动发现已配置的提供商
 */
import { config } from '../config.js'
import type { LLMProvider } from '../types.js'
import { createOpenAICompatProvider } from './openai-compat.js'
import { createGoogleProvider } from './google.js'
import { createAnthropicProvider } from './anthropic.js'

/** 所有可用提供商实例 */
let providers: LLMProvider[] | null = null

/** 初始化所有提供商 */
function initProviders(): LLMProvider[] {
  const p = config.providers
  const list: LLMProvider[] = []

  // OpenAI
  if (p.openai.apiKey) {
    list.push(createOpenAICompatProvider({
      name: 'openai',
      apiKey: p.openai.apiKey,
      baseURL: p.openai.baseURL,
      models: [
        'gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano',
        'gpt-5', 'gpt-5-mini', 'gpt-5-nano',
        'o3', 'o3-mini', 'o4-mini',
      ],
    }))
  }

  // Anthropic
  if (p.anthropic.apiKey) {
    list.push(createAnthropicProvider(p.anthropic.apiKey))
  }

  // Google Gemini
  if (p.google.apiKey) {
    list.push(createGoogleProvider(p.google.apiKey))
  }

  // DeepSeek
  if (p.deepseek.apiKey) {
    list.push(createOpenAICompatProvider({
      name: 'deepseek',
      apiKey: p.deepseek.apiKey,
      baseURL: p.deepseek.baseURL,
      prefix: 'deepseek/',
      models: ['deepseek-chat', 'deepseek-reasoner'],
    }))
  }

  // Groq
  if (p.groq.apiKey) {
    list.push(createOpenAICompatProvider({
      name: 'groq',
      apiKey: p.groq.apiKey,
      baseURL: p.groq.baseURL,
      prefix: 'groq/',
      models: ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    }))
  }

  // OpenRouter
  if (p.openrouter.apiKey) {
    list.push(createOpenAICompatProvider({
      name: 'openrouter',
      apiKey: p.openrouter.apiKey,
      baseURL: p.openrouter.baseURL,
      prefix: 'openrouter/',
      models: [
        'anthropic/claude-sonnet-4',
        'google/gemini-2.5-flash',
        'deepseek/deepseek-r1:free',
        'meta-llama/llama-4-maverick:free',
      ],
    }))
  }

  // Moonshot
  if (p.moonshot.apiKey) {
    list.push(createOpenAICompatProvider({
      name: 'moonshot',
      apiKey: p.moonshot.apiKey,
      baseURL: p.moonshot.baseURL,
      prefix: 'moonshot/',
      models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    }))
  }

  // 阿里云百炼
  if (p.bailian.apiKey) {
    list.push(createOpenAICompatProvider({
      name: 'bailian',
      apiKey: p.bailian.apiKey,
      baseURL: p.bailian.baseURL,
      prefix: 'bailian/',
      models: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-long'],
    }))
  }

  // Grok (xAI)
  if (p.grok.apiKey) {
    list.push(createOpenAICompatProvider({
      name: 'grok',
      apiKey: p.grok.apiKey,
      baseURL: p.grok.baseURL,
      prefix: 'grok/',
      models: ['grok-3-latest', 'grok-3-mini-latest', 'grok-2-latest'],
    }))
  }

  return list
}

/** 获取所有已配置的提供商 */
export function getProviders(): LLMProvider[] {
  if (!providers) {
    providers = initProviders()
  }
  return providers
}

/** 根据模型名查找提供商 */
export function findProvider(model: string): { provider: LLMProvider; model: string } | null {
  for (const p of getProviders()) {
    // 精确匹配
    if (p.models.includes(model)) {
      return { provider: p, model }
    }
    // 前缀匹配：openai 的模型不需要前缀
    if (p.name === 'openai' && p.models.includes(model)) {
      return { provider: p, model }
    }
  }

  // 尝试按提供商前缀匹配
  const prefixMatch = model.match(/^(\w+)\//)
  if (prefixMatch) {
    const providerName = prefixMatch[1]
    const provider = getProviders().find(p => p.name === providerName)
    if (provider) {
      return { provider, model }
    }
  }

  return null
}

/** 获取所有可用模型列表（OpenAI 格式） */
export function getAllModels() {
  const models: Array<{ id: string; object: string; created: number; owned_by: string }> = []
  for (const p of getProviders()) {
    for (const m of p.models) {
      models.push({
        id: m,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: p.name,
      })
    }
  }
  return models
}

/** 获取所有可用模型列表（Ollama 格式） */
export function getOllamaModels() {
  const models: Array<{ name: string; model: string; modified_at: string; size: number; digest: string; details: Record<string, string> }> = []
  for (const p of getProviders()) {
    for (const m of p.models) {
      models.push({
        name: m,
        model: m,
        modified_at: new Date().toISOString(),
        size: 0,
        digest: '',
        details: { provider: p.name },
      })
    }
  }
  return models
}
