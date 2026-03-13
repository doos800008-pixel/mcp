/**
 * خادم API للوكيل الذكاء الاصطناعي
 * Express API server for the AI agent
 */
import cors from "cors";
import dotenv from "dotenv";
import express, { type NextFunction, type Request, type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";

import { Context } from "@/context";
import { BrowserAIAgent } from "@/agent/ai-agent";
import type { AgentResult, TaskStatus } from "@/agent/types";
import { isPortInUse, killProcessOnPort } from "@/utils/port";
import { wait } from "@repo/utils";

// تحميل متغيرات البيئة / Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_PORT = parseInt(process.env.API_PORT ?? "3001", 10);
const WS_PORT = parseInt(process.env.WS_PORT ?? "9009", 10);

/**
 * معدّل طلبات بسيط في الذاكرة / Simple in-memory rate limiter
 * يحمي من الطلبات المفرطة / Protects against excessive requests
 */
function createRateLimiter(maxRequests: number, windowMs: number) {
  const requestCounts = new Map<string, { count: number; resetAt: number }>();
  return function rateLimiter(req: Request, res: Response, next: NextFunction): void {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const now = Date.now();
    const entry = requestCounts.get(ip);
    if (!entry || now > entry.resetAt) {
      requestCounts.set(ip, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (entry.count >= maxRequests) {
      res.status(429).json({ error: "Too many requests. Please slow down." });
      return;
    }
    entry.count++;
    next();
  };
}

// معدّل طلبات للـ API / API rate limiter: 60 requests per minute
const apiLimiter = createRateLimiter(60, 60_000);
// معدّل طلبات للملفات الثابتة / Static files rate limiter: 120 requests per minute
const staticLimiter = createRateLimiter(120, 60_000);

/** حالة الخادم / Server state */
let context: Context | null = null;
let agent: BrowserAIAgent | null = null;
let currentTask: {
  id: string;
  status: TaskStatus;
  result?: AgentResult;
  startedAt: Date;
} | null = null;

/** تهيئة خادم WebSocket / Initialize WebSocket server */
async function initWebSocketServer(): Promise<WebSocketServer> {
  killProcessOnPort(WS_PORT);
  while (await isPortInUse(WS_PORT)) {
    await wait(100);
  }
  const wss = new WebSocketServer({ port: WS_PORT });
  console.error(`[Agent] WebSocket server listening on port ${WS_PORT}`);
  return wss;
}

/** تهيئة الوكيل / Initialize agent */
function initAgent(): BrowserAIAgent {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Please add it to your .env file.",
    );
  }
  return new BrowserAIAgent({
    openaiApiKey: apiKey,
    model: process.env.OPENAI_MODEL ?? "gpt-4o",
    maxIterations: parseInt(process.env.MAX_ITERATIONS ?? "20", 10),
  });
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // تقديم ملفات الواجهة مع معدّل طلبات / Serve UI files with rate limiter
  const uiPath = path.join(__dirname, "../ui");
  app.use(staticLimiter, express.static(uiPath));

  // تهيئة WebSocket و Context
  context = new Context();
  const wss = await initWebSocketServer();

  wss.on("connection", (websocket) => {
    console.error("[Agent] Browser extension connected");
    if (context!.hasWs()) {
      context!.ws.close();
    }
    context!.ws = websocket;
  });

  // تهيئة الوكيل
  try {
    agent = initAgent();
    console.error("[Agent] AI agent initialized successfully");
  } catch (err) {
    console.error("[Agent] Warning:", String(err));
    console.error("[Agent] Set OPENAI_API_KEY in .env to enable AI features");
  }

  /**
   * POST /api/agent/execute
   * تنفيذ مهمة جديدة / Execute a new task
   */
  app.post("/api/agent/execute", apiLimiter, async (req: Request, res: Response) => {
    const { task } = req.body as { task?: string };

    if (!task || typeof task !== "string" || task.trim() === "") {
      res.status(400).json({
        success: false,
        error: "يجب توفير مهمة نصية / Task text is required",
      });
      return;
    }

    if (!agent) {
      res.status(503).json({
        success: false,
        error:
          "الوكيل غير مهيأ. تأكد من إعداد OPENAI_API_KEY / Agent not initialized. Please set OPENAI_API_KEY",
      });
      return;
    }

    if (!context || !context.hasWs()) {
      res.status(503).json({
        success: false,
        error:
          "لا يوجد اتصال بالمتصفح. افتح إضافة Browser MCP في المتصفح واضغط Connect / No browser connection. Open Browser MCP extension and click Connect",
      });
      return;
    }

    if (currentTask?.status === "running") {
      res.status(409).json({
        success: false,
        error: "هناك مهمة جارية بالفعل. انتظر أو أوقفها أولاً / A task is already running. Wait or stop it first",
      });
      return;
    }

    const taskId = `task_${Date.now()}`;
    currentTask = {
      id: taskId,
      status: "running",
      startedAt: new Date(),
    };

    // تنفيذ المهمة بشكل غير متزامن / Execute task asynchronously
    agent
      .executeTask(task.trim(), context)
      .then((result) => {
        if (currentTask?.id === taskId) {
          currentTask.status = result.status;
          currentTask.result = result;
        }
      })
      .catch((err: unknown) => {
        if (currentTask?.id === taskId) {
          currentTask.status = "failed";
          currentTask.result = {
            success: false,
            message: String(err),
            steps: [],
            status: "failed",
          };
        }
      });

    res.json({
      success: true,
      taskId,
      message: "تم بدء تنفيذ المهمة / Task execution started",
    });
  });

  /**
   * GET /api/agent/status
   * الحصول على حالة المهمة الحالية / Get current task status
   */
  app.get("/api/agent/status", apiLimiter, (_req: Request, res: Response) => {
    if (!currentTask) {
      res.json({
        status: "idle",
        hasTask: false,
        browserConnected: context?.hasWs() ?? false,
        agentReady: !!agent,
      });
      return;
    }

    res.json({
      status: currentTask.status,
      taskId: currentTask.id,
      hasTask: true,
      startedAt: currentTask.startedAt,
      result: currentTask.result,
      steps: currentTask.result?.steps ?? [],
      browserConnected: context?.hasWs() ?? false,
      agentReady: !!agent,
    });
  });

  /**
   * POST /api/agent/stop
   * إيقاف المهمة الحالية / Stop the current task
   */
  app.post("/api/agent/stop", apiLimiter, (_req: Request, res: Response) => {
    if (!currentTask || currentTask.status !== "running") {
      res.status(400).json({
        success: false,
        error: "لا توجد مهمة جارية / No running task to stop",
      });
      return;
    }

    if (agent) {
      agent.stop();
    }

    if (currentTask) {
      currentTask.status = "stopped";
    }

    res.json({
      success: true,
      message: "تم إيقاف المهمة / Task stopped",
    });
  });

  /**
   * POST /api/agent/reset
   * مسح سجل المحادثة / Reset conversation history
   */
  app.post("/api/agent/reset", apiLimiter, (_req: Request, res: Response) => {
    if (agent) {
      agent.resetConversation();
    }
    currentTask = null;
    res.json({
      success: true,
      message: "تم مسح سجل المحادثة / Conversation history cleared",
    });
  });

  // بدء الاستماع / Start listening
  app.listen(API_PORT, () => {
    console.error(`[Agent] API server running at http://localhost:${API_PORT}`);
    console.error(`[Agent] Open http://localhost:${API_PORT} to access the UI`);
  });
}

startServer().catch((err: unknown) => {
  console.error("[Agent] Fatal error:", err);
  process.exit(1);
});
