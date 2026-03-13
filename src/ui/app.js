/**
 * وكيل المتصفح الذكي - منطق الواجهة
 * Browser AI Agent - Frontend JavaScript
 */

// ===== الحالة / State =====
const state = {
  isRunning: false,
  currentTaskId: null,
  pollInterval: null,
  startTime: null,
  steps: [],
  messages: [],
};

// ===== عناصر DOM / DOM Elements =====
const els = {
  taskInput: document.getElementById("taskInput"),
  executeBtn: document.getElementById("executeBtn"),
  stopBtn: document.getElementById("stopBtn"),
  clearBtn: document.getElementById("clearBtn"),
  chatMessages: document.getElementById("chatMessages"),
  stepsPanel: document.getElementById("stepsPanel"),
  stepsList: document.getElementById("stepsList"),
  stepsCount: document.getElementById("stepsCount"),
  taskStatusBadge: document.getElementById("taskStatusBadge"),
  taskStatusIcon: document.getElementById("taskStatusIcon"),
  taskStatusText: document.getElementById("taskStatusText"),
  taskResult: document.getElementById("taskResult"),
  resultIcon: document.getElementById("resultIcon"),
  resultTitle: document.getElementById("resultTitle"),
  resultContent: document.getElementById("resultContent"),
  stepsCountStat: document.getElementById("stepsCountStat"),
  durationStat: document.getElementById("durationStat"),
  browserDot: document.getElementById("browserDot"),
  browserStatusText: document.getElementById("browserStatusText"),
  agentDot: document.getElementById("agentDot"),
  agentStatusText: document.getElementById("agentStatusText"),
  browserConnStat: document.getElementById("browserConnStat"),
  instructionsCard: document.getElementById("instructionsCard"),
};

// ===== تحديث حالة الاتصال / Update connection status =====
function updateConnectionStatus(browserConnected, agentReady) {
  // حالة المتصفح
  if (browserConnected) {
    els.browserDot.className = "status-dot connected";
    els.browserStatusText.textContent = "المتصفح متصل";
    els.browserConnStat.textContent = "متصل";
    els.instructionsCard.style.display = "none";
  } else {
    els.browserDot.className = "status-dot disconnected";
    els.browserStatusText.textContent = "المتصفح غير متصل";
    els.browserConnStat.textContent = "غير متصل";
    els.instructionsCard.style.display = "block";
  }

  // حالة الوكيل
  if (agentReady) {
    els.agentDot.className = "status-dot ready";
    els.agentStatusText.textContent = "الوكيل جاهز";
  } else {
    els.agentDot.className = "status-dot";
    els.agentStatusText.textContent = "الوكيل غير جاهز";
  }
}

// ===== تحديث حالة المهمة / Update task status =====
function updateTaskStatus(status) {
  const statusMap = {
    idle: { icon: "⏸️", text: "في الانتظار", cls: "" },
    running: { icon: "⚡", text: "جاري التنفيذ...", cls: "running" },
    completed: { icon: "✅", text: "اكتملت", cls: "completed" },
    failed: { icon: "❌", text: "فشلت", cls: "failed" },
    stopped: { icon: "⏹️", text: "أوقفت", cls: "stopped" },
  };

  const s = statusMap[status] || statusMap.idle;
  els.taskStatusIcon.textContent = s.icon;
  els.taskStatusText.textContent = s.text;
  els.taskStatusBadge.className = `task-status-badge ${s.cls}`;
}

// ===== إضافة رسالة / Add chat message =====
function addMessage(role, content, timestamp) {
  // إخفاء رسالة الترحيب عند أول رسالة
  const welcome = els.chatMessages.querySelector(".welcome-message");
  if (welcome) welcome.remove();

  const div = document.createElement("div");
  div.className = `message message-${role}`;

  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

  const roleLabel = {
    user: "أنت",
    assistant: "الوكيل",
    tool: "الأداة",
    system: "النظام",
  }[role] || role;

  div.innerHTML = `
    <div class="message-bubble">${escapeHtml(content)}</div>
    <div class="message-meta">${roleLabel} · ${time}</div>
  `;

  els.chatMessages.appendChild(div);
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;

  state.messages.push({ role, content, timestamp: time });
}

