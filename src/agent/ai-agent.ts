/**
 * وكيل الذكاء الاصطناعي للتحكم في المتصفح
 * AI agent for browser automation using OpenAI GPT-4o
 */
import OpenAI from "openai";

import type { Context } from "@/context";

import { browserToolDefinitions } from "./tool-definitions";
import type { AgentConfig, AgentMessage, AgentResult, TaskStatus } from "./types";

/** System prompt يوجه الوكيل لاستخدام الأدوات بفعالية */
const AGENT_SYSTEM_PROMPT = `أنت وكيل ذكاء اصطناعي متخصص في التحكم في متصفح الويب وأتمتة المهام.
You are an AI agent specialized in browser automation and web task execution.

## قدراتك / Your capabilities:
- التنقل بين صفحات الويب (browser_navigate)
- النقر على العناصر (browser_click)
- كتابة النص في الحقول (browser_type)
- التقاط لقطات للشاشة (browser_screenshot)
- التقاط لقطة إمكانية الوصول للصفحة (browser_snapshot)
- التمرير فوق العناصر (browser_hover)
- اختيار خيارات من القوائم (browser_select_option)
- الضغط على مفاتيح لوحة المفاتيح (browser_press_key)
- الانتظار لثواني محددة (browser_wait)
- التنقل للخلف والأمام (browser_go_back, browser_go_forward)
- الحصول على سجلات وحدة التحكم (browser_get_console_logs)

## إرشادات العمل / Working guidelines:
1. ابدأ دائماً بأخذ لقطة من الصفحة (browser_snapshot) لفهم المحتوى الحالي
2. نفذ المهام خطوة بخطوة بشكل منهجي
3. تحقق من نتيجة كل خطوة قبل المتابعة
4. عند مواجهة خطأ، حاول طريقة بديلة
5. أخبر المستخدم بما تقوم به في كل خطوة
6. عند اكتمال المهمة، لخص ما تم إنجازه

Always start by taking a page snapshot to understand the current state.
Execute tasks step by step. Verify each step before proceeding.
Inform the user of each action you take. Summarize when complete.`;

export class BrowserAIAgent {
  private openai: OpenAI;
  private config: Required<AgentConfig>;
  private conversationHistory: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  private currentStatus: TaskStatus = "idle";
  private isStopped: boolean = false;
  private executionSteps: AgentMessage[] = [];

  constructor(config: AgentConfig) {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.config = {
      openaiApiKey: config.openaiApiKey,
      model: config.model ?? "gpt-4o",
      maxIterations: config.maxIterations ?? 20,
    };
  }

  /** الحصول على حالة المهمة الحالية / Get current task status */
  getStatus(): TaskStatus {
    return this.currentStatus;
  }

  /** إيقاف تنفيذ المهمة الحالية / Stop current task execution */
  stop(): void {
    this.isStopped = true;
    this.currentStatus = "stopped";
  }

  /** مسح سجل المحادثة / Reset conversation history */
  resetConversation(): void {
    this.conversationHistory = [];
    this.executionSteps = [];
    this.currentStatus = "idle";
    this.isStopped = false;
  }

  /**
   * تنفيذ مهمة باستخدام وكيل الذكاء الاصطناعي
   * Execute a task using the AI agent
   */
  async executeTask(
    task: string,
    context: Context,
    onStep?: (step: AgentMessage) => void,
  ): Promise<AgentResult> {
    this.currentStatus = "running";
    this.isStopped = false;
    this.executionSteps = [];

    // إضافة system prompt إذا لم يكن موجوداً
    if (this.conversationHistory.length === 0) {
      this.conversationHistory.push({
        role: "system",
        content: AGENT_SYSTEM_PROMPT,
      });
    }

    // إضافة مهمة المستخدم
    const userMessage: AgentMessage = {
      role: "user",
      content: task,
      timestamp: new Date(),
    };
    this.executionSteps.push(userMessage);
    this.conversationHistory.push({ role: "user", content: task });

    if (onStep) onStep(userMessage);

    let iterations = 0;

    try {
      while (iterations < this.config.maxIterations) {
        // التحقق من إيقاف المهمة
        if (this.isStopped) {
          this.currentStatus = "stopped";
          return {
            success: false,
            message: "تم إيقاف المهمة من قبل المستخدم / Task stopped by user",
            steps: this.executionSteps,
            status: "stopped",
          };
        }

        iterations++;

        // استدعاء OpenAI API
        const response = await this.openai.chat.completions.create({
          model: this.config.model,
          messages: this.conversationHistory,
          tools: browserToolDefinitions,
          tool_choice: "auto",
        });

        const message = response.choices[0].message;
        this.conversationHistory.push(message);

        // إذا لم يكن هناك استدعاء أدوات، المهمة اكتملت
        if (!message.tool_calls || message.tool_calls.length === 0) {
          const assistantMessage: AgentMessage = {
            role: "assistant",
            content: message.content ?? "تم إنجاز المهمة / Task completed",
            timestamp: new Date(),
          };
          this.executionSteps.push(assistantMessage);
          if (onStep) onStep(assistantMessage);

          this.currentStatus = "completed";
          return {
            success: true,
            message: message.content ?? "تم إنجاز المهمة / Task completed",
            steps: this.executionSteps,
            status: "completed",
          };
        }

        // إضافة رسالة الوكيل (إن وجدت) إلى الخطوات
        if (message.content) {
          const assistantMessage: AgentMessage = {
            role: "assistant",
            content: message.content,
            timestamp: new Date(),
          };
          this.executionSteps.push(assistantMessage);
          if (onStep) onStep(assistantMessage);
        }

        // تنفيذ كل أداة مطلوبة
        for (const toolCall of message.tool_calls) {
          if (this.isStopped) break;

          const toolName = toolCall.function.name;
          let toolArgs: Record<string, unknown> = {};

          try {
            toolArgs = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
          } catch {
            toolArgs = {};
          }

          // تسجيل بدء تنفيذ الأداة
          const toolStartMessage: AgentMessage = {
            role: "tool",
            content: `⚙️ استدعاء: ${toolName}(${JSON.stringify(toolArgs)})`,
            toolName,
            timestamp: new Date(),
          };
          this.executionSteps.push(toolStartMessage);
          if (onStep) onStep(toolStartMessage);

          // تنفيذ الأداة
          let toolResult: string;
          let toolSuccess = true;
          try {
            toolResult = await this.executeBrowserTool(toolName, toolArgs, context);
          } catch (err) {
            toolResult = `خطأ في تنفيذ الأداة / Tool error: ${String(err)}`;
            toolSuccess = false;
          }

          // تسجيل نتيجة الأداة
          const toolResultMessage: AgentMessage = {
            role: "tool",
            content: toolSuccess
              ? `✅ نتيجة ${toolName}: ${toolResult.substring(0, 200)}${toolResult.length > 200 ? "..." : ""}`
              : `❌ ${toolResult}`,
            toolCallId: toolCall.id,
            toolName,
            timestamp: new Date(),
          };
          this.executionSteps.push(toolResultMessage);
          if (onStep) onStep(toolResultMessage);

          // إضافة نتيجة الأداة إلى سجل المحادثة
          this.conversationHistory.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolResult,
          });
        }
      }

