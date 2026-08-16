/**
 * dsh-telegram-bridge — Telegram Bot ↔ DSH (DeepSeek Harness) AI Agent 橋接
 * 
 * 讓你可以直接從 Telegram 跟 DSH 的 AI agent 對話。
 * 
 * 用法：
 *   1. TELEGRAM_BOT_TOKEN=xxx node index.js
 *   2. 或安裝後：dsh-telegram-bridge --token xxx
 * 
 * @module dsh-telegram-bridge
 */

import { Bot } from 'grammy'
import { randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// ─── 設定 ────────────────────────────────────────────

const DSH_URL = (process.env.DSH_URL || 'http://127.0.0.1:3080').replace(/\/+$/, '')
const SESSIONS_FILE = join(dirname(fileURLToPath(import.meta.url)), 'sessions.json')
const POLL_INTERVAL_MS = 800
const RESPONSE_TIMEOUT_MS = 120_000

// ─── Session 對應管理 ────────────────────────────────

const chatSessions = new Map()  // chatId → { sessionId, lastSeq }

async function loadSessions() {
  if (!existsSync(SESSIONS_FILE)) return
  try {
    const raw = await readFile(SESSIONS_FILE, 'utf-8')
    const data = JSON.parse(raw)
    for (const [chatId, info] of Object.entries(data)) {
      chatSessions.set(chatId, info)
    }
  } catch (err) {
    console.warn('⚠️  Cannot load sessions.json, will recreate:', err.message)
  }
}

async function saveSessions() {
  const obj = Object.fromEntries(chatSessions)
  await writeFile(SESSIONS_FILE, JSON.stringify(obj, null, 2), 'utf-8')
}

// ─── DSH API 輔助工具 ────────────────────────────────

async function dshRpc(method, payload) {
  const rpcId = randomUUID()
  const body = { type: 'client-request', rpcId, method, payload }
  const res = await fetch(`${DSH_URL}/api/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`DSH HTTP ${res.status} calling ${method}`)
  const data = await res.json()
  if (!data.result?.ok) {
    const err = data.result?.error || { code: 'unknown', message: 'Unknown error' }
    throw new Error(`DSH RPC error [${err.code}]: ${err.message}`)
  }
  return data.result.value
}

async function createSession() {
  return dshRpc('session.create', {})
}

async function sendPrompt(sessionId, text) {
  return dshRpc('session.prompt', {
    sessionId,
    mode: 'queue',
    content: [{ type: 'text', text }],
  })
}

async function fetchHistory(sessionId) {
  return dshRpc('session.history', { sessionId })
}

function extractTextFromContent(content) {
  return content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n')
}

async function waitForResponse(sessionId, afterSeq) {
  const deadline = Date.now() + RESPONSE_TIMEOUT_MS

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS)

    let history
    try {
      history = await fetchHistory(sessionId)
    } catch {
      continue
    }

    const events = history.events || []
    for (let i = events.length - 1; i >= 0; i--) {
      const entry = events[i]
      if (entry.event?.type === 'assistant/message' && (entry.event.seq ?? -1) > afterSeq) {
        // assistant/message 的 content 在 data.message.content 底下
        const content = entry.event.data?.message?.content || entry.event.data?.content
        if (content && Array.isArray(content)) {
          const text = extractTextFromContent(content)
          if (text) return { text, seq: entry.event.seq }
        }
      }
    }
  }

  throw new Error('Timeout waiting for agent response')
}

// ─── Telegram Bot ────────────────────────────────────

function createBot(botToken) {
  const bot = new Bot(botToken)

  bot.command('start', async (ctx) => {
    const chatId = String(ctx.chat.id)

    if (chatSessions.has(chatId)) {
      await ctx.reply('👋 You already have an active session! Just send me a message.')
      return
    }

    try {
      const result = await createSession()
      const sessionId = result.sessionId
      chatSessions.set(chatId, { sessionId, lastSeq: -1 })
      await saveSessions()
      await ctx.reply(
        '✅ Connected to DeepSeek Harness AI agent!\n\n'
        + 'Just send me a message and I\'ll forward it to the AI agent.\n'
        + 'Commands:\n'
        + '/start — Start a new connection\n'
        + '/new — Start a new topic (history preserved)\n'
        + '/status — Check connection status'
      )
    } catch (err) {
      console.error(`Failed to create session:`, err.message)
      await ctx.reply('❌ Cannot connect to DSH. Make sure DSH is running.')
    }
  })

  bot.command('new', async (ctx) => {
    const chatId = String(ctx.chat.id)
    const info = chatSessions.get(chatId)
    if (!info) {
      await ctx.reply('⚠️  No session yet. Send /start first.')
      return
    }

    await ctx.reply('🔄 Starting new topic...')
    info.lastSeq = -1
    chatSessions.set(chatId, info)
    await saveSessions()
    await ctx.reply('✅ New topic ready! Ask away.')
  })

  bot.command('status', async (ctx) => {
    const chatId = String(ctx.chat.id)
    const info = chatSessions.get(chatId)

    let msg = '🔌 **DSH Connection Status**\n\n'
    msg += `DSH Server: ${DSH_URL}\n`

    try {
      await dshRpc('host.describe', {})
      msg += 'DSH Status: ✅ Connected\n'
    } catch {
      msg += 'DSH Status: ❌ Cannot connect\n'
    }

    if (info) {
      msg += `\nYour session: \`${info.sessionId}\``
    } else {
      msg += '\n⚠️  No session yet, send /start'
    }

    await ctx.reply(msg, { parse_mode: 'Markdown' })
  })

  bot.on('message:text', async (ctx) => {
    const chatId = String(ctx.chat.id)
    const info = chatSessions.get(chatId)

    if (!info) {
      await ctx.reply('⚠️  Please send /start first.')
      return
    }

    const text = ctx.message.text

    // Show typing indicator
    await ctx.api.sendChatAction(ctx.chat.id, 'typing').catch(() => {})

    try {
      const beforeHistory = await fetchHistory(info.sessionId)
      const events = beforeHistory.events || []
      const currentSeq = events.length > 0
        ? events[events.length - 1].event?.seq ?? info.lastSeq
        : info.lastSeq

      await sendPrompt(info.sessionId, text)

      const response = await waitForResponse(info.sessionId, currentSeq)

      info.lastSeq = response.seq
      chatSessions.set(chatId, info)
      await saveSessions()

      const maxLen = 4000
      if (response.text.length <= maxLen) {
        await ctx.reply(response.text, {
          reply_to_message_id: ctx.message.message_id,
        })
      } else {
        for (let i = 0; i < response.text.length; i += maxLen) {
          await ctx.reply(response.text.slice(i, i + maxLen))
        }
      }
    } catch (err) {
      console.error(`Error chat=${chatId}:`, err.message)
      await ctx.reply(`❌ ${err.message}`)
    }
  })

  bot.on('message', async (ctx) => {
    if (!ctx.message.text) {
      await ctx.reply('📎 Only text messages are supported for now.')
    }
  })

  // Global error handler
  bot.catch = (err) => {
    console.error('⚠️  Bot error caught:', err.ctx?.update?.message?.text ?? '(no message)', err.error?.message ?? err)
  }

  return bot
}

