const { Client } = require('@notionhq/client');

const databaseId = process.env.NOTION_DATABASE_ID2
const axios = require("axios");

async function getRandomPagesFromDatabase(databaseId) {
  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  try {
    // 获取数据库中的所有页面
    const response = await notion.databases.query({
      database_id: databaseId,
    });

    // 获取所有页面对象
    const allPages = response.results;

    // 随机获取5个页面
    const randomPages = [];
    for (let i = 0; i < 5; i++) {
      const randomIndex = Math.floor(Math.random() * allPages.length);
      const randomPage = allPages[randomIndex];
      randomPages.push(randomPage);

      // 从 allPages 中删除选中的页面，以防止重复选择
      allPages.splice(randomIndex, 1);
    }

    return randomPages;
  } catch (error) {
    console.error("Error fetching pages from database:", error);
  }
}
async function displayRandomPagesAttributes(databaseId) {
  const randomPages = await getRandomPagesFromDatabase(databaseId);

  randomPages.forEach((page, index) => {
    console.log(`Page ${index + 1} attributes:`);

    for (const [key, value] of Object.entries(page.properties)) {
      // 跳过 created_time 属性
      if (value.type === "created_time") continue;

      // 显示 rich_text 和 title 类型属性的 content 值
      if (value.type === "rich_text" || value.type === "title") {
        console.log(`  ${key}: ${value[value.type][0].text.content}`);
      }
    }

    console.log("\n");
  });
}




// 用你的数据库 ID 替换 `YOUR_DATABASE_ID`
displayRandomPagesAttributes(databaseId);














