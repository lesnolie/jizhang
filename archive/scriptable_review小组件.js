// ╔══════════════════════════════════════════════════════════════╗
// ║    Notion 记账智能分析面板 - Full AI Integration Edition     ║
// ╚══════════════════════════════════════════════════════════════╝

const CONFIG = {
  // Notion 配置
  NOTION_API_KEY: "your_notion_api_key",
  DATABASE_ID: "your_database_id",
  BUDGET_LIMIT: 5000,
  LARGE_EXPENSE_THRESHOLD: 200,

  // AI 配置（OpenAI 兼容格式）
  AI_ENABLED: true,
  AI_API_URL: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", // Gemini
  AI_API_KEY: "your_gemini_api_key", // 填入你的 API Key
  AI_MODEL: "gemini-2.0-flash-exp",

  // 类目颜色
  CATEGORY_META: {
    '餐饮': { color: '#FF6384' }, '交通': { color: '#36A2EB' },
    '购物': { color: '#FFCE56' }, '日用': { color: '#4BC0C0' },
    '娱乐': { color: '#9966FF' }, '医疗': { color: '#FF9F40' },
    '居住': { color: '#C9CBCF' }, '通讯': { color: '#7BC225' },
    '社交': { color: '#E7517A' }, '学习': { color: '#00D8FF' },
    '其他': { color: '#8B8B8B' }
  }
}

// ============ 辅助函数 ============
function isAIConfigured() {
  return CONFIG.AI_ENABLED &&
         CONFIG.AI_API_KEY &&
         CONFIG.AI_API_KEY.trim() !== "" &&
         CONFIG.AI_API_KEY !== "your_gemini_api_key"
}

function formatNumber(n) { return Math.round(n).toLocaleString() }

// ============ 主入口 ============
async function main() {
  try {
    const [currentRecords, lastMonthRecords] = await Promise.all([
      fetchMonthlyRecords(0),
      fetchMonthlyRecords(-1)
    ])

    const stats = calculateAdvancedStats(currentRecords, lastMonthRecords)

    if (!config.runsInWidget) {
      await showHtmlDashboard(stats)
      return
    }

    let widget
    if (config.widgetFamily === 'small') {
      widget = await createSmallWidget(stats)
    } else if (config.widgetFamily === 'large') {
      widget = await createLargeWidget(stats)
    } else {
      widget = await createMediumWidget(stats)
    }

    Script.setWidget(widget)
  } catch (error) {
    console.error(error)
    if (config.runsInWidget) {
      Script.setWidget(createErrorWidget(error.message))
    } else {
      const alert = new Alert()
      alert.title = "❌ 错误"
      alert.message = error.message
      alert.addAction("确定")
      await alert.present()
    }
  }
  Script.complete()
}

// ============ AI 分析核心功能 ============

// 生成 AI Prompt（包含高消费回顾）
function generateAIPrompt(stats) {
  const topExpenses = stats.highExpenses.slice(0, 5)
    .map(e => `- ${e.date.slice(5)} ${e.content}: ¥${e.amount} (${e.category})`)
    .join('\n')

  return `你是一位专业又幽默的理财顾问，擅长犀利点评但不失温度。请分析以下消费数据：

📊 ${stats.month}月消费概况：
- 总支出：¥${stats.total}（预算¥${stats.budget}，已用${stats.budgetPercentage.toFixed(1)}%）
- 剩余预算：¥${stats.remaining}
- 日均消费：¥${Math.round(stats.dailyAverage)}
- 月末预测：¥${Math.round(stats.monthEndForecast)}
- 大额消费：共 ${stats.largeExpenseCount} 笔

💸 败家清单（需要重点回顾）：
${topExpenses || '（无大额消费，真省！）'}

🏷️ 类目分布 Top3：
${stats.categories.slice(0, 3).map(c => `- ${c.name}: ¥${Math.round(c.amount)} (${c.percentage}%)`).join('\n')}

📅 消费习惯：
- 工作日总消费：¥${stats.habits.workdayVsWeekend.workday}
- 周末总消费：¥${stats.habits.workdayVsWeekend.weekend}
- 类型：${stats.habits.workdayVsWeekend.preference === 'weekend' ? '周末狂欢型' : '工作日稳健型'}

💚 财务健康度：${stats.healthScore}分

---

请从以下四个方面给出分析（总字数300-400字）：

1. 💸 大额消费回顾
   - 逐一点评上面的"败家清单"
   - 哪些是必要支出？哪些可能是冲动消费？
   - 给每笔打个分（必要/可接受/需反思）

2. 💰 财务状况评价
   - 预算执行得怎么样？
   - 是否存在超支风险？

3. 🚨 消费陷阱警示
   - 发现了什么不良消费习惯？
   - 哪个类目需要重点控制？

4. 💡 下月改进建议
   - 给出3条具体可执行的建议
   - 每天建议花多少？

要求：
- 语气要像朋友聊天，可以适当吐槽
- 数字要具体，不要说"适当控制"这种空话
- 如果有冲动消费，可以友善地"拷打"一下`
}

