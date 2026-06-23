/**
 * Anthropic (Claude) 提供商
 */
import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText, streamText } from 'ai'
import type { LLMProvider, ChatMessage, InvokeOptions, ChatResponse, ChatChunk } from '../types.js'

export function createAnthropicProvider(apiKey: string): LLMProvider {
  const anthropic = createAnthropic({ apiKey })

  const models = [
    'claude-sonnet-4-20250514',
    'claude-4-sonnet-20250514',
    'claude-3-7-sonnet-20250219',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
  ]

  function toAnthropicMessages(messages: ChatMessage[]) {
    return messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: typeof m.content === 'string'
          ? m.content
          : m.content.map(p => p.type === 'text' ? p.text || '' : '').join(''),
      }))
  }

  function getSystemPrompt(messages: ChatMessage[]): string | undefined {
    const sys = messages.find(m => m.role === 'system')
    return sys ? (typeof sys.content === 'string' ? sys.content : '') : undefined
  }

  return {
    name: 'anthropic',
    models: models.map(m => `anthropic/${m}`),
    requiredEnv: [],

    isConfigured(): boolean {
      return !!apiKey
    },

    async invoke(model: string, messages: ChatMessage[], options?: InvokeOptions): Promise<ChatResponse> {
      const systemPrompt = getSystemPrompt(messages)
      const result = await generateText({
        model: anthropic(model.replace('anthropic/', '')),
        system: systemPrompt,
        messages: toAnthropicMessages(messages) as any,
        temperature: options?.temperature,
        topP: options?.topP,
        maxTokens: options?.maxTokens ?? 4096,
      })

      return {
        id: `chatcmpl-${Date.now()}`,
        model: model.startsWith('anthropic/') ? model : `anthropic/${model}`,
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
      const systemPrompt = getSystemPrompt(messages)
      const result = streamText({
        model: anthropic(model.replace('anthropic/', '')),
        system: systemPrompt,
        messages: toAnthropicMessages(messages) as any,
        temperature: options?.temperature,
        topP: options?.topP,
        maxTokens: options?.maxTokens ?? 4096,
      })

      const id = `chatcmpl-${Date.now()}`
      const modelId = model.startsWith('anthropic/') ? model : `anthropic/${model}`

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
