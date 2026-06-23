/**
 * Google Gemini 提供商
 */
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, streamText } from 'ai'
import type { LLMProvider, ChatMessage, InvokeOptions, ChatResponse, ChatChunk } from '../types.js'

export function createGoogleProvider(apiKey: string): LLMProvider {
  const google = createGoogleGenerativeAI({ apiKey })

  const models = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ]

  function toGoogleMessages(messages: ChatMessage[]) {
    return messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
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
    name: 'google',
    models,
    requiredEnv: [],

    isConfigured(): boolean {
      return !!apiKey
    },

    async invoke(model: string, messages: ChatMessage[], options?: InvokeOptions): Promise<ChatResponse> {
      const systemPrompt = getSystemPrompt(messages)
      const result = await generateText({
        model: google(model),
        system: systemPrompt,
        messages: toGoogleMessages(messages) as any,
        temperature: options?.temperature,
        topP: options?.topP,
        maxTokens: options?.maxTokens,
      })

      return {
        id: `chatcmpl-${Date.now()}`,
        model: `google/${model}`,
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
        model: google(model),
        system: systemPrompt,
        messages: toGoogleMessages(messages) as any,
        temperature: options?.temperature,
        topP: options?.topP,
        maxTokens: options?.maxTokens,
      })

      const id = `chatcmpl-${Date.now()}`
      const modelId = `google/${model}`

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
