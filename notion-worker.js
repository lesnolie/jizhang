// 环境变量（在 Cloudflare Dashboard 设置）：
// - NOTION_API_KEY
// - NotionDatabaseId
// - API_SECRET（用于接口验证）
// 注意：使用 Cloudflare Workers AI，无需额外 API Key

// 消费类目列表
const CATEGORIES = [
  '餐饮',   // 早餐、午餐、晚餐、外卖、奶茶、咖啡、零食、水果
  '交通',   // 地铁、公交、打车、加油、停车、共享单车
  '购物',   // 衣服、鞋、包、电子产品、家电
  '日用',   // 纸巾、洗护用品、清洁用品、家居用品
  '娱乐',   // 电影、游戏、KTV、旅游、门票
  '医疗',   // 看病、药品、体检
  '居住',   // 房租、水电、物业、维修
  '通讯',   // 话费、网费、会员订阅
  '社交',   // 礼物、红包、请客
  '学习',   // 书籍、课程、培训
  '其他'    // 无法归类的消费
]

export default {
  async fetch(request, env) {
    return handleRequest(request, env)
  }
}

async function handleRequest(request, env) {
  const url = new URL(request.url)

  // 验证 API 密钥（从 URL 参数或 Header 获取）
  const apiKey = url.searchParams.get('key') || request.headers.get('X-API-Key')
  if (apiKey !== env.API_SECRET) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  // 路由分发
  if (url.pathname === '/stats' && request.method === 'GET') {
    return handleStats(env)
  }

  if (url.pathname === '/add' && request.method === 'POST') {
    return handleAdd(request, env)
  }

  // 兼容旧的直接 POST 请求
  if (request.method === 'POST') {
    return handleAdd(request, env)
  }

  return jsonResponse({ error: 'Not Found' }, 404)
}

// 统一的 JSON 响应
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

// ==================== 统计接口 ====================

async function handleStats(env) {
  try {
    const pages = await fetchMonthlyRecords(env)
    const stats = calculateStats(pages)
    return jsonResponse(stats)
  } catch (error) {
    console.error('Stats error:', error)
    return jsonResponse({ error: error.message }, 500)
  }
}

async function fetchMonthlyRecords(env) {
  const now = new Date()
  const firstDayOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, -8))

  let allPages = []
  let startCursor = undefined

  while (true) {
    const requestBody = {
      filter: {
        property: '时间',
        date: { on_or_after: firstDayOfMonth.toISOString() }
      },
      page_size: 100
    }

    if (startCursor) {
      requestBody.start_cursor = startCursor
    }

    const response = await fetch(`https://api.notion.com/v1/databases/${env.NotionDatabaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error('Failed to query Notion: ' + response.status)
    }

    const data = await response.json()
    allPages = allPages.concat(data.results)

    if (!data.has_more) break
    startCursor = data.next_cursor
  }

  return allPages
}

function calculateStats(pages) {
  let totalPrice = 0
  let expensiveCount = 0
  let foodAmount = 0

  for (const page of pages) {
    const price = page.properties['价格']?.number || 0
    const category = page.properties['类目']?.select?.name || ''

    totalPrice += price
    if (price > 500) expensiveCount++
    if (category === '餐饮') foodAmount += price
  }

  return {
    totalPrice: Math.round(totalPrice * 100) / 100,
    expensiveCount,
    foodAmount: Math.round(foodAmount * 100) / 100,
    nonFoodAmount: Math.round((totalPrice - foodAmount) * 100) / 100
  }
}

// ==================== 记账接口 ====================

async function handleAdd(request, env) {
  try {
    // 解析用户输入
    let user_input = ''
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      user_input = formData.get('user_input') || ''
    } else if (contentType.includes('application/json')) {
      const jsonData = await request.json()
      user_input = jsonData.user_input
    } else {
      throw new Error('Unsupported content type: ' + contentType)
    }

    if (!user_input.trim()) {
      throw new Error('用户输入不能为空')
    }

    // Step 1: 用 Cloudflare Workers AI 解析用户输入
    const parsed = await parseUserInput(user_input, env)

    // Step 2: 构建 Notion API JSON
    const beijingTime = getBeijingTime()
    const notionBody = buildNotionPageBody(parsed, beijingTime, env)

    // Step 3: 创建 Notion 页面
    const notion_response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify(notionBody)
    })

    if (!notion_response.ok) {
      const errorText = await notion_response.text()
      throw new Error('Failed to create Notion page: ' + errorText)
    }

    const notion_data = await notion_response.json()
    return jsonResponse(notion_data)

  } catch (error) {
    console.error('Error:', error)
    return jsonResponse({ error: error.message }, 500)
  }
}

// 使用 Cloudflare Workers AI 解析用户输入
async function parseUserInput(user_input, env) {
  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', {
    messages: [
      {
        role: 'system',
        content: `你是一个JSON生成器。你只能返回纯JSON，不能返回任何其他内容。不要解释，不要写代码，只返回JSON。

可选类目：${CATEGORIES.join('、')}`
      },
      {
        role: 'user',
        content: `解析这条消费记录，返回JSON：${user_input}

格式：{"category":"类目","price":数字,"content":"描述"}`
      }
    ]
  })

  // 解析 AI 返回的 JSON
  let result
  try {
    let text = response.response.trim()
    // 移除可能的 markdown 代码块
    text = text.replace(/```json\n?|\n?```/g, '').trim()
    // 尝试提取第一个 JSON 对象
    const jsonMatch = text.match(/\{[^}]+\}/)
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('未找到JSON')
    }
  } catch (e) {
    throw new Error('AI 返回格式错误: ' + response.response)
  }

  // 验证必填字段
  if (!result.content || result.content.trim() === '') {
    throw new Error('无法识别消费内容，请重新输入')
  }

  // 验证价格
  if (typeof result.price !== 'number' || isNaN(result.price) || result.price <= 0) {
    throw new Error('无法识别价格，请确保输入包含有效金额')
  }

  // 验证类目
  if (!CATEGORIES.includes(result.category)) {
    result.category = '其他'
  }

  return result
}

// 获取北京时间 ISO 字符串
function getBeijingTime() {
  const now = new Date()
  return new Date(now.getTime() + 8 * 60 * 60 * 1000)
    .toISOString()
    .replace(/\.\d{3}Z$/, '+08:00')
}

// 构建 Notion 页面请求体
function buildNotionPageBody(parsed, beijingTime, env) {
  return {
    parent: { database_id: env.NotionDatabaseId },
    properties: {
      '内容': {
        title: [{ text: { content: parsed.content } }]
      },
      '类目': {
        select: { name: parsed.category }
      },
      '价格': {
        number: parsed.price
      },
      '时间': {
        date: { start: beijingTime }
      }
    }
  }
}