// 调用 AI API
async function callAI(prompt) {
  let apiUrl = CONFIG.AI_API_URL
  if (!apiUrl || apiUrl.trim() === "") {
    apiUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
  }

  const requestBody = {
    model: CONFIG.AI_MODEL,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1000
  }

  const req = new Request(apiUrl)
  req.method = 'POST'
  req.headers = {
    'Authorization': `Bearer ${CONFIG.AI_API_KEY}`,
    'Content-Type': 'application/json'
  }
  req.body = JSON.stringify(requestBody)
  req.timeoutInterval = 30 // 30秒超时

  const response = await req.loadJSON()

  if (response.error) {
    throw new Error(response.error.message || JSON.stringify(response.error))
  }

  if (!response.choices || !response.choices[0]) {
    throw new Error("AI 返回格式异常")
  }

  return response.choices[0].message.content.trim()
}

// 显示 AI 分析结果
async function showAIAnalysis(stats) {
  // 显示加载提示
  const loadingAlert = new Alert()
  loadingAlert.title = "🤖 AI 正在分析..."
  loadingAlert.message = "正在回顾你的消费记录，请稍候..."

  // 异步加载
  const loadingTimer = setTimeout(async () => {
    await loadingAlert.present()
  }, 100)

  try {
    const prompt = generateAIPrompt(stats)
    const analysis = await callAI(prompt)

    clearTimeout(loadingTimer)

    // 显示分析结果
    const resultAlert = new Alert()
    resultAlert.title = `📊 ${stats.month}月消费分析报告`
    resultAlert.message = analysis
    resultAlert.addAction("复制报告")
    resultAlert.addAction("关闭")

    const choice = await resultAlert.presentAlert()

    if (choice === 0) {
      Pasteboard.copyString(analysis)
      const toast = new Alert()
      toast.title = "✅ 已复制"
      toast.message = "分析报告已复制到剪贴板"
      toast.addAction("好的")
      await toast.present()
    }

    return analysis
  } catch (error) {
    clearTimeout(loadingTimer)

    const errorAlert = new Alert()
    errorAlert.title = "❌ AI 分析失败"
    errorAlert.message = `错误：${error.message}

可能的原因：
1. API Key 无效或已过期
2. 网络连接问题
3. API 配额用尽

请检查配置后重试。`
    errorAlert.addAction("复制 Prompt（手动分析）")
    errorAlert.addAction("取消")

    const choice = await errorAlert.presentAlert()
    if (choice === 0) {
      Pasteboard.copyString(generateAIPrompt(stats))
      const t = new Alert()
      t.title = "已复制"
      t.message = "请粘贴到 ChatGPT/Gemini 手动分析"
      t.addAction("好")
      await t.present()
    }

    return null
  }
}

// 显示 AI 配置提示
async function showAIConfigPrompt() {
  const alert = new Alert()
  alert.title = "🤖 AI 分析未配置"
  alert.message = `要使用 AI 深度分析，请在脚本顶部设置：

1️⃣ AI_API_KEY
   - Gemini: 访问 aistudio.google.com 获取
   - OpenAI: 访问 platform.openai.com 获取

2️⃣ AI_API_URL（可选）
   - Gemini 默认已配置
   - 其他服务需填入 OpenAI 兼容地址

配置示例：
AI_API_KEY: "AIzaSyXXXXXX"`

  alert.addAction("了解")
  await alert.present()
}

