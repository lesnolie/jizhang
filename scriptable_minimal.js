// ╔═══════════════════════════════════════════════════════════════╗
// ║      记账小组件 - 极简版 (中型组件 + 流式 AI 分析)            ║
// ╚═══════════════════════════════════════════════════════════════╝

// ==================== 基础配置 ====================
const CONFIG = {
  // Worker API 配置
  WORKER_URL: "https://your-worker.workers.dev/stats",  // 替换为你的 Cloudflare Worker 地址
  API_KEY: "your-api-secret-key",  // 替换为你在 Worker 中设置的 API_SECRET
  BUDGET: 4000,  // 月度预算（元）

  // AI 配置（OpenAI 兼容格式，可选）
  AI_API_URL: "",  // 你的 AI API 地址（支持 HTTP/HTTPS），例如：http://192.168.1.100:3001/v1/chat/completions
  AI_API_KEY: "",  // 你的 AI API Key（留空则不使用 AI 功能）
  AI_MODEL: "gpt-3.5-turbo",  // 推荐模型：gpt-3.5-turbo, gpt-4, deepseek-chat, gemini-3-flash-preview

  // AI 提示词模板
  AI_PROMPT_TEMPLATE: `你是一位直率的消费顾问，擅长从具体消费项目中发现异常。

# 本月消费数据
- 总支出：¥{total} / 预算¥{budget} (已用 {percentage}%)
- 剩余预算：¥{remaining}
- 剩余天数：{daysLeft}天

# 主要消费项目（按金额排序）
{itemsList}

# 消费结构（Top 3）
{topCategories}

# 任务要求
请分析具体的消费项目，找出**异常或重复过多的消费**（比如火锅吃多了、游戏买多了、某类东西重复买等），然后给出1句简短建议。

要求：
1. 基于具体项目分析（如"火锅3次"、"游戏机2台"），不要只说类目
2. 指出最明显的异常或浪费点
3. 给1句话建议，要具体可执行
4. 语气轻松，像朋友聊天，可以吐槽
5. 直接输出内容，不要前缀

示例输出：
"你这个月光火锅就吃了3次花了800块！建议下个月控制在1-2次，省下的钱够你买双新鞋了。"`,

  // UI 配置
  COLORS: {
    餐饮: '#FF6384', 交通: '#36A2EB', 购物: '#FFCE56',
    日用: '#4BC0C0', 娱乐: '#9966FF', 医疗: '#FF9F40',
    居住: '#C9CBCF', 通讯: '#7BC225', 社交: '#E7517A',
    学习: '#00D8FF', 其他: '#8B8B8B'
  }
}

// ==================== 配置管理 ====================
// 检查 AI 是否已配置
function isAIConfigured() {
  return CONFIG.AI_API_URL && CONFIG.AI_API_URL.trim() !== "" &&
         CONFIG.AI_API_KEY && CONFIG.AI_API_KEY.trim() !== ""
}

