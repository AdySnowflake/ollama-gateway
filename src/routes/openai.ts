/**
 * OpenAI 兼容 API 路由
 * POST /v1/chat/completions - 聊天补全
 * GET  /v1/models          - 模型列表
 */
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { config } from '../config.js'
import { findProvider, getAllModels } from '../providers/index.js'
import { log } from '../utils/console.js'
import type { ChatMessage, InvokeOptions } from '../types.js'

export const openaiRouter = new Hono()

/** 认证中间件 */
function verifyApiKey(c: any): boolean {
  if (!config.proxyApiKey) return true // 未配置则跳过认证
  const auth = c.req.header('Authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '')
  return token === config.proxyApiKey
}

/** GET /v1/models */
openaiRouter.get('/v1/models', (c) => {
  if (!verifyApiKey(c)) {
    log.request('GET', '/v1/models', 401)
    return c.json({ error: { message: 'Invalid API key', type: 'auth_error' } }, 401)
  }
  log.request('GET', '/v1/models', 200)
  return c.json({ object: 'list', data: getAllModels() })
})

/** POST /v1/chat/completions */
openaiRouter.post('/v1/chat/completions', async (c) => {
  if (!verifyApiKey(c)) {
    log.request('POST', '/v1/chat/completions', 401)
    return c.json({ error: { message: 'Invalid API key', type: 'auth_error' } }, 401)
  }

  const body = await c.req.json()
  const { model, messages, stream, temperature, top_p, max_tokens } = body as {
    model: string
    messages: ChatMessage[]
    stream?: boolean
    temperature?: number
    top_p?: number
    max_tokens?: number
  }

  if (!model || !messages) {
    log.request('POST', '/v1/chat/completions', 400)
    return c.json({ error: { message: 'Missing model or messages', type: 'invalid_request' } }, 400)
  }

  const found = findProvider(model)
  if (!found) {
    log.request('POST', '/v1/chat/completions', 404)
    return c.json({ error: { message: `Model '${model}' not found`, type: 'not_found' } }, 404)
  }

  const options: InvokeOptions = {
    temperature,
    topP: top_p,
    maxTokens: max_tokens,
  }

  try {
    if (stream) {
      // 流式响应 (SSE)
      log.request('POST', '/v1/chat/completions (stream)', 200)
      return streamSSE(c, async (sseStream) => {
        try {
          for await (const chunk of found.provider.stream(found.model, messages, options)) {
            await sseStream.writeSSE({ data: JSON.stringify(chunk) })
          }
          await sseStream.writeSSE({ data: '[DONE]' })
        } catch (err: any) {
          log.error('Stream error:', err.message)
          await sseStream.writeSSE({ data: JSON.stringify({ error: { message: err.message } }) })
        }
      })
    } else {
      // 非流式响应
      const result = await found.provider.invoke(found.model, messages, options)
      log.request('POST', '/v1/chat/completions', 200)
      return c.json(result)
    }
  } catch (err: any) {
    log.error('Invoke error:', err.message)
    log.request('POST', '/v1/chat/completions', 500)
    return c.json({ error: { message: err.message, type: 'server_error' } }, 500)
  }
})