// ===== إضافة خطوة تنفيذ / Add execution step =====
function addStep(step) {
  els.stepsPanel.style.display = "block";

  const icon = step.content.startsWith("⚙️")
    ? "⚙️"
    : step.content.startsWith("✅")
    ? "✅"
    : step.content.startsWith("❌")
    ? "❌"
    : "📍";

  const item = document.createElement("div");
  item.className = "step-item";
  item.innerHTML = `
    <span class="step-icon">${icon}</span>
    <span class="step-text">${escapeHtml(step.content.replace(/^[⚙️✅❌📍]\s*/, ""))}</span>
  `;
  els.stepsList.appendChild(item);
  els.stepsList.scrollTop = els.stepsList.scrollHeight;

  state.steps.push(step);
  const count = state.steps.length;
  els.stepsCount.textContent = `${count} خطوة`;
  els.stepsCountStat.textContent = count;
}

// ===== عرض النتيجة / Show result =====
function showResult(result) {
  els.taskResult.style.display = "block";
  if (result.success) {
    els.resultIcon.textContent = "✅";
    els.resultTitle.textContent = "اكتملت المهمة";
    els.taskResult.style.borderColor = "var(--success)";
  } else {
    els.resultIcon.textContent = "❌";
    els.resultTitle.textContent = "فشلت المهمة";
    els.taskResult.style.borderColor = "var(--danger)";
  }
  els.resultContent.textContent = result.message;
}

// ===== تنفيذ المهمة / Execute task =====
async function executeTask() {
  const task = els.taskInput.value.trim();
  if (!task) {
    els.taskInput.focus();
    return;
  }

  if (state.isRunning) return;

  // تحديث الواجهة
  state.isRunning = true;
  state.startTime = Date.now();
  state.steps = [];
  state.currentTaskId = null;

  els.executeBtn.disabled = true;
  els.executeBtn.innerHTML = '<span class="btn-icon">⏳</span><span>جاري التنفيذ...</span>';
  els.stopBtn.style.display = "flex";
  els.taskInput.disabled = true;
  els.taskResult.style.display = "none";
  els.stepsPanel.style.display = "none";
  els.stepsList.innerHTML = "";

  // إضافة رسالة المستخدم
  addMessage("user", task);
  els.taskInput.value = "";

  updateTaskStatus("running");

  try {
    const response = await fetch("/api/agent/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task }),
    });

    const data = await response.json();

    if (!data.success) {
      addMessage("assistant", `❌ ${data.error}`);
      updateTaskStatus("failed");
      resetRunningState();
      return;
    }

    state.currentTaskId = data.taskId;
    // بدء الاستطلاع / Start polling
    startPolling();
  } catch (err) {
    addMessage("assistant", `❌ خطأ في الاتصال بالخادم: ${err.message}`);
    updateTaskStatus("failed");
    resetRunningState();
  }
}

// ===== الاستطلاع عن الحالة / Poll for status =====
function startPolling() {
  if (state.pollInterval) clearInterval(state.pollInterval);
  state.pollInterval = setInterval(pollStatus, 1000);
}

let lastStepCount = 0;

async function pollStatus() {
  try {
    const response = await fetch("/api/agent/status");
    const data = await response.json();

    // تحديث حالة الاتصال
    updateConnectionStatus(data.browserConnected, data.agentReady);

    // تحديث مدة التنفيذ
    if (state.startTime) {
      const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
      els.durationStat.textContent = `${elapsed}s`;
    }

    // إضافة الخطوات الجديدة
    if (data.steps && data.steps.length > lastStepCount) {
      const newSteps = data.steps.slice(lastStepCount);
      newSteps.forEach((step) => {
        if (step.role === "tool") {
          addStep(step);
        } else if (step.role === "assistant" && step.content) {
          addMessage("assistant", step.content, step.timestamp);
        }
      });
      lastStepCount = data.steps.length;
    }

    // التحقق من اكتمال المهمة
    if (data.status !== "running") {
      clearInterval(state.pollInterval);
      state.pollInterval = null;
      lastStepCount = 0;

      updateTaskStatus(data.status);

      if (data.result) {
        showResult(data.result);
        if (data.result.success && data.result.message) {
          addMessage("assistant", data.result.message);
        }
      }

      resetRunningState();
    }
  } catch (err) {
    console.error("Poll error:", err);
  }
}

