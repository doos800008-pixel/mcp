<a href="https://browsermcp.io">
  <img src="./.github/images/banner.png" alt="Browser MCP banner">
</a>

<h3 align="center">Browser MCP</h3>

<p align="center">
  Automate your browser with AI.
  <br />
  <a href="https://browsermcp.io"><strong>Website</strong></a> 
  •
  <a href="https://docs.browsermcp.io"><strong>Docs</strong></a>
</p>

## About

Browser MCP is an MCP server + Chrome extension that allows you to automate your browser using AI applications like VS Code, Claude, Cursor, and Windsurf.

## Features

- ⚡ Fast: Automation happens locally on your machine, resulting in better performance without network latency.
- 🔒 Private: Since automation happens locally, your browser activity stays on your device and isn't sent to remote servers.
- 👤 Logged In: Uses your existing browser profile, keeping you logged into all your services.
- 🥷🏼 Stealth: Avoids basic bot detection and CAPTCHAs by using your real browser fingerprint.

## 🤖 وكيل الذكاء الاصطناعي / AI Agent

يتضمن هذا المشروع وكيل ذكاء اصطناعي مدمج يستخدم **OpenAI GPT-4o** للتحكم التلقائي في المتصفح.

This project includes a built-in AI agent powered by **OpenAI GPT-4o** for automated browser control.

### الإعداد / Setup

#### 1. الحصول على OpenAI API Key

1. انتقل إلى [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. اضغط على **Create new secret key**
3. انسخ المفتاح

#### 2. إعداد ملف البيئة / Environment Setup

```bash
# انسخ ملف المثال / Copy example file
cp .env.example .env

# أضف مفتاحك / Add your key
OPENAI_API_KEY=sk-your-key-here
```

### تشغيل الوكيل / Running the Agent

#### واجهة الويب / Web UI

```bash
# بناء المشروع / Build the project
npm run build:agent

# تشغيل خادم الواجهة / Start the UI server
npm run agent:server
# افتح http://localhost:3001 في متصفحك
```

#### سطر الأوامر / CLI

```bash
# بناء المشروع / Build
npm run build:agent

# الوضع التفاعلي / Interactive mode
npm run agent

# تنفيذ مهمة واحدة / Single task
npm run agent -- "افتح google.com وابحث عن أخبار الذكاء الاصطناعي"
```

### أمثلة على المهام / Example Tasks

```
افتح موقع Wikipedia وابحث عن تاريخ الذكاء الاصطناعي
```

```
انتقل إلى github.com/trending واعرض أكثر المستودعات شهرة هذا الأسبوع
```

```
افتح موقع بحث وابحث عن أحدث أخبار التكنولوجيا ثم خذ لقطة شاشة
```

### بنية الوكيل / Agent Architecture

```
src/
├── agent/
│   ├── ai-agent.ts        ← وكيل الذكاء الاصطناعي / AI Agent class
│   ├── tool-definitions.ts ← تعريفات أدوات OpenAI / OpenAI tool definitions
│   └── types.ts           ← أنواع TypeScript / TypeScript types
├── api/
│   └── server.ts          ← خادم API Express / Express API server
├── ui/
│   ├── index.html         ← واجهة الويب / Web UI
│   ├── styles.css         ← التصميم / Styles
│   └── app.js             ← منطق الواجهة / Frontend logic
└── agent-cli.ts           ← أداة سطر الأوامر / CLI tool
```

### API Endpoints

| Method | Endpoint | الوصف |
|--------|----------|-------|
| `POST` | `/api/agent/execute` | تنفيذ مهمة جديدة / Execute a new task |
| `GET` | `/api/agent/status` | حالة المهمة الحالية / Current task status |
| `POST` | `/api/agent/stop` | إيقاف المهمة / Stop current task |
| `POST` | `/api/agent/reset` | مسح سجل المحادثة / Clear conversation |

### متطلبات الاتصال / Connection Requirements

لكي يعمل الوكيل، يجب:

1. تثبيت **Browser MCP Chrome Extension**
2. فتح الإضافة والضغط على **Connect**
3. إضافة `OPENAI_API_KEY` في ملف `.env`

## Contributing

This repo contains all the core MCP code for Browser MCP, but currently cannot yet be built on its own due to dependencies on utils and types from the monorepo where it's developed.

## Credits

Browser MCP was adapted from the [Playwright MCP server](https://github.com/microsoft/playwright-mcp) in order to automate the user's browser rather than creating new browser instances. This allows using the user's existing browser profile to use logged-in sessions and avoid bot detection mechanisms that commonly block automated browser use.
