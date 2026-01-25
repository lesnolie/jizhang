// 配置：替换为你的 Worker 地址和密钥
const WORKER_URL = "https://你的worker域名.workers.dev/stats";
const API_KEY = "YOUR_API_SECRET";

// 从 Worker 获取统计数据
const url = `${WORKER_URL}?key=${API_KEY}`;
const request = new Request(url);
let totalPrice = 0;
let expensiveCount = 0;
let foodAmount = 0;
let nonFoodAmount = 0;

try {
  const response = await request.loadJSON();
  if (response.error) {
    console.error("API Error:", response.error);
  } else {
    totalPrice = response.totalPrice || 0;
    expensiveCount = response.expensiveCount || 0;
    foodAmount = response.foodAmount || 0;
    nonFoodAmount = response.nonFoodAmount || 0;
  }
} catch (e) {
  console.error("Request failed:", e);
}

const budget = 4000;

const totalExpenseLimit = 4000;
const expensiveCountLimit = 5;

const icon1 = "💵";
const title1 = "月总支出";
const icon2 = "‼️";
const title2 = "高价消费";
const icon3 = "🍴";
const title3 = "食物支出";

// 创建并显示小组件
const widget = new ListWidget();
widget.backgroundColor = new Color("#000000");
widget.setPadding(16, 16, 16, 16);

// --- 头部 ---
const headerStack = widget.addStack();
headerStack.layoutVertically();

// 居中的横向 Stack
const centerStack = headerStack.addStack();
centerStack.layoutHorizontally();
centerStack.addSpacer();

// 日期
const date = new Date();
const dateString = `${date.getMonth()+1}月${date.getDate()}日`;
const dateText = centerStack.addText(dateString);
dateText.font = Font.boldSystemFont(24);
dateText.textColor = new Color("#FFD700");
dateText.minimumScaleFactor = 0.5;
dateText.lineLimit = 1;

centerStack.addSpacer();
headerStack.addSpacer();
// --- 主体 ---
const detailStack = widget.addStack();
detailStack.layoutVertically();
detailStack.addSpacer();

// 添加数据行
const dataRow = detailStack.addStack();
dataRow.layoutHorizontally();
dataRow.addSpacer();

const dataText1 = dataRow.addText(`¥${totalPrice.toFixed(2)}   `);
dataText1.font = Font.mediumSystemFont(25);
dataText1.textColor = new Color("#FFFFFF");

const dataText2 = dataRow.addText(`   ${expensiveCount}   `);
dataText2.font = Font.mediumSystemFont(25);
dataText2.textColor = new Color("#FFFFFF");

const dataText3 = dataRow.addText(`   ¥${foodAmount.toFixed(2)}`);
dataText3.font = Font.mediumSystemFont(25);
dataText3.textColor = new Color("#FFFFFF");

dataRow.addSpacer();

// 添加标题行
const titleRow = detailStack.addStack();
titleRow.layoutHorizontally();
titleRow.addSpacer();

const titleText1 = titleRow.addText(title1);
titleText1.font = Font.mediumSystemFont(15);
titleText1.textColor = new Color("#999999");
titleText1.centerAlignText();
titleRow.addSpacer();

const titleText2 = titleRow.addText(title2);
titleText2.font = Font.mediumSystemFont(15);
titleText2.textColor = new Color("#999999");
titleText2.centerAlignText();
titleRow.addSpacer();

const titleText3 = titleRow.addText(title3);
titleText3.font = Font.mediumSystemFont(15);
titleText3.textColor = new Color("#999999");
titleText3.centerAlignText();
titleRow.addSpacer();

detailStack.addSpacer();

// --- 底部 ---
const footerStack = widget.addStack();
footerStack.layoutVertically();
footerStack.addSpacer();

// 预算剩余和超出额度
const remainingBudgetStack = footerStack.addStack();
remainingBudgetStack.layoutHorizontally();
remainingBudgetStack.addSpacer();

const remainingBudget = budget - totalPrice;
const remainingBudgetText = remainingBudgetStack.addText(`预算剩余 ¥${remainingBudget.toFixed(2)}                          `);
remainingBudgetText.font =  Font.boldSystemFont(30);
remainingBudgetText.minimumScaleFactor = 0.5;
remainingBudgetText.lineLimit = 1;
remainingBudgetText.textColor = remainingBudget >= 0 ? new Color("#00a8cc") : new Color("#e74c3c");



if (totalPrice > totalExpenseLimit) {
  const overageText = remainingBudgetStack.addText(`超出 ¥${(totalPrice - totalExpenseLimit).toFixed(2)}`);
  overageText.textColor = new Color("#e74c3c");
  overageText.font = Font.mediumSystemFont(30);
  overageText.minimumScaleFactor = 0.5;
  overageText.lineLimit = 1;
}

remainingBudgetStack.addSpacer();
footerStack.addSpacer();

// 限制文本居中显示，文本颜色修改为白色
const limitStack = footerStack.addStack();
limitStack.layoutHorizontally();
limitStack.addSpacer();

const limitText = limitStack.addText(`       限制 ¥${totalExpenseLimit.toFixed(2)}                          高价消费次数限制 ${expensiveCountLimit}`);
limitText.font = Font.mediumSystemFont(25);
limitText.minimumScaleFactor = 0.5;
limitText.lineLimit = 1;
limitText.textColor = new Color("#FFFFFF");

limitStack.addSpacer();
footerStack.addSpacer();

// 数据来源文本居中偏右显示
const sourceStack = footerStack.addStack();
sourceStack.layoutHorizontally();
sourceStack.addSpacer();

const sourceText = sourceStack.addText("数据来源：Notion API");
sourceText.font = Font.boldSystemFont(15);
sourceText.minimumScaleFactor = 0.5;
sourceText.lineLimit = 1;
sourceText.textColor = new Color("#999999");


sourceStack.addSpacer();

widget.setPadding(0, 0, 0, 0);
widget.spacing = 4;

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentMedium();
}

Script.complete();
