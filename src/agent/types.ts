/**
 * أنواع TypeScript لوكيل الذكاء الاصطناعي
 * TypeScript types for the AI agent
 */

/** إعدادات الوكيل / Agent configuration */
export type AgentConfig = {
  /** مفتاح OpenAI API / OpenAI API key */
  openaiApiKey: string;
  /** نموذج الذكاء الاصطناعي المستخدم / AI model to use */
  model?: string;
  /** الحد الأقصى لعدد التكرارات / Maximum number of iterations */
  maxIterations?: number;
};

/** رسالة في محادثة الوكيل / Agent conversation message */
export type AgentMessage = {
  /** دور المرسل / Message role */
  role: "user" | "assistant" | "tool" | "system";
  /** محتوى الرسالة / Message content */
  content: string;
  /** معرف استدعاء الأداة (للرسائل من نوع tool) / Tool call ID */
  toolCallId?: string;
  /** اسم الأداة المستخدمة / Tool name used */
  toolName?: string;
  /** الطابع الزمني / Timestamp */
  timestamp?: Date;
};

/** حالة المهمة / Task status */
export type TaskStatus = "idle" | "running" | "completed" | "failed" | "stopped";

/** نتيجة تنفيذ مهمة / Task execution result */
export type AgentResult = {
  /** هل نجحت المهمة / Was the task successful */
  success: boolean;
  /** رسالة النتيجة / Result message */
  message: string;
  /** خطوات التنفيذ / Execution steps */
  steps: AgentMessage[];
  /** حالة المهمة / Task status */
  status: TaskStatus;
};

/** خطوة تنفيذ أداة / Tool execution step */
export type ToolExecutionStep = {
  /** اسم الأداة / Tool name */
  toolName: string;
  /** المدخلات / Tool input */
  input: Record<string, unknown>;
  /** النتيجة / Tool output */
  output: string;
  /** هل نجحت / Was successful */
  success: boolean;
};
