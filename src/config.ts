/**
 * 配置管理 - 从环境变量读取配置
 */
import 'dotenv/config'

export const config = {
  port: parseInt(process.env.PORT || '11434'),
  host: process.env.HOST || '0.0.0.0',
  proxyApiKey: process.env.PROXY_API_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || '*',

  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    },
    google: {
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY || '',
      baseURL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    },
    moonshot: {
      apiKey: process.env.MOONSHOT_API_KEY || '',
      baseURL: process.env.MOONSHOT_BASE_URL || 'https://api.moonshot.cn/v1',
    },
    bailian: {
      apiKey: process.env.BAILIAN_API_KEY || '',
      baseURL: process.env.BAILIAN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    },
    grok: {
      apiKey: process.env.GROK_API_KEY || '',
      baseURL: process.env.GROK_BASE_URL || 'https://api.x.ai/v1',
    },
  },
}

/** 检查是否至少配置了一个提供商 */
export function hasAnyProvider(): boolean {
  const p = config.providers
  return !!(p.openai.apiKey || p.anthropic.apiKey || p.google.apiKey ||
    p.deepseek.apiKey || p.groq.apiKey || p.openrouter.apiKey ||
    p.moonshot.apiKey || p.bailian.apiKey || p.grok.apiKey)
}