      // تجاوز الحد الأقصى للتكرارات
      this.currentStatus = "failed";
      return {
        success: false,
        message: `تم الوصول للحد الأقصى من الخطوات (${this.config.maxIterations}) / Reached maximum iterations`,
        steps: this.executionSteps,
        status: "failed",
      };
    } catch (error) {
      this.currentStatus = "failed";
      const errorMessage = String(error);
      return {
        success: false,
        message: `حدث خطأ / Error occurred: ${errorMessage}`,
        steps: this.executionSteps,
        status: "failed",
      };
    }
  }

  /**
   * تنفيذ أداة متصفح بناءً على اسمها
   * Execute a browser tool by name using the Context
   */
  private async executeBrowserTool(
    toolName: string,
    args: Record<string, unknown>,
    context: Context,
  ): Promise<string> {
    switch (toolName) {
      case "browser_navigate": {
        const url = args.url as string;
        await context.sendSocketMessage("browser_navigate", { url });
        return `تم الانتقال إلى / Navigated to: ${url}`;
      }

      case "browser_click": {
        const element = args.element as string;
        const ref = args.ref as string | undefined;
        await context.sendSocketMessage("browser_click", { element, ref: ref ?? "" });
        return `تم النقر على / Clicked: ${element}`;
      }

      case "browser_type": {
        const element = args.element as string;
        const text = args.text as string;
        const submit = (args.submit as boolean | undefined) ?? false;
        await context.sendSocketMessage("browser_type", { element, text, submit, ref: (args.ref as string | undefined) ?? "", slowly: false });
        return `تم الكتابة / Typed "${text}" in: ${element}`;
      }

      case "browser_snapshot": {
        const url = await context.sendSocketMessage("getUrl", undefined);
        const title = await context.sendSocketMessage("getTitle", undefined);
        const snapshotData = await context.sendSocketMessage("browser_snapshot", {});
        return `URL: ${url}\nTitle: ${title}\nSnapshot:\n${snapshotData}`;
      }

      case "browser_screenshot": {
        const screenshotData = await context.sendSocketMessage("browser_screenshot", {});
        return `تم التقاط لقطة شاشة / Screenshot taken (base64 length: ${screenshotData.length})`;
      }

      case "browser_hover": {
        const element = args.element as string;
        await context.sendSocketMessage("browser_hover", { element, ref: (args.ref as string | undefined) ?? "" });
        return `تم التمرير فوق / Hovered over: ${element}`;
      }

      case "browser_select_option": {
        const element = args.element as string;
        const values = args.values as string[];
        await context.sendSocketMessage("browser_select_option", { element, values, refs: [] });
        return `تم اختيار / Selected options in: ${element}`;
      }

      case "browser_press_key": {
        const key = args.key as string;
        await context.sendSocketMessage("browser_press_key", { key });
        return `تم الضغط على المفتاح / Pressed key: ${key}`;
      }

      case "browser_wait": {
        const time = args.time as number;
        await context.sendSocketMessage("browser_wait", { time });
        return `تم الانتظار / Waited for: ${time} seconds`;
      }

      case "browser_go_back": {
        await context.sendSocketMessage("browser_go_back", {});
        return "تم الرجوع للصفحة السابقة / Navigated back";
      }

      case "browser_go_forward": {
        await context.sendSocketMessage("browser_go_forward", {});
        return "تم التقدم للصفحة التالية / Navigated forward";
      }

      case "browser_get_console_logs": {
        const logs = await context.sendSocketMessage("browser_get_console_logs", {});
        // تقييد عدد السجلات لتجنب المخرجات الكبيرة / Limit logs to avoid large outputs
        const maxLogs = 50;
        const limitedLogs = logs.slice(-maxLogs);
        const logsText = limitedLogs.map((log) => JSON.stringify(log)).join("\n");
        const truncatedNote = logs.length > maxLogs ? `\n(عرض آخر ${maxLogs} من ${logs.length} / Showing last ${maxLogs} of ${logs.length})` : "";
        return `سجلات وحدة التحكم / Console logs:\n${logsText || "(لا توجد سجلات / No logs)"}${truncatedNote}`;
      }

      default:
        throw new Error(`أداة غير معروفة / Unknown tool: ${toolName}`);
    }
  }
}
