/**
 * 带颜色的控制台输出
 */
const isTTY = process.stdout.isTTY

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
}

function colorize(color: keyof typeof colors, text: string): string {
  return isTTY ? `${colors[color]}${text}${colors.reset}` : text
}

function timestamp(): string {
  return colorize('gray', `[${new Date().toLocaleTimeString()}] `)
}

export const log = {
  info: (...args: unknown[]) => console.log(timestamp() + colorize('blue', '[INFO]'), ...args),
  success: (...args: unknown[]) => console.log(timestamp() + colorize('green', '[OK]'), ...args),
  warn: (...args: unknown[]) => console.warn(timestamp() + colorize('yellow', '[WARN]'), ...args),
  error: (...args: unknown[]) => console.error(timestamp() + colorize('red', '[ERROR]'), ...args),
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(timestamp() + colorize('magenta', '[DEBUG]'), ...args)
    }
  },
  request: (method: string, path: string, status: number) => {
    const statusColor = status >= 400 ? 'red' : status >= 300 ? 'yellow' : 'green'
    console.log(
      timestamp() +
      colorize('cyan', method.padEnd(6)) +
      colorize('gray', path + ' ') +
      colorize(statusColor, String(status))
    )
  },
}
