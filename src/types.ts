/**
 * 核心类型定义
 */

/** LLM 提供商必须实现的接口 */
export interface LLMProvider {
  /** 提供商名称 */
  name: string
  /** 支持的模型 ID 列表 */
  models: string[]
  /** 必需的环境变量 */
  requiredEnv: string[]
  /** 是否已配置（必需环境变量都存在） */
  isConfigured(): boolean
  /** 调用模型（非流式） */
  invoke(model: string, messages: ChatMessage[], options?: InvokeOptions): Promise<ChatResponse>
  /** 调用模型（流式） */
  stream(model: string, messages: ChatMessage[], options?: InvokeOptions): AsyncGenerator<ChatChunk>
}

/** 聊天消息 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ContentPart[]
}

/** 多模态内容块 */
export interface ContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

/** 调用选项 */
export interface InvokeOptions {
  temperature?: number
  topP?: number
  maxTokens?: number
  stream?: boolean
}

/** 非流式响应 */
export interface ChatResponse {
  id: string
  model: string
  choices: Array<{
    index: number
    message: { role: string; content: string }
    finish_reason: string | null
  }>
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

/** 流式响应块 */
export interface ChatChunk {
  id: string
  model: string
  choices: Array<{
    index: number
    delta: { role?: string; content?: string }
    finish_reason: string | null
  }>
}

/** Ollama 格式的聊天请求 */
export interface OllamaChatRequest {
  model: string
  messages: Array<{ role: string; content: string; images?: string[] }>
  stream?: boolean
  options?: {
    temperature?: number
    top_p?: number
    num_predict?: number
  }
}

/** Ollama 格式的生成请求 */
export interface OllamaGenerateRequest {
  model: string
  prompt: string
  images?: string[]
  stream?: boolean
  options?: {
    temperature?: number
    top_p?: number
    num_predict?: number
  }
}
