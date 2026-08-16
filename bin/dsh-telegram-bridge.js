#!/usr/bin/env node

/**
 * dsh-telegram-bridge CLI entry point.
 *
 * Usage:
 *   dsh-telegram-bridge --token <bot-token> [--dsh-url <url>]
 *   dsh-telegram-bridge --help
 *
 * Environment variables:
 *   TELEGRAM_BOT_TOKEN  (required)
 *   DSH_URL             (default: http://127.0.0.1:3080)
 */

import { startBridge } from '../index.js'

const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
dsh-telegram-bridge — Telegram Bot ↔ DeepSeek Harness (DSH) AI Agent Bridge

USAGE
  dsh-telegram-bridge --token <bot-token> [options]

OPTIONS
  --token <token>    Telegram Bot token (from @BotFather)
                     Falls back to TELEGRAM_BOT_TOKEN env var
  --dsh-url <url>    DSH server URL (default: http://127.0.0.1:3080)
  --help, -h         Show this help

ENVIRONMENT
  TELEGRAM_BOT_TOKEN  Bot token (required if --token not given)
  DSH_URL             DSH server URL

EXAMPLES
  dsh-telegram-bridge --token 123456:ABC-DEF1234
  TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234 dsh-telegram-bridge
  dsh-telegram-bridge --token 123456:ABC-DEF1234 --dsh-url http://localhost:3080
`)
  process.exit(0)
}

const options = {}

const tokenIdx = args.indexOf('--token')
if (tokenIdx !== -1 && args[tokenIdx + 1]) {
  options.token = args[tokenIdx + 1]
}

const urlIdx = args.indexOf('--dsh-url')
if (urlIdx !== -1 && args[urlIdx + 1]) {
  options.dshUrl = args[urlIdx + 1]
}

startBridge(options).catch(err => {
  console.error(err.message)
  process.exit(1)
})