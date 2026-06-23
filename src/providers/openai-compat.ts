/**
 * OpenAI 兼容提供商
 * 适用于: OpenAI, DeepSeek, Groq, OpenRouter, Moonshot, 百炼, Grok
 * 这些提供商的 API 都兼容 OpenAI 格式，只需配置不同的 baseURL
 */
import { createOpenAI } from '@ai-sdk/openai'
import { generateText, streamText } from 'ai'
import type { LLMProvider, ChatMessage, InvokeOptions, ChatResponse, ChatChunk } from '../types.js'

/** OpenAI 兼容提供商配置 */
export interface OpenAICompatConfig {
  name: string
  apiKey: string
  baseURL: string
  models: string[]
  /** 模型名前缀，用于避免冲突（如 'groq/'） */
  prefix?: string
}

export function createOpenAICompatProvider(cfg: OpenAICompatConfig): LLMProvider {
  const openai = createOpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL })

  /** 获取带前缀的模型名 */
  function fullModelId(model: string): string {
    // 如果模型名已经包含前缀，直接使用
    if (cfg.prefix && model.startsWith(cfg.prefix)) return model
    // 如果模型名在 models 列表中（不含前缀），加上前缀
    return cfg.prefix ? `${cfg.prefix}${model}` : model
  }

  /** 从完整模型名中去掉前缀，得到 provider 认识的模型名 */
  function stripPrefix(model: string): string {
    if (cfg.prefix && model.startsWith(cfg.prefix)) {
      return model.slice(cfg.prefix.length)
    }
    return model
  }

  return {
    name: cfg.name,
    models: cfg.models.map(m => cfg.prefix ? `${cfg.prefix}${m}` : m),
    requiredEnv: [], // 已在外部检查

    isConfigured(): boolean {
      return !!cfg.apiKey
    },

    async invoke(model: string, messages: ChatMessage[], options?: InvokeOptions): Promise<ChatResponse> {
      const result = await generateText({
        model: openai.chat(stripPrefix(model)),
        messages: messages as any,
        temperature: options?.temperature,
        topP: options?.topP,
        maxTokens: options?.maxTokens,
      })

      return {
        id: `chatcmpl-${Date.now()}`,
        model: fullModelId(model),
        choices: [{
          index: 0,
          message: { role: 'assistant', content: result.text },
          finish_reason: result.finishReason === 'stop' ? 'stop' : 'length',
        }],
        usage: result.usage ? {
          prompt_tokens: result.usage.promptTokens,
          completion_tokens: result.usage.completionTokens,
          total_tokens: result.usage.totalTokens,
        } : undefined,
      }
    },

    async *stream(model: string, messages: ChatMessage[], options?: InvokeOptions): AsyncGenerator<ChatChunk> {
      const result = streamText({
        model: openai.chat(stripPrefix(model)),
        messages: messages as any,
        temperature: options?.temperature,
        topP: options?.topP,
        maxTokens: options?.maxTokens,
      })

      const id = `chatcmpl-${Date.now()}`
      const modelId = fullModelId(model)

      for await (const chunk of result.textStream) {
        yield {
          id,
          model: modelId,
          choices: [{
            index: 0,
            delta: { content: chunk },
            finish_reason: null,
          }],
        }
      }

      // 结束块
      yield {
        id,
        model: modelId,
        choices: [{
          index: 0,
          delta: {},
          finish_reason: 'stop',
        }],
      }
    },
  }
}
