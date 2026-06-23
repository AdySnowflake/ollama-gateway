/**
 * Unified LLM Proxy - 统一 LLM API 代理
 *
 * 将多种 LLM 提供商统一为 OpenAI 和 Ollama 兼容接口
 * 支持: OpenAI, Anthropic, Google Gemini, DeepSeek, Groq, OpenRouter, Moonshot, 百炼, Grok
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { config, hasAnyProvider } from './config.js'
import { getProviders } from './providers/index.js'
import { openaiRouter } from './routes/openai.js'
import { ollamaRouter } from './routes/ollama.js'
import { log } from './utils/console.js'

const app = new Hono()

// CORS 中间件
app.use('*', cors({ origin: config.corsOrigin }))

// 请求日志中间件
app.use('*', async (c, next) => {
  await next()
})

// 挂载路由
app.route('/', ollamaRouter)    // Ollama 兼容: /api/chat, /api/tags, etc.
app.route('/', openaiRouter)    // OpenAI 兼容: /v1/chat/completions, /v1/models

// 全局错误处理
app.onError((err, c) => {
  log.error('Unhandled error:', err.message)
  return c.json({ error: { message: 'Internal server error', type: 'server_error' } }, 500)
})

// 启动服务
function start() {
  if (!hasAnyProvider()) {
    log.error('未配置任何 LLM 提供商的 API Key！')
    log.error('请复制 .env.example 为 .env 并填入至少一个 API Key')
    process.exit(1)
  }

  const providers = getProviders()
  log.success(`已加载 ${providers.length} 个提供商:`)
  for (const p of providers) {
    log.info(`  ✓ ${p.name} (${p.models.length} 个模型)`)
  }

  serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
    log.success(`服务已启动: http://${config.host}:${info.port}`)
    log.info('  OpenAI 兼容: /v1/chat/completions, /v1/models')
    log.info('  Ollama 兼容: /api/chat, /api/generate, /api/tags')
  })
}

start()
