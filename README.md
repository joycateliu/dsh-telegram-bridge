# dsh-telegram-bridge

> **Telegram Bot ↔ DeepSeek Harness (DSH) AI Agent Bridge**  
> Chat with your DSH AI agent directly from Telegram.

[![npm version](https://img.shields.io/npm/v/dsh-telegram-bridge)](https://www.npmjs.com/package/dsh-telegram-bridge)
[![License](https://img.shields.io/npm/l/dsh-telegram-bridge)](LICENSE)
[![Node](https://img.shields.io/node/v/dsh-telegram-bridge)](https://nodejs.org)

> **🌏 繁體中文版說明請見：[README.zh-TW.md](README.zh-TW.md)**

---

## ✨ Features

- 💬 **Chat with DSH agent via Telegram** — send a message, get an AI response
- 🔄 **One session per Telegram chat** — independent conversations, no interference
- 💾 **Session persistence** — survives restarts (stored in `sessions.json`)
- 🚀 **Zero configuration** — just a bot token and a running DSH instance
- 📦 **Single dependency** — only `grammy` for Telegram Bot API

## 📋 Prerequisites

- **Node.js** >= 18
- **DSH (DeepSeek Harness)** running locally (default: `http://127.0.0.1:3080`)
- **Telegram Bot token** — get one from [@BotFather](https://t.me/botfather)

## 🚀 Quick Start

### 1. Run directly with npx (no install needed)

```bash
TELEGRAM_BOT_TOKEN=your_bot_token npx dsh-telegram-bridge
```

### 2. Or install globally

```bash
npm install -g dsh-telegram-bridge

# Then run
dsh-telegram-bridge --token your_bot_token
```

### 3. Or install locally

```bash
npm install dsh-telegram-bridge
npx dsh-telegram-bridge --token your_bot_token
```

## 🤖 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Start a new conversation session |
| `/new` | Start a new topic (history preserved) |
| `/status` | Check connection status |
| Any text message | Chat with the AI agent |

## ⚙️ Options

### CLI flags

| Flag | Environment Variable | Default | Description |
|------|---------------------|---------|-------------|
| `--token` | `TELEGRAM_BOT_TOKEN` | — | Telegram Bot token (required) |
| `--dsh-url` | `DSH_URL` | `http://127.0.0.1:3080` | DSH server URL |

### Example

```bash
# With flags
dsh-telegram-bridge --token 123456:ABC-DEF1234 --dsh-url http://localhost:3080

# With env vars
export TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234
export DSH_URL=http://127.0.0.1:3080
dsh-telegram-bridge
```

## 🏗️ Architecture

```
Telegram User → grammy bot → POST /api/session.prompt → DSH Agent
                           ← Poll /api/session.history ←
                           → Reply message to Telegram
```

- Each Telegram chat gets its own DSH session
- Session mapping is persisted in `sessions.json` (auto-created)
- Uses polling for agent responses (800ms interval, 120s timeout)

## 📁 Project Structure

```
dsh-telegram-bridge/
├── index.js                      # Core bridge logic
├── bin/dsh-telegram-bridge.js    # CLI entry point
├── package.json
├── .env.example
├── README.md                     # English (this file)
├── README.zh-TW.md               # Traditional Chinese
└── sessions.json                 # Auto-created session mapping
```

## ⚠️ Limitations (v0.1)

- Text-only messages (images/files not supported yet)
- ~1-2s response latency (polling-based, not SSE streaming)
- One bot process per DSH instance

## 📄 License

MIT