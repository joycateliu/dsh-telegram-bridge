# dsh-telegram-bridge

> **Telegram Bot ↔ DeepSeek Harness (DSH) AI Agent 橋接工具**  
> 讓你直接從 Telegram 跟 DSH 的 AI agent 對話。

[![npm version](https://img.shields.io/npm/v/dsh-telegram-bridge)](https://www.npmjs.com/package/dsh-telegram-bridge)
[![License](https://img.shields.io/npm/l/dsh-telegram-bridge)](LICENSE)
[![Node](https://img.shields.io/node/v/dsh-telegram-bridge)](https://nodejs.org)

---

## ✨ 功能

- 💬 **Telegram 對話 DSH agent** — 傳訊息出去，得到 AI 回應
- 🔄 **每個 Telegram chat 獨立 session** — 各自對話不干擾
- 💾 **Session 持久化** — Bot 重啟後自動恢復（存於 `sessions.json`）
- 🚀 **零設定** — 只要一個 bot token + 正在執行的 DSH
- 📦 **單一依賴** — 只有 `grammy`，其餘用 Node.js 內建功能

## 📋 前置需求

- **Node.js** >= 18
- **DSH (DeepSeek Harness)** 正在執行（預設 `http://127.0.0.1:3080`）
- **Telegram Bot token** — 到 [@BotFather](https://t.me/botfather) 建立 bot 取得

## 🚀 快速開始

### 1. 用 npx 直接跑（不用安裝）

```bash
TELEGRAM_BOT_TOKEN=你的_bot_token npx dsh-telegram-bridge
```

### 2. 或全域安裝

```bash
npm install -g dsh-telegram-bridge

# 然後執行
dsh-telegram-bridge --token 你的_bot_token
```

### 3. 或本機安裝

```bash
npm install dsh-telegram-bridge
npx dsh-telegram-bridge --token 你的_bot_token
```

## 🤖 Bot 指令

| 指令 | 功能 |
|------|------|
| `/start` | 建立新對話連線 |
| `/new` | 開新話題（保留歷史） |
| `/status` | 查看連線狀態 |
| 直接傳文字 | 跟 AI agent 對話 |

## ⚙️ 選項

### CLI 參數

| 參數 | 環境變數 | 預設值 | 說明 |
|------|---------|--------|------|
| `--token` | `TELEGRAM_BOT_TOKEN` | — | Telegram Bot token（必填） |
| `--dsh-url` | `DSH_URL` | `http://127.0.0.1:3080` | DSH 伺服器網址 |

### 範例

```bash
# 用參數
dsh-telegram-bridge --token 123456:ABC-DEF1234 --dsh-url http://localhost:3080

# 用環境變數
export TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234
export DSH_URL=http://127.0.0.1:3080
dsh-telegram-bridge
```

## 🏗️ 架構

```
Telegram 使用者 → grammy bot → POST /api/session.prompt → DSH Agent
                           ← 輪詢 /api/session.history ←
                           → 回覆訊息到 Telegram
```

- 每個 Telegram chat 對應一個獨立的 DSH session
- Session 對應表存於 `sessions.json`（自動建立）
- 使用輪詢方式取得 agent 回應（間隔 800ms，最長等待 120s）

## 📁 檔案結構

```
dsh-telegram-bridge/
├── index.js                      # 核心橋接邏輯
├── bin/dsh-telegram-bridge.js    # CLI 入口
├── package.json
├── .env.example
├── README.md                     # 英文說明
├── README.zh-TW.md               # 繁體中文說明（本檔案）
└── sessions.json                 # 自動建立的 session 對應表
```

## ⚠️ 目前限制 (v0.1)

- 僅支援純文字訊息（圖片/檔案尚不支援）
- 約 1-2 秒回應延遲（輪詢方式，非 SSE 串流）
- 一個 bot 程序對應一個 DSH 實例

## 📄 授權

MIT