const fs = require("fs");

const { Client } = require('@notionhq/client');

const databaseId = process.env.NOTION_DATABASE_JPID;
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
  let output = "";

  randomPages.forEach((page, index) => {
    output += `Page ${index + 1} attributes:\n`;

    for (const [key, value] of Object.entries(page.properties)) {
      if (value.type === "created_time") continue;

      if (value.type === "rich_text" || value.type === "title") {
        output += `  ${key}: ${value[value.type][0].text.content}\n`;
      }
    }

    output += "\n";
  });

  return output;
}

// 用你的数据库 ID 替换 `YOUR_DATABASE_ID`
(async () => {
  const result = await displayRandomPagesAttributes(databaseId);
  console.log(result);
  fs.writeFileSync("output.txt", result);
})();









