#!/usr/bin/env node
/**
 * واجهة سطر أوامر لوكيل المتصفح الذكي
 * CLI for the Browser AI Agent
 */
import dotenv from "dotenv";
import * as readline from "node:readline";
import { WebSocketServer } from "ws";

import { BrowserAIAgent } from "@/agent/ai-agent";
import type { AgentMessage } from "@/agent/types";
import { Context } from "@/context";
import { isPortInUse, killProcessOnPort } from "@/utils/port";
import { wait } from "@repo/utils";

// تحميل متغيرات البيئة / Load environment variables
dotenv.config();

const WS_PORT = parseInt(process.env.WS_PORT ?? "9009", 10);

/** ألوان الطرفية / Terminal colors */
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
};

function log(color: string, prefix: string, message: string): void {
  console.log(`${color}${colors.bold}${prefix}${colors.reset} ${message}`);
}

/** طباعة خطوة تنفيذ / Print execution step */
function printStep(step: AgentMessage): void {
  const content = step.content;
  if (content.startsWith("⚙️")) {
    log(colors.cyan, "[أداة]", content.replace("⚙️ ", ""));
  } else if (content.startsWith("✅")) {
    log(colors.green, "[نتيجة]", content.replace("✅ ", ""));
  } else if (content.startsWith("❌")) {
    log(colors.red, "[خطأ]", content.replace("❌ ", ""));
  } else if (step.role === "assistant") {
    log(colors.blue, "[الوكيل]", content);
  }
}

/** تهيئة WebSocket / Initialize WebSocket server */
async function initWebSocket(): Promise<{ context: Context; wss: WebSocketServer }> {
  killProcessOnPort(WS_PORT);
  while (await isPortInUse(WS_PORT)) {
    await wait(100);
  }

  const wss = new WebSocketServer({ port: WS_PORT });
  const context = new Context();

  wss.on("connection", (ws) => {
    if (context.hasWs()) {
      context.ws.close();
    }
    context.ws = ws;
    log(colors.green, "[اتصال]", "تم اتصال المتصفح / Browser connected");
  });

  console.log(
    `\n${colors.yellow}${colors.bold}═══════════════════════════════════════${colors.reset}`,
  );
  console.log(
    `${colors.cyan}${colors.bold}  🤖 وكيل المتصفح الذكي / Browser AI Agent${colors.reset}`,
  );
  console.log(
    `${colors.yellow}${colors.bold}═══════════════════════════════════════${colors.reset}\n`,
  );
  console.log(
    `${colors.gray}خادم WebSocket يعمل على المنفذ / WebSocket server on port: ${colors.bold}${WS_PORT}${colors.reset}`,
  );
  console.log(
    `${colors.gray}افتح إضافة Browser MCP في متصفحك واضغط Connect${colors.reset}`,
  );
  console.log(
    `${colors.gray}Open Browser MCP extension and click Connect\n${colors.reset}`,
  );

  return { context, wss };
}

/** تشغيل مهمة واحدة / Run single task */
async function runTask(task: string, agent: BrowserAIAgent, context: Context): Promise<void> {
  log(colors.magenta, "[مهمة]", task);
  console.log(`${colors.gray}${"─".repeat(50)}${colors.reset}`);

  const result = await agent.executeTask(task, context, printStep);

  console.log(`\n${colors.gray}${"─".repeat(50)}${colors.reset}`);

  if (result.success) {
    log(colors.green, "[مكتمل]", result.message);
  } else {
    log(colors.red, "[فشل]", result.message);
  }

  console.log(
    `${colors.gray}عدد الخطوات / Steps: ${result.steps.length}${colors.reset}\n`,
  );
}

/** الوضع التفاعلي / Interactive mode */
async function interactiveMode(agent: BrowserAIAgent, context: Context): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(
    `${colors.green}${colors.bold}الوضع التفاعلي / Interactive mode${colors.reset}`,
  );
  console.log(
    `${colors.gray}اكتب مهمة أو اكتب 'خروج' / 'exit' للخروج${colors.reset}`,
  );
  console.log(
    `${colors.gray}اكتب 'مسح' / 'clear' لمسح سجل المحادثة\n${colors.reset}`,
  );

  const promptUser = (): void => {
    rl.question(`${colors.cyan}${colors.bold}> ${colors.reset}`, async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        promptUser();
        return;
      }

      if (trimmed === "خروج" || trimmed === "exit" || trimmed === "quit") {
        console.log(
          `\n${colors.yellow}وداعاً! / Goodbye!${colors.reset}`,
        );
        rl.close();
        process.exit(0);
      }

      if (trimmed === "مسح" || trimmed === "clear") {
        agent.resetConversation();
        log(colors.green, "[نظام]", "تم مسح سجل المحادثة / Conversation cleared");
        promptUser();
        return;
      }

      if (!context.hasWs()) {
        log(
          colors.red,
          "[خطأ]",
          "لا يوجد اتصال بالمتصفح. تأكد من فتح إضافة Browser MCP / No browser connection",
        );
        promptUser();
        return;
      }

      await runTask(trimmed, agent, context);
      promptUser();
    });
  };

  promptUser();
}

/** نقطة الدخول الرئيسية / Main entry point */
async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    log(
      colors.red,
      "[خطأ]",
      "لم يتم تعيين OPENAI_API_KEY. أنشئ ملف .env وأضف المفتاح.",
    );
    log(
      colors.red,
      "[Error]",
      "OPENAI_API_KEY is not set. Create a .env file and add your key.",
    );
    process.exit(1);
  }

  const agent = new BrowserAIAgent({
    openaiApiKey: apiKey,
    model: process.env.OPENAI_MODEL ?? "gpt-4o",
    maxIterations: parseInt(process.env.MAX_ITERATIONS ?? "20", 10),
  });

  const { context, wss } = await initWebSocket();

  // الوسيطة من سطر الأوامر / Command line argument
  const taskArg = process.argv[2];

  if (taskArg) {
    // تشغيل مهمة واحدة ثم الخروج
    console.log(
      `${colors.gray}انتظار اتصال المتصفح / Waiting for browser connection...${colors.reset}`,
    );

    // الانتظار لاتصال المتصفح / Wait for browser connection
    await new Promise<void>((resolve) => {
      if (context.hasWs()) {
        resolve();
        return;
      }
      wss.once("connection", () => {
        setTimeout(resolve, 500);
      });
      // timeout بعد 30 ثانية
      setTimeout(() => {
        if (!context.hasWs()) {
          log(colors.red, "[خطأ]", "انتهت مهلة الاتصال / Connection timeout");
          process.exit(1);
        } else {
          resolve();
        }
      }, 30000);
    });

    await runTask(taskArg, agent, context);
    wss.close();
    process.exit(0);
  } else {
    // الوضع التفاعلي / Interactive mode
    await interactiveMode(agent, context);
  }
}

main().catch((err: unknown) => {
  log(colors.red, "[خطأ فادح]", String(err));
  process.exit(1);
});