// ===== إيقاف المهمة / Stop task =====
async function stopTask() {
  try {
    await fetch("/api/agent/stop", { method: "POST" });
    if (state.pollInterval) {
      clearInterval(state.pollInterval);
      state.pollInterval = null;
    }
    addMessage("assistant", "⏹️ تم إيقاف المهمة");
    updateTaskStatus("stopped");
    resetRunningState();
  } catch (err) {
    console.error("Stop error:", err);
  }
}

// ===== مسح المحادثة / Clear conversation =====
async function clearConversation() {
  if (state.isRunning) {
    await stopTask();
  }

  try {
    await fetch("/api/agent/reset", { method: "POST" });
  } catch (err) {
    console.error("Reset error:", err);
  }

  // مسح الواجهة
  els.chatMessages.innerHTML = `
    <div class="welcome-message">
      <div class="welcome-icon">👋</div>
      <h3>مرحباً!</h3>
      <p>أنا وكيل الذكاء الاصطناعي الذي يتحكم في متصفحك.</p>
      <p>اكتب مهمة أدناه وسأنفذها خطوة بخطوة.</p>
      <div class="example-tasks">
        <p class="examples-title">أمثلة على المهام:</p>
        <button class="example-task" onclick="setExampleTask(this)">
          افتح موقع Google وابحث عن أحدث أخبار الذكاء الاصطناعي
        </button>
        <button class="example-task" onclick="setExampleTask(this)">
          انتقل إلى github.com واعرض المستودعات الأكثر شهرة
        </button>
        <button class="example-task" onclick="setExampleTask(this)">
          خذ لقطة شاشة للصفحة الحالية
        </button>
      </div>
    </div>
  `;

  els.stepsPanel.style.display = "none";
  els.stepsList.innerHTML = "";
  els.taskResult.style.display = "none";
  els.stepsCount.textContent = "0 خطوة";
  els.stepsCountStat.textContent = "0";
  els.durationStat.textContent = "-";
  state.steps = [];
  state.messages = [];
  state.currentTaskId = null;
  lastStepCount = 0;
  updateTaskStatus("idle");
}

// ===== إعادة ضبط حالة التشغيل / Reset running state =====
function resetRunningState() {
  state.isRunning = false;
  els.executeBtn.disabled = false;
  els.executeBtn.innerHTML = '<span class="btn-icon">🚀</span><span>تنفيذ</span>';
  els.stopBtn.style.display = "none";
  els.taskInput.disabled = false;
  els.taskInput.focus();
}

// ===== تعيين مثال مهمة / Set example task =====
function setExampleTask(btn) {
  els.taskInput.value = btn.textContent.trim();
  els.taskInput.focus();
}

// ===== هروب HTML / HTML escape =====
function escapeHtml(text) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

// ===== مراقبة الحالة الدورية / Periodic status monitoring =====
async function checkServerStatus() {
  try {
    const response = await fetch("/api/agent/status");
    const data = await response.json();
    updateConnectionStatus(data.browserConnected, data.agentReady);
  } catch {
    updateConnectionStatus(false, false);
  }
}

// ===== مستمعو الأحداث / Event listeners =====
els.clearBtn.addEventListener("click", clearConversation);

els.taskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    executeTask();
  }
});

// ===== تهيئة / Initialize =====
checkServerStatus();
setInterval(checkServerStatus, 5000);

// تحديث الواجهة الأولية
updateTaskStatus("idle");
updateConnectionStatus(false, false);
