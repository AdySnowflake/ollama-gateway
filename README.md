# Ollama Gateway

Ollama 网关 —— 将多种 LLM 提供商统一为 Ollama 和 OpenAI 兼容接口。

## 特性

- **双协议支持**: 同时提供 OpenAI 兼容 (`/v1/*`) 和 Ollama 兼容 (`/api/*`) API
- **9 个提供商**: OpenAI, Anthropic, Google Gemini, DeepSeek, Groq, OpenRouter, Moonshot, 阿里云百炼, Grok
- **轻量架构**: 基于 Hono + Vercel AI SDK，依赖精简
- **本地部署**: 专为本地运行设计，无需 Docker 或 Cloudflare
- **自动发现**: 只需配置 API Key，自动启用对应提供商
- **流式传输**: 所有提供商均支持流式响应

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 API Key

```bash
cp .env.example .env
```

编辑 `.env`，填入至少一个提供商的 API Key：

```env
OPENAI_API_KEY=sk-xxx
# 或
GOOGLE_GENERATIVE_AI_API_KEY=xxx
# 或
DEEPSEEK_API_KEY=xxx
# ... 更多提供商见 .env.example
```

### 3. 启动服务

```bash
npm run dev    # 开发模式（热重载）
npm start      # 生产模式
```

默认监听 `http://0.0.0.0:11434`（与 Ollama 默认端口一致）。

## API 使用

### OpenAI 兼容接口

```bash
# 聊天补全
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# 流式响应
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'

# 模型列表
curl http://localhost:11434/v1/models
```

### Ollama 兼容接口

```bash
# 聊天补全
curl http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# 文本生成
curl http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek/deepseek-chat",
    "prompt": "Hello!"
  }'

# 模型列表
curl http://localhost:11434/api/tags
```

## 支持的提供商和模型

| 提供商 | 环境变量 | 模型前缀 | 示例模型 |
|--------|---------|---------|---------|
| OpenAI | `OPENAI_API_KEY` | 无 | gpt-4o, gpt-5, o3 |
| Anthropic | `ANTHROPIC_API_KEY` | `anthropic/` | claude-sonnet-4-20250514 |
| Google Gemini | `GOOGLE_GENERATIVE_AI_API_KEY` | `google/` | gemini-2.5-flash, gemini-2.5-pro |
| DeepSeek | `DEEPSEEK_API_KEY` | `deepseek/` | deepseek-chat, deepseek-reasoner |
| Groq | `GROQ_API_KEY` | `groq/` | llama3-8b-8192, mixtral-8x7b |
| OpenRouter | `OPENROUTER_API_KEY` | `openrouter/` | anthropic/claude-sonnet-4 |
| Moonshot | `MOONSHOT_API_KEY` | `moonshot/` | moonshot-v1-128k |
| 阿里云百炼 | `BAILIAN_API_KEY` | `bailian/` | qwen-max, qwen-plus |
| Grok | `GROK_API_KEY` | `groq/` | grok-3-latest |

## 配置项

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 监听端口 | `11434` |
| `HOST` | 监听地址 | `0.0.0.0` |
| `PROXY_API_KEY` | 代理自身认证密钥（可选） | 空（不认证） |
| `CORS_ORIGIN` | CORS 允许的来源 | `*` |

## 客户端配置

### 任何支持 OpenAI API 的客户端

- API Base URL: `http://localhost:11434/v1`
- API Key: 填 `.env` 中的 `PROXY_API_KEY`（如已配置）

### 任何支持 Ollama 的客户端

- Ollama 地址: `http://localhost:11434`

## 技术栈

- **运行时**: Node.js >= 18
- **框架**: Hono
- **AI SDK**: Vercel AI SDK (`ai`)
- **语言**: TypeScript

## 许可证

MIT