// ==================== 数据获取（带重试机制） ====================
async function fetchStats() {
  const url = `${CONFIG.WORKER_URL}?key=${CONFIG.API_KEY}`
  const maxRetries = 3
  let lastError = null

  for (let i = 0; i < maxRetries; i++) {
    try {
      const req = new Request(url)
      req.timeoutInterval = 15
      const response = await req.loadJSON()

      if (response.error) {
        throw new Error(response.error)
      }

      return response
    } catch (e) {
      lastError = e
      console.error(`请求失败 (${i + 1}/${maxRetries}):`, e.message)

      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
  }

  throw new Error(`数据获取失败 (重试${maxRetries}次): ${lastError.message}`)
}

// ==================== 智能每日预算计算 ====================
function calculateDailyBudget(spent, budget) {
  const now = new Date()
  const currentDay = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = daysInMonth - currentDay

  if (daysLeft <= 0) {
    return { dailyBudget: 0, daysLeft: 0, remaining: budget - spent }
  }

  const remaining = budget - spent
  const dailyBudget = remaining / daysLeft

  return {
    dailyBudget: Math.max(0, Math.round(dailyBudget)),
    daysLeft,
    remaining: Math.round(remaining)
  }
}

// ==================== 中型小组件 UI ====================
function createMediumWidget(stats) {
  const w = new ListWidget()

  // 精美渐变背景
  const gradient = new LinearGradient()
  gradient.colors = [
    new Color("#0f0c29"),
    new Color("#302b63"),
    new Color("#24243e")
  ]
  gradient.locations = [0, 0.5, 1]
  w.backgroundGradient = gradient

  w.setPadding(12, 16, 12, 16)  // 减小内边距

  const now = new Date()
  const budget = calculateDailyBudget(stats.totalPrice, CONFIG.BUDGET)
  const percentage = stats.totalPrice / CONFIG.BUDGET

  // 计算餐饮和高价消费
  const foodAmount = stats.foodAmount || 0
  const expensiveCount = stats.expensiveCount || 0

  // ========== 顶部：日期和月份 ==========
  const headerStack = w.addStack()
  headerStack.layoutHorizontally()
  headerStack.centerAlignContent()

  // 左侧：今日日期
  const dateText = headerStack.addText(`${now.getMonth() + 1}月${now.getDate()}日`)
  dateText.font = Font.semiboldSystemFont(12)  // 减小字体
  dateText.textColor = new Color("#FFD700")

  headerStack.addSpacer()

  // 右侧：月份标签
  const monthBadge = headerStack.addStack()
  monthBadge.backgroundColor = new Color("#ffffff", 0.1)
  monthBadge.cornerRadius = 8
  monthBadge.setPadding(3, 8, 3, 8)  // 减小 padding

  const monthText = monthBadge.addText(`${now.getMonth() + 1}月消费`)
  monthText.font = Font.semiboldSystemFont(10)  // 减小字体
  monthText.textColor = new Color("#ffffff", 0.9)

  w.addSpacer(8)  // 减小间距

  // ========== 核心区域：总支出 ==========
  const amountStack = w.addStack()
  amountStack.layoutVertically()
  amountStack.centerAlignContent()

  const amountValue = amountStack.addText(`¥${Math.round(stats.totalPrice).toLocaleString()}`)
  amountValue.font = Font.boldSystemFont(32)  // 从36减到32
  amountValue.textColor = percentage > 1 ? new Color("#ff6b6b") :
                          percentage > 0.8 ? new Color("#feca57") :
                          new Color("#FFFFFF")
  amountValue.centerAlignText()

  amountStack.addSpacer(3)  // 减小间距

  // 预算信息
  const budgetInfoStack = amountStack.addStack()
  budgetInfoStack.layoutHorizontally()
  budgetInfoStack.centerAlignContent()
  budgetInfoStack.spacing = 6  // 减小间距

  const budgetLabel = budgetInfoStack.addText(`预算 ¥${CONFIG.BUDGET.toLocaleString()}`)
  budgetLabel.font = Font.systemFont(10)  // 减小字体
  budgetLabel.textColor = new Color("#999999")

  const separator = budgetInfoStack.addText("·")
  separator.font = Font.systemFont(10)
  separator.textColor = new Color("#666666")

  const percentText = budgetInfoStack.addText(`${Math.round(percentage * 100)}%`)
  percentText.font = Font.semiboldSystemFont(10)  // 减小字体
  percentText.textColor = percentage > 1 ? new Color("#ff6b6b") :
                          percentage > 0.8 ? new Color("#feca57") :
                          new Color("#4ade80")

  w.addSpacer(6)  // 减小间距

  // 进度条
  const progressImg = drawProgressBar(percentage, 300)  // 减小宽度
  const progressStack = w.addImage(progressImg)
  progressStack.imageSize = new Size(300, 5)  // 减小尺寸
  progressStack.centerAlignImage()

  w.addSpacer(7)  // 减小间距

  // ========== 数据卡片网格 ==========
  const gridStack = w.addStack()
  gridStack.layoutHorizontally()
  gridStack.spacing = 6  // 减小卡片间距

  // 卡片1：剩余预算
  createDataCard(
    gridStack,
    budget.remaining < 0 ? "超支" : "剩余",
    `¥${Math.abs(budget.remaining)}`,
    budget.remaining < 0 ? "#ff6b6b" : "#4ade80"
  )

  // 卡片2：每日可花
  createDataCard(
    gridStack,
    `每日 (${budget.daysLeft}天)`,
    `¥${budget.dailyBudget}`,
    "#00D8FF"
  )

  // 卡片3：餐饮支出
  createDataCard(
    gridStack,
    "餐饮",
    `¥${Math.round(foodAmount)}`,
    "#FF6384"
  )

  // 卡片4：高价消费
  createDataCard(
    gridStack,
    "大额 (>500)",
    `${expensiveCount}次`,
    expensiveCount > 0 ? "#feca57" : "#4BC0C0"
  )

  return w
}

// 创建数据卡片（优化版：更紧凑）
function createDataCard(parent, label, value, color) {
  const card = parent.addStack()
  card.layoutVertically()
  card.backgroundColor = new Color("#ffffff", 0.08)
  card.cornerRadius = 8  // 减小圆角
  card.setPadding(6, 8, 6, 8)  // 减小内边距
  card.size = new Size(70, 44)  // 减小卡片尺寸

  const valueText = card.addText(value)
  valueText.font = Font.boldSystemFont(13)  // 减小字体
  valueText.textColor = new Color(color)
  valueText.minimumScaleFactor = 0.7
  valueText.lineLimit = 1

  card.addSpacer(2)

  const labelText = card.addText(label)
  labelText.font = Font.systemFont(8)  // 减小字体
  labelText.textColor = new Color("#999999")
  labelText.minimumScaleFactor = 0.6
  labelText.lineLimit = 1
}

// 绘制进度条
function drawProgressBar(percentage, width) {
  const height = 6
  const ctx = new DrawContext()
  ctx.size = new Size(width, height)
  ctx.opaque = false
  ctx.respectScreenScale = true

  // 背景轨道
  const trackPath = new Path()
  trackPath.addRoundedRect(new Rect(0, 0, width, height), height / 2, height / 2)
  ctx.addPath(trackPath)
  ctx.setFillColor(new Color("#ffffff", 0.1))
  ctx.fillPath()

  // 进度
  if (percentage > 0) {
    const pWidth = Math.min(Math.max(width * percentage, height), width)

    let color = "#4facfe"
    if (percentage >= 1) color = "#ff6b6b"
    else if (percentage >= 0.8) color = "#feca57"

    const progressPath = new Path()
    progressPath.addRoundedRect(new Rect(0, 0, pWidth, height), height / 2, height / 2)
    ctx.addPath(progressPath)
    ctx.setFillColor(new Color(color))
    ctx.fillPath()
  }

  return ctx.getImage()
}

// ==================== AI 分析 ====================
async function getAISuggestion(stats) {
  if (!isAIConfigured()) {
    return null
  }

  const now = new Date()
  const currentDay = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = daysInMonth - currentDay
  const remaining = CONFIG.BUDGET - stats.totalPrice
  const percentage = Math.round((stats.totalPrice / CONFIG.BUDGET) * 100)

  const items = stats.items || []
  const itemsList = items.length > 0
    ? items.slice(0, 15).map((item, idx) =>
        `${idx + 1}. ${item.title} - ¥${item.price} (${item.category})`
      ).join('\n')
    : '暂无数据'

  const categories = stats.categories || []
  const topCategories = categories
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .map((cat, idx) => {
      const percent = stats.totalPrice > 0 ? Math.round((cat.amount / stats.totalPrice) * 100) : 0
      return `${idx + 1}. ${cat.name}: ¥${Math.round(cat.amount)} (${percent}%)`
    })
    .join('\n')

  const prompt = CONFIG.AI_PROMPT_TEMPLATE
    .replace('{total}', Math.round(stats.totalPrice))
    .replace('{budget}', CONFIG.BUDGET)
    .replace('{percentage}', percentage)
    .replace('{remaining}', remaining)
    .replace('{daysLeft}', daysLeft)
    .replace('{itemsList}', itemsList)
    .replace('{topCategories}', topCategories || '暂无数据')

  try {
    const req = new Request(CONFIG.AI_API_URL)
    req.method = 'POST'
    req.headers = {
      'Authorization': 'Bearer ' + CONFIG.AI_API_KEY,
      'Content-Type': 'application/json'
    }
    req.body = JSON.stringify({
      model: CONFIG.AI_MODEL,
      messages: [
        {
          role: "system",
          content: "你是一位专业的消费顾问。你必须给出详细、具体、可执行的建议，不能只说一句话就结束。每次回复至少要包含：1)消费分析 2)具体建议 3)预期效果。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
      stream: false
    })
    req.timeoutInterval = 30

    const responseText = await req.loadString()
    const response = JSON.parse(responseText)

    if (response.error || !response.choices?.[0]?.message?.content) {
      return null
    }

    return response.choices[0].message.content.trim()
  } catch (error) {
    console.error('AI 分析失败:', error.message)
    return null
  }
}

// ==================== 详情页面（自动 AI 分析 + 流式显示） ====================
async function showDetailView(stats) {
  const now = new Date()
  const budget = calculateDailyBudget(stats.totalPrice, CONFIG.BUDGET)
  const percentage = Math.round((stats.totalPrice / CONFIG.BUDGET) * 100)

  // 获取 Top 3 类目
  const categories = stats.categories || []
  const topCategories = categories
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)

  // 检查 AI 配置状态
  const aiConfigured = isAIConfigured()

  // 如果配置了 AI，异步获取建议
  let aiSuggestion = null
  if (aiConfigured) {
    console.log('开始调用 AI 分析...')
    aiSuggestion = await getAISuggestion(stats)
    if (aiSuggestion) {
      console.log('========== 准备显示 AI 建议 ==========')
      console.log('建议长度 = ' + aiSuggestion.length)
      console.log('建议内容 = ' + aiSuggestion)
      console.log('========== AI 建议准备完成 ==========')
    } else {
      console.log('AI 分析返回 null，未获取到建议')
    }
  } else {
    console.log('AI 未配置，跳过分析')
  }

  // HTML 转义函数
  function escapeHtml(text) {
    if (!text) return ''
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  // 构建 HTML 页面
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <style>
    :root {
      --bg: #0a0a12;
      --card-bg: rgba(255, 255, 255, 0.05);
      --border: rgba(255, 255, 255, 0.1);
      --text: #ffffff;
      --text-dim: #999999;
      --success: #4ade80;
      --warning: #feca57;
      --danger: #ff6b6b;
      --primary: #00D8FF;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      padding: 20px;
      background: var(--bg);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro", sans-serif;
      color: var(--text);
      min-height: 100vh;
    }

    .header {
      text-align: center;
      margin-bottom: 24px;
    }

    .month {
      font-size: 16px;
      color: #FFD700;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .total {
      font-size: 42px;
      font-weight: 800;
      color: ${percentage > 100 ? 'var(--danger)' : percentage > 80 ? 'var(--warning)' : 'var(--text)'};
      margin: 12px 0;
    }

    .budget-info {
      font-size: 13px;
      color: var(--text-dim);
      margin-bottom: 12px;
    }

    .progress {
      width: 100%;
      height: 8px;
      background: var(--card-bg);
      border-radius: 4px;
      overflow: hidden;
      margin: 16px 0;
    }

    .progress-bar {
      height: 100%;
      width: 0%;
      background: ${percentage >= 100 ? 'var(--danger)' : percentage >= 80 ? 'var(--warning)' : 'var(--primary)'};
      transition: width 0.8s ease-out;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .stat-box {
      background: rgba(255, 255, 255, 0.03);
      padding: 12px;
      border-radius: 12px;
    }

    .stat-label {
      font-size: 11px;
      color: var(--text-dim);
      margin-bottom: 6px;
    }

    .stat-value {
      font-size: 20px;
      font-weight: 700;
    }

    .category-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid var(--border);
    }

    .category-item:last-child {
      border-bottom: none;
    }

    .category-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .category-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .category-name {
      font-size: 14px;
    }

    .category-right {
      text-align: right;
    }

    .category-amount {
      font-size: 15px;
      font-weight: 600;
    }

    .category-percent {
      font-size: 11px;
      color: var(--text-dim);
      margin-top: 2px;
    }

    /* AI 分析区域 */
    .ai-card {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
      border: 1px solid rgba(102, 126, 234, 0.3);
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .ai-content {
      font-size: 14px;
      line-height: 1.6;
      color: var(--text);
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .ai-loading {
      color: var(--text-dim);
      font-style: italic;
    }

    .ai-error {
      color: var(--danger);
      font-size: 13px;
    }

    .typing-cursor {
      display: inline-block;
      width: 2px;
      height: 1em;
      background: var(--primary);
      animation: blink 1s infinite;
      margin-left: 2px;
    }

    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }

    .btn {
      width: 100%;
      padding: 14px;
      border-radius: 14px;
      border: none;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      margin-bottom: 12px;
      background: var(--card-bg);
      color: var(--text);
      border: 1px solid var(--border);
    }

    .no-data {
      text-align: center;
      padding: 20px;
      color: var(--text-dim);
      font-size: 13px;
    }

    .config-tip {
      text-align: center;
      font-size: 12px;
      color: var(--text-dim);
      margin-top: 8px;
      padding: 12px;
      background: rgba(255, 107, 107, 0.1);
      border-radius: 8px;
      border: 1px solid rgba(255, 107, 107, 0.2);
    }
  </style>
</head>
<body>

  <!-- 头部 -->
  <div class="header">
    <div class="month">${now.getMonth() + 1}月消费</div>
    <div class="total">¥${Math.round(stats.totalPrice).toLocaleString()}</div>
    <div class="budget-info">预算 ¥${CONFIG.BUDGET.toLocaleString()} · ${percentage}%</div>
    <div class="progress">
      <div class="progress-bar" id="progressBar"></div>
    </div>
  </div>

  <!-- 核心数据 -->
  <div class="card">
    <div class="card-title">💰 资金状况</div>
    <div class="grid">
      <div class="stat-box">
        <div class="stat-label">剩余预算</div>
        <div class="stat-value" style="color: ${budget.remaining < 0 ? 'var(--danger)' : 'var(--success)'}">
          ¥${budget.remaining.toLocaleString()}
        </div>
      </div>
      <div class="stat-box">
        <div class="stat-label">每日可花 (剩${budget.daysLeft}天)</div>
        <div class="stat-value" style="color: var(--primary)">
          ¥${budget.dailyBudget}
        </div>
      </div>
    </div>
  </div>

  <!-- Top 3 类目 -->
  <div class="card">
    <div class="card-title">💸 消费排行</div>
    ${topCategories.length === 0 ? '<div class="no-data">暂无消费数据</div>' :
      topCategories.map(cat => {
        const percent = stats.totalPrice > 0 ? Math.round((cat.amount / stats.totalPrice) * 100) : 0
        const color = CONFIG.COLORS[cat.name] || '#8B8B8B'
        return `
          <div class="category-item">
            <div class="category-left">
              <div class="category-dot" style="background: ${color}"></div>
              <div class="category-name">${cat.name}</div>
            </div>
            <div class="category-right">
              <div class="category-amount">¥${Math.round(cat.amount).toLocaleString()}</div>
              <div class="category-percent">${percent}%</div>
            </div>
          </div>
        `
      }).join('')
    }
  </div>

  <!-- AI 分析区域 -->
  ${aiConfigured && aiSuggestion ? `
  <div class="ai-card">
    <div class="card-title">🤖 AI 消费建议</div>
    <div class="ai-content">${escapeHtml(aiSuggestion)}</div>
  </div>
  ` : aiConfigured && !aiSuggestion ? `
  <div class="config-tip">
    ⚠️ AI 分析失败，请检查网络连接或 API 配置
  </div>
  ` : `
  <div class="config-tip">
    💡 在代码中配置 AI_API_KEY 后可获取个性化建议
  </div>
  `}

  <script>
    // 进度条动画
    setTimeout(() => {
      document.getElementById('progressBar').style.width = '${Math.min(percentage, 100)}%'
    }, 100)
  </script>

</body>
</html>
  `

  // 显示 WebView
  const wv = new WebView()
  await wv.loadHTML(html)
  await wv.present(false)
}

// ==================== 主入口 ====================
async function main() {
  console.log('========== 脚本启动 ==========')
  console.log('运行模式 = ' + (config.runsInWidget ? 'Widget' : 'App'))
  console.log('Widget 家族 = ' + (config.widgetFamily || '未知'))

  // 检查配置
  console.log('========== 配置检查 ==========')
  console.log('WORKER_URL = ' + CONFIG.WORKER_URL)
  console.log('BUDGET = ' + CONFIG.BUDGET)
  console.log('AI_API_URL = ' + CONFIG.AI_API_URL)
  console.log('AI_API_KEY 已设置 = ' + (CONFIG.AI_API_KEY ? '是' : '否'))
  console.log('AI_MODEL = ' + CONFIG.AI_MODEL)
  console.log('========== 配置检查完成 ==========')

  try {
    // 获取数据（带重试机制）
    const stats = await fetchStats()

    // 如果在 Widget 中运行，显示中型 Widget
    if (config.runsInWidget) {
      console.log('创建中型小组件...')
      const widget = createMediumWidget(stats)
      Script.setWidget(widget)
      console.log('✅ 小组件创建成功')
    } else {
      // 如果在 App 中运行（点击小组件），显示详情页
      console.log('显示详情页面...')
      await showDetailView(stats)
      console.log('✅ 详情页显示完成')
    }
  } catch (error) {
    console.error('========== 主程序错误 ==========')
    console.error('错误类型 = ' + error.constructor.name)
    console.error('错误信息 = ' + error.message)
    if (error.stack) {
      console.error('错误堆栈 = ' + error.stack.substring(0, 300))
    }

    // 错误提示
    const errorWidget = new ListWidget()
    errorWidget.backgroundColor = new Color("#1a1a2e")
    errorWidget.setPadding(16, 16, 16, 16)

    const errorText = errorWidget.addText(`❌ ${error.message}`)
    errorText.textColor = new Color("#ff6b6b")
    errorText.font = Font.systemFont(11)

    if (config.runsInWidget) {
      Script.setWidget(errorWidget)
    } else {
      await errorWidget.presentMedium()
    }
  }

  console.log('========== 脚本结束 ==========')
  Script.complete()
}

// 启动
await main()