// ============ HTML 仪表盘 ============
async function showHtmlDashboard(stats) {
  const wv = new WebView()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <style>
    :root {
      --bg-dark: #0a0a12;
      --glass-bg: rgba(255, 255, 255, 0.08);
      --glass-border: rgba(255, 255, 255, 0.15);
      --text-main: #ffffff;
      --text-sub: rgba(255, 255, 255, 0.6);
      --accent: #4facfe;
      --danger: #ff6b6b;
      --warning: #feca57;
      --success: #4ade80;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      padding: 20px;
      background-color: var(--bg-dark);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Rounded", sans-serif;
      color: var(--text-main);
      background-image:
        radial-gradient(circle at 0% 0%, rgba(74, 0, 224, 0.3) 0%, transparent 50%),
        radial-gradient(circle at 100% 0%, rgba(142, 45, 226, 0.3) 0%, transparent 50%),
        radial-gradient(circle at 50% 100%, rgba(26, 26, 46, 0.5) 0%, transparent 50%);
      background-attachment: fixed;
      min-height: 100vh;
    }

    .glass-card {
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      border-radius: 20px;
      padding: 20px;
      margin-bottom: 16px;
    }

    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    h2 { font-size: 24px; font-weight: 700; }
    .subtitle { color: var(--text-sub); font-size: 13px; margin-top: 4px; }

    .health-badge {
      background: rgba(74, 222, 128, 0.2); color: var(--success);
      padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;
    }
    .health-badge.warning { background: rgba(254, 202, 87, 0.2); color: var(--warning); }
    .health-badge.danger { background: rgba(255, 107, 107, 0.2); color: var(--danger); }

    .hero-section { text-align: center; padding: 30px 20px; }
    .amount-label { color: var(--text-sub); font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
    .total-amount { font-size: 48px; font-weight: 800; margin: 10px 0; }

    .progress-container { height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; margin: 15px 0; overflow: hidden; }
    .progress-bar { height: 100%; background: linear-gradient(90deg, #4facfe, #00f2fe); width: ${Math.min(stats.budgetPercentage, 100)}%; }
    .progress-bar.warning { background: linear-gradient(90deg, #feca57, #ff9f0a); }
    .progress-bar.danger { background: linear-gradient(90deg, #ff6b6b, #ff453a); }

    .stats-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 10px; }
    .stat-item { background: rgba(255,255,255,0.05); padding: 10px; border-radius: 12px; text-align: center; }
    .stat-val { font-size: 16px; font-weight: 600; }
    .stat-lbl { font-size: 10px; color: var(--text-sub); margin-top: 2px; }

    .list-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .list-item:last-child { border-bottom: none; }
    .cat-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 8px; }

    .high-expense-item {
      background: rgba(255, 107, 107, 0.1);
      border-left: 3px solid var(--danger);
      padding: 12px; margin-bottom: 8px; border-radius: 8px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .high-expense-date { font-size: 11px; color: var(--text-sub); margin-bottom: 2px; }
    .high-expense-content { font-size: 14px; font-weight: 500; }
    .high-expense-amount { font-size: 14px; font-weight: 700; color: var(--danger); }

    .action-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; border: none; padding: 16px; width: 100%; border-radius: 16px;
      font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 10px;
    }
    .action-btn:active { opacity: 0.8; transform: scale(0.98); }
    .disabled-btn { background: #333; color: #666; }

    h3 { margin: 0 0 12px 0; font-size: 16px; font-weight: 700; }

    .ai-status { text-align: center; margin-top: 8px; font-size: 12px; color: var(--text-sub); }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <h2>${stats.month}月消费</h2>
      <div class="subtitle">${stats.year}年 财务分析</div>
    </div>
    <div class="health-badge ${stats.healthScore < 60 ? 'danger' : stats.healthScore < 80 ? 'warning' : ''}">
      ${stats.healthScore >= 80 ? '💚' : stats.healthScore >= 60 ? '💛' : '💔'} ${stats.healthScore}分
    </div>
  </div>

  <div class="glass-card hero-section">
    <div class="amount-label">本月总支出</div>
    <div class="total-amount">¥${formatNumber(stats.total)}</div>
    <div style="font-size: 13px; color: var(--text-sub); display: flex; justify-content: space-between;">
      <span>预算 ¥${formatNumber(stats.budget)}</span>
      <span>${stats.budgetPercentage.toFixed(1)}%</span>
    </div>
    <div class="progress-container">
      <div class="progress-bar ${stats.warningLevel}"></div>
    </div>
    <div class="stats-grid">
      <div class="stat-item">
        <div class="stat-val">¥${Math.round(stats.dailyAverage)}</div>
        <div class="stat-lbl">日均</div>
      </div>
      <div class="stat-item">
        <div class="stat-val" style="color: ${stats.remaining < 0 ? 'var(--danger)' : 'var(--success)'}">
          ${stats.remaining >= 0 ? '+' : ''}${formatNumber(stats.remaining)}
        </div>
        <div class="stat-lbl">剩余</div>
      </div>
      <div class="stat-item">
        <div class="stat-val">¥${formatNumber(stats.monthEndForecast)}</div>
        <div class="stat-lbl">预测</div>
      </div>
    </div>
  </div>

  ${stats.highExpenses.length > 0 ? `
  <div class="glass-card">
    <h3>💸 高消费回顾 (>¥${CONFIG.LARGE_EXPENSE_THRESHOLD})</h3>
    ${stats.highExpenses.slice(0, 5).map(item => `
      <div class="high-expense-item">
        <div>
          <div class="high-expense-date">${item.date.slice(5)} · ${item.category}</div>
          <div class="high-expense-content">${item.content || '消费记录'}</div>
        </div>
        <div class="high-expense-amount">-¥${formatNumber(item.amount)}</div>
      </div>
    `).join('')}
    ${stats.highExpenses.length > 5 ? `<div style="text-align:center; font-size:12px; color:var(--text-sub); margin-top:8px;">还有 ${stats.highExpenses.length - 5} 笔大额消费...</div>` : ''}
  </div>
  ` : `
  <div class="glass-card" style="text-align:center; padding:30px;">
    <div style="font-size:40px; margin-bottom:10px;">🎉</div>
    <div style="font-size:16px; font-weight:600;">本月无大额消费</div>
    <div style="font-size:13px; color:var(--text-sub); margin-top:5px;">省钱小能手！</div>
  </div>
  `}

  <div class="glass-card">
    <h3>🏷️ 支出排行</h3>
    ${stats.categories.slice(0, 5).map(cat => `
      <div class="list-item">
        <div style="display:flex; align-items:center;">
          <span class="cat-dot" style="background:${cat.color}"></span>
          <span>${cat.name}</span>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:600;">¥${Math.round(cat.amount)}</div>
          <div style="font-size:11px; color:var(--text-sub);">${cat.percentage}%</div>
        </div>
      </div>
    `).join('')}
  </div>

  <div class="glass-card">
    <h3>📅 消费习惯</h3>
    <div class="list-item">
      <span>工作日消费</span>
      <span style="font-weight:600;">¥${stats.habits.workdayVsWeekend.workday}</span>
    </div>
    <div class="list-item">
      <span>周末消费</span>
      <span style="font-weight:600;">¥${stats.habits.workdayVsWeekend.weekend}</span>
    </div>
    <div class="list-item">
      <span>消费类型</span>
      <span style="font-weight:600;">${stats.habits.workdayVsWeekend.preference === 'weekend' ? '🎉 周末狂欢型' : '💼 工作日型'}</span>
    </div>
  </div>

  <button class="action-btn ${isAIConfigured() ? '' : 'disabled-btn'}" id="aiBtn">
    ${isAIConfigured() ? '🤖 获取 AI 深度分析' : '🤖🔒 AI 分析未配置'}
  </button>
  <div class="ai-status">
    ${isAIConfigured() ? '关闭页面后将自动调用 AI 分析' : '请在脚本顶部配置 AI_API_KEY'}
  </div>

  <div style="height: 30px;"></div>

</body>
</html>
  `

  await wv.loadHTML(html)
  await wv.present()

  // 页面关闭后，询问是否进行 AI 分析
  if (isAIConfigured()) {
    const actionAlert = new Alert()
    actionAlert.title = "🤖 AI 分析"
    actionAlert.message = "是否让 AI 帮你回顾分析本月消费？\n\n包含：大额消费点评、消费陷阱、改进建议"
    actionAlert.addAction("开始分析")
    actionAlert.addCancelAction("暂不需要")

    const choice = await actionAlert.presentSheet()

    if (choice === 0) {
      await showAIAnalysis(stats)
    }
  } else {
    await showAIConfigPrompt()
  }
}

// ============ 数据计算层 ============
function calculateAdvancedStats(currentRecords, lastMonthRecords = []) {
  const now = new Date()
  const currentDay = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  let total = 0
  let largeExpenseCount = 0
  const byCategory = {}
  const byDate = {}
  const byDayOfWeek = [0, 0, 0, 0, 0, 0, 0]
  const byPeriod = { early: 0, mid: 0, late: 0 }
  const highExpenses = []

  for (const record of currentRecords) {
    const price = record.properties['价格']?.number || 0
    const category = record.properties['类目']?.select?.name || '其他'
    const dateStr = record.properties['时间']?.date?.start?.slice(0, 10) || ''
    const content = record.properties['内容']?.title?.[0]?.text?.content ||
                    record.properties['Name']?.title?.[0]?.text?.content || '消费记录'

    total += price
    byCategory[category] = (byCategory[category] || 0) + price

    if (dateStr) {
      byDate[dateStr] = (byDate[dateStr] || 0) + price
      const date = new Date(dateStr)
      byDayOfWeek[date.getDay()] += price
      const day = date.getDate()
      if (day <= 10) byPeriod.early += price
      else if (day <= 20) byPeriod.mid += price
      else byPeriod.late += price
    }

    if (price >= CONFIG.LARGE_EXPENSE_THRESHOLD) {
      largeExpenseCount++
      highExpenses.push({ date: dateStr, content, category, amount: price })
    }
  }

  highExpenses.sort((a, b) => b.amount - a.amount)

  const sortedCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      color: CONFIG.CATEGORY_META[name]?.color || '#8B8B8B'
    }))

  const dailyAverage = currentDay > 0 ? total / currentDay : 0
  const workdayTotal = byDayOfWeek.slice(1, 6).reduce((a, b) => a + b, 0)
  const weekendTotal = byDayOfWeek[0] + byDayOfWeek[6]

  let healthScore = 100
  const budgetUsage = total / CONFIG.BUDGET_LIMIT
  if (budgetUsage > 1) healthScore -= 40
  else if (budgetUsage > 0.9) healthScore -= 25
  else if (budgetUsage > 0.8) healthScore -= 15
  if (largeExpenseCount > 5) healthScore -= 15
  else if (largeExpenseCount > 3) healthScore -= 8
  if (Object.keys(byCategory).length < 3) healthScore -= 10

  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    currentDay,
    total: Math.round(total * 100) / 100,
    budget: CONFIG.BUDGET_LIMIT,
    budgetPercentage: (total / CONFIG.BUDGET_LIMIT) * 100,
    remaining: Math.round((CONFIG.BUDGET_LIMIT - total) * 100) / 100,
    dailyAverage: Math.round(dailyAverage * 100) / 100,
    monthEndForecast: Math.round(dailyAverage * daysInMonth),
    categories: sortedCategories,
    recordCount: currentRecords.length,
    warningLevel: total > CONFIG.BUDGET_LIMIT ? 'danger' : total > CONFIG.BUDGET_LIMIT * 0.8 ? 'warning' : '',
    healthScore: Math.max(0, Math.min(100, healthScore)),
    highExpenses,
    largeExpenseCount,
    habits: {
      workdayVsWeekend: {
        workday: Math.round(workdayTotal),
        weekend: Math.round(weekendTotal),
        preference: (weekendTotal / 2) > (workdayTotal / 5) ? 'weekend' : 'workday'
      },
      periodDistribution: byPeriod
    }
  }
}

// ============ 数据获取 ============
async function fetchMonthlyRecords(monthOffset) {
  const now = new Date()
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1)

  let allRecords = []
  let cursor = null

  do {
    const body = {
      filter: {
        and: [
          { property: '时间', date: { on_or_after: targetMonth.toISOString() } },
          { property: '时间', date: { before: nextMonth.toISOString() } }
        ]
      },
      page_size: 100
    }
    if (cursor) body.start_cursor = cursor

    const req = new Request(`https://api.notion.com/v1/databases/${CONFIG.DATABASE_ID}/query`)
    req.method = 'POST'
    req.headers = {
      'Authorization': `Bearer ${CONFIG.NOTION_API_KEY}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    }
    req.body = JSON.stringify(body)

    const res = await req.loadJSON()

    if (res.object === 'error') {
      throw new Error(res.message || 'Notion API 错误')
    }

    allRecords = allRecords.concat(res.results || [])
    cursor = res.has_more ? res.next_cursor : null
  } while (cursor)

  return allRecords
}

// ============ 小组件 UI ============
async function createSmallWidget(stats) {
  const w = new ListWidget()
  w.backgroundImage = drawFluidBackground(200, 200)
  w.setPadding(16, 16, 16, 16)

  const header = w.addStack()
  header.centerAlignContent()

  const monthTag = header.addText(`${stats.month}月`)
  monthTag.font = Font.boldSystemFont(12)
  monthTag.textColor = new Color("#ffffff", 0.7)

  header.addSpacer()

  const healthDot = header.addText("●")
  healthDot.font = Font.systemFont(14)
  healthDot.textColor = getHealthColor(stats.healthScore)

  w.addSpacer()

  const amountStack = w.addStack()
  amountStack.centerAlignContent()

  const symbol = amountStack.addText("¥")
  symbol.font = Font.systemFont(16)
  symbol.textColor = new Color("#ffffff", 0.7)

  const amount = amountStack.addText(formatNumber(stats.total))
  amount.font = Font.boldSystemFont(28)
  amount.textColor = getWarningColor(stats.warningLevel)

  w.addSpacer(8)

  const progressBar = drawLiquidProgressBar(stats.budgetPercentage / 100, 140, stats.warningLevel)
  const progressImg = w.addImage(progressBar)
  progressImg.imageSize = new Size(140, 12)
  progressImg.centerAlignImage()

  w.addSpacer(6)

  const footer = w.addStack()
  footer.centerAlignContent()

  const remainLabel = footer.addText("剩余 ")
  remainLabel.font = Font.systemFont(10)
  remainLabel.textColor = new Color("#ffffff", 0.5)

  const remainValue = footer.addText(`¥${formatNumber(stats.remaining)}`)
  remainValue.font = Font.semiboldSystemFont(10)
  remainValue.textColor = stats.remaining < 0 ? new Color("#ff6b6b") : new Color("#4ade80")

  return w
}

async function createMediumWidget(stats) {
  const w = new ListWidget()
  w.backgroundImage = drawFluidBackground(400, 200)
  w.setPadding(16, 16, 16, 16)

  const title = w.addText(`💰 ${stats.month}月: ¥${formatNumber(stats.total)}`)
  title.font = Font.boldSystemFont(18)
  title.textColor = Color.white()

  w.addSpacer(8)

  const progressBar = drawLiquidProgressBar(stats.budgetPercentage / 100, 280, stats.warningLevel)
  const progressImg = w.addImage(progressBar)
  progressImg.imageSize = new Size(280, 12)

  w.addSpacer(8)

  const healthText = w.addText(`健康度: ${stats.healthScore}分 | 大额: ${stats.largeExpenseCount}笔`)
  healthText.font = Font.systemFont(13)
  healthText.textColor = getHealthColor(stats.healthScore)

  return w
}

async function createLargeWidget(stats) {
  const w = new ListWidget()
  w.backgroundImage = drawFluidBackground(400, 400)
  w.setPadding(16, 16, 16, 16)

  const title = w.addText(`${stats.year}年${stats.month}月分析`)
  title.font = Font.boldSystemFont(20)
  title.textColor = Color.white()

  w.addSpacer(12)

  const amountText = w.addText(`¥${formatNumber(stats.total)}`)
  amountText.font = Font.boldSystemFont(36)
  amountText.textColor = getWarningColor(stats.warningLevel)

  w.addSpacer(8)

  const progressBar = drawLiquidProgressBar(stats.budgetPercentage / 100, 340, stats.warningLevel)
  const progressImg = w.addImage(progressBar)
  progressImg.imageSize = new Size(340, 14)

  w.addSpacer()

  if (stats.highExpenses.length > 0) {
    const highLabel = w.addText(`💸 最大消费: ${stats.highExpenses[0].content}`)
    highLabel.font = Font.systemFont(12)
    highLabel.textColor = new Color("#ff6b6b")
  }

  return w
}

// ============ 绘图函数 ============
function getHealthColor(score, alpha = 1) {
  if (score >= 80) return new Color("#4ade80", alpha)
  if (score >= 60) return new Color("#feca57", alpha)
  return new Color("#ff6b6b", alpha)
}

function getWarningColor(level) {
  if (level === 'danger') return new Color("#ff6b6b")
  if (level === 'warning') return new Color("#feca57")
  return Color.white()
}

function createErrorWidget(message) {
  const w = new ListWidget()
  w.backgroundColor = new Color("#1a1a2e")
  w.setPadding(16, 16, 16, 16)
  const t = w.addText("❌ " + message)
  t.textColor = Color.red()
  t.font = Font.systemFont(12)
  return w
}

function drawFluidBackground(width, height) {
  const ctx = new DrawContext()
  ctx.size = new Size(width, height)
  ctx.opaque = false

  ctx.setFillColor(new Color("#0a0a12"))
  ctx.fill(new Rect(0, 0, width, height))

  drawSoftBlob(ctx, -width * 0.1, -height * 0.1, width * 0.7, "#4a00e0")
  drawSoftBlob(ctx, width * 0.6, height * 0.1, width * 0.6, "#8e2de2")
  drawSoftBlob(ctx, width * 0.1, height * 0.7, width * 0.8, "#1a1a2e")

  return ctx.getImage()
}

function drawSoftBlob(ctx, x, y, radius, colorHex) {
  for (let i = 0; i < 12; i++) {
    const r = radius * (1 - i * 0.07)
    const offset = (radius - r) / 2
    const p = new Path()
    p.addEllipse(new Rect(x + offset, y + offset, r, r))
    ctx.addPath(p)
    ctx.setFillColor(new Color(colorHex, 0.06))
    ctx.fillPath()
  }
}

function drawLiquidProgressBar(percentage, width, warningLevel = '') {
  const height = 8
  const padding = 4
  const ctx = new DrawContext()
  ctx.size = new Size(width, height + padding * 2)
  ctx.opaque = false
  ctx.respectScreenScale = true

  const trackPath = new Path()
  trackPath.addRoundedRect(new Rect(0, padding, width, height), height / 2, height / 2)
  ctx.addPath(trackPath)
  ctx.setFillColor(new Color("#ffffff", 0.1))
  ctx.fillPath()

  if (percentage > 0) {
    const pWidth = Math.min(Math.max(width * percentage, height), width)

    let color = "#4facfe"
    if (warningLevel === 'danger' || percentage >= 1) color = "#ff6b6b"
    else if (warningLevel === 'warning' || percentage >= 0.8) color = "#feca57"

    const glowPath = new Path()
    glowPath.addRoundedRect(new Rect(0, padding - 2, pWidth, height + 4), (height + 4) / 2, (height + 4) / 2)
    ctx.addPath(glowPath)
    ctx.setFillColor(new Color(color, 0.25))
    ctx.fillPath()

    const corePath = new Path()
    corePath.addRoundedRect(new Rect(0, padding, pWidth, height), height / 2, height / 2)
    ctx.addPath(corePath)
    ctx.setFillColor(new Color(color))
    ctx.fillPath()
  }

  return ctx.getImage()
}

// ============ 启动 ============
await main()