// ─── 啟動函數 ────────────────────────────────────────

/**
 * Start the Telegram-DSH bridge.
 * @param {object} [options]
 * @param {string} options.token - Telegram Bot token (required)
 * @param {string} [options.dshUrl] - DSH server URL
 */
export async function startBridge(options = {}) {
  const botToken = options.token || process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    throw new Error(
      'Telegram Bot token is required.\n'
      + 'Set TELEGRAM_BOT_TOKEN environment variable or pass { token } option.\n'
      + 'Get a token from @BotFather on Telegram.'
    )
  }

  if (options.dshUrl) {
    // Override via option
  }

  await loadSessions()
  const bot = createBot(botToken)

  console.log('╔══════════════════════════════════════════╗')
  console.log('║     dsh-telegram-bridge v0.1.0          ║')
  console.log('║     Telegram ↔ DeepSeek Harness Bridge  ║')
  console.log('╠══════════════════════════════════════════╣')
  console.log(`║  DSH Server: ${DSH_URL}`)
  console.log(`║  Session DB: ${SESSIONS_FILE}`)
  console.log('╚══════════════════════════════════════════╝')

  return new Promise((resolve, reject) => {
    bot.start({
      onStart: (info) => {
        console.log(`🤖 Bot online: @${info.username}`)
        console.log(`📡 Waiting for messages...`)
        resolve(bot)
      },
    }).catch(reject)
  })
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── 直接執行入口 ────────────────────────────────────

const isMain = process.argv[1] && (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1].endsWith('index.js'))
if (isMain) {
  startBridge().catch(err => {
    console.error('💥 Fatal error:', err.message)
    process.exit(1)
  })
}