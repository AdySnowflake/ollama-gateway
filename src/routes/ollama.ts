/**
 * Ollama 兼容 API 路由
 * GET  /api/tags      - 模型列表
 * POST /api/chat      - 聊天补全
 * POST /api/generate  - 文本生成
 * GET  /api/version   - 版本信息
 * GET  /              - 健康检查
 */
import { Hono } from 'hono'
import { findProvider, getOllamaModels } from '../providers/index.js'
import { log } from '../utils/console.js'
import type { ChatMessage, InvokeOptions, OllamaChatRequest, OllamaGenerateRequest } from '../types.js'

export const ollamaRouter = new Hono()

/** GET / - 健康检查 */
ollamaRouter.get('/', (c) => {
  log.request('GET', '/', 200)
  return c.text('Ollama is running in proxy mode.')
})

/** GET /api/version */
ollamaRouter.get('/api/version', (c) => {
  log.request('GET', '/api/version', 200)
  return c.json({ version: '1.0.0' })
})

/** GET /api/tags - 模型列表 */
ollamaRouter.get('/api/tags', (c) => {
  log.request('GET', '/api/tags', 200)
  return c.json({ models: getOllamaModels() })
})

/** POST /api/chat - 聊天补全 */
ollamaRouter.post('/api/chat', async (c) => {
  const body = await c.req.json() as OllamaChatRequest
  const { model, messages, stream, options: ollamaOpts } = body

  if (!model || !messages) {
    log.request('POST', '/api/chat', 400)
    return c.json({ error: 'Missing model or messages' }, 400)
  }

  const found = findProvider(model)
  if (!found) {
    log.request('POST', '/api/chat', 404)
    return c.json({ error: `Model '${model}' not found` }, 404)
  }

  // 转换 Ollama 消息格式为通用格式
  const chatMessages: ChatMessage[] = messages.map(m => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }))

  const invokeOpts: InvokeOptions = {
    temperature: ollamaOpts?.temperature,
    topP: ollamaOpts?.top_p,
    maxTokens: ollamaOpts?.num_predict,
  }

  try {
    if (stream !== false) {
      // 流式响应 (NDJSON)
      log.request('POST', '/api/chat (stream)', 200)
      c.header('Content-Type', 'application/x-ndjson')
      return c.body(new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()
          try {
            for await (const chunk of found.provider.stream(found.model, chatMessages, invokeOpts)) {
              const ollamaChunk = {
                model: chunk.model,
                created_at: new Date().toISOString(),
                message: {
                  role: 'assistant',
                  content: chunk.choices[0]?.delta?.content || '',
                },
                done: chunk.choices[0]?.finish_reason === 'stop',
              }
              controller.enqueue(encoder.encode(JSON.stringify(ollamaChunk) + '\n'))
            }
            // 最终 done 块
            controller.enqueue(encoder.encode(JSON.stringify({
              model: found.model,
              created_at: new Date().toISOString(),
              done: true,
            }) + '\n'))
          } catch (err: any) {
            log.error('Ollama stream error:', err.message)
            controller.enqueue(encoder.encode(JSON.stringify({ error: err.message }) + '\n'))
          } finally {
            controller.close()
          }
        },
      }))
    } else {
      // 非流式响应
      const result = await found.provider.invoke(found.model, chatMessages, invokeOpts)
      const content = result.choices[0]?.message?.content || ''
      log.request('POST', '/api/chat', 200)
      return c.json({
        model: result.model,
        created_at: new Date().toISOString(),
        message: { role: 'assistant', content },
        done: true,
        total_duration: 0,
        eval_count: result.usage?.completion_tokens || 0,
      })
    }
  } catch (err: any) {
    log.error('Ollama chat error:', err.message)
    log.request('POST', '/api/chat', 500)
    return c.json({ error: err.message }, 500)
  }
})

/** POST /api/generate - 文本生成 */
ollamaRouter.post('/api/generate', async (c) => {
  const body = await c.req.json() as OllamaGenerateRequest
  const { model, prompt, stream, options: ollamaOpts } = body

  if (!model || !prompt) {
    log.request('POST', '/api/generate', 400)
    return c.json({ error: 'Missing model or prompt' }, 400)
  }

  const found = findProvider(model)
  if (!found) {
    log.request('POST', '/api/generate', 404)
    return c.json({ error: `Model '${model}' not found` }, 404)
  }

  const chatMessages: ChatMessage[] = [{ role: 'user', content: prompt }]
  const invokeOpts: InvokeOptions = {
    temperature: ollamaOpts?.temperature,
    topP: ollamaOpts?.top_p,
    maxTokens: ollamaOpts?.num_predict,
  }

  try {
    if (stream !== false) {
      log.request('POST', '/api/generate (stream)', 200)
      c.header('Content-Type', 'application/x-ndjson')
      return c.body(new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()
          try {
            for await (const chunk of found.provider.stream(found.model, chatMessages, invokeOpts)) {
              const ollamaChunk = {
                model: chunk.model,
                created_at: new Date().toISOString(),
                response: chunk.choices[0]?.delta?.content || '',
                done: chunk.choices[0]?.finish_reason === 'stop',
              }
              controller.enqueue(encoder.encode(JSON.stringify(ollamaChunk) + '\n'))
            }
            controller.enqueue(encoder.encode(JSON.stringify({
              model: found.model,
              created_at: new Date().toISOString(),
              done: true,
            }) + '\n'))
          } catch (err: any) {
            log.error('Ollama generate stream error:', err.message)
            controller.enqueue(encoder.encode(JSON.stringify({ error: err.message }) + '\n'))
          } finally {
            controller.close()
          }
        },
      }))
    } else {
      const result = await found.provider.invoke(found.model, chatMessages, invokeOpts)
      const content = result.choices[0]?.message?.content || ''
      log.request('POST', '/api/generate', 200)
      return c.json({
        model: result.model,
        created_at: new Date().toISOString(),
        response: content,
        done: true,
      })
    }
  } catch (err: any) {
    log.error('Ollama generate error:', err.message)
    log.request('POST', '/api/generate', 500)
    return c.json({ error: err.message }, 500)
  }
})
