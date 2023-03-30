const url = "https://api.github.com/repos/用户名/仓库名/issues/28";
const request = new Request(url);
request.headers = { "Authorization": "GITHUB_TOKEN" };
const response = await request.loadJSON();

const issue = response;
const body = issue.body;

const getValue = (regex) => {
  const match = body.match(regex);
  return match ? Number(match[1]) : 0;
};

const totalPrice = getValue(/Total price: (\d+(\.\d+)?)/);
const expensiveCount = getValue(/Number of expensive expenses: (\d+(\.\d+)?)/);
const foodAmount = getValue(/Total amount spent on food: (\d+(\.\d+)?)/);
const nonFoodAmount = getValue(/Total amount spent on non-food items: (\d+(\.\d+)?)/);

const totalExpenseLimit = 4000;
const expensiveCountLimit = 5;

// 创建并显示小组件
const widget = new ListWidget();
widget.backgroundColor = new Color("#ffffff");
widget.useDefaultPadding();

const stack = widget.addStack();
stack.layoutHorizontally();
stack.centerAlignContent();

// Left part
const leftStack = stack.addStack();
leftStack.layoutVertically();
leftStack.centerAlignContent();

const titleText = leftStack.addText(" 本月总支出");
titleText.font = Font.mediumSystemFont(16);
titleText.textColor = new Color("#111111");

leftStack.addSpacer(4);

const priceText = leftStack.addText(`¥${totalPrice.toFixed(2)} / ¥${totalExpenseLimit}`);
priceText.font = Font.boldSystemFont(18);
priceText.textColor = new Color("#111111");

const priceProgress = new DrawContext();
priceProgress.size = new Size(200, 6);
priceProgress.setFillColor(new Color("#3ecf8e"));
priceProgress.fillRect(new Rect(0, 0, Math.min(1, totalPrice / totalExpenseLimit) * 200, 6));
leftStack.addImage(priceProgress.getImage());

leftStack.addSpacer(14);

const expensiveText = leftStack.addText(`🏷️ 高价消费次数: ${expensiveCount} / ${expensiveCountLimit}`);
expensiveText.font = Font.mediumSystemFont(16);
expensiveText.textColor = new Color("#111111");

const expensiveProgress = new DrawContext();
expensiveProgress.size = new Size(200, 6);
expensiveProgress.setFillColor(new Color("#3ecf8e"));
expensiveProgress.fillRect(new Rect(0, 0, Math.min(1, expensiveCount / expensiveCountLimit) * 200, 6));
leftStack.addImage(expensiveProgress.getImage());

stack.addSpacer();

// Right part
const rightStack = stack.addStack();
rightStack.layoutVertically();
rightStack.centerAlignContent();

const foodText = rightStack.addText(`🍽️ 食物支出: ¥${foodAmount.toFixed(2)}`);
foodText.font = Font.mediumSystemFont(16);
foodText.textColor = new Color("#111111");

rightStack.addSpacer(14);

const nonFoodText = rightStack.addText(`🛍️ 非食物支出: ¥${nonFoodAmount.toFixed(2)}`);
nonFoodText.font = Font.mediumSystemFont(16);
nonFoodText.textColor = new Color("#111111");

widget.addSpacer();

const footerText = widget.addText("基于 Notion API 的数据");
footerText.font = Font.lightSystemFont(10);
footerText.textColor = new Color("#777777");

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentMedium();
}

Script.complete();

