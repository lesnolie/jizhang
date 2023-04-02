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

  let outputContent = "";
  randomPages.forEach((page, index) => {
    outputContent += `Page ${index + 1} attributes:\n`;

    for (const [key, value] of Object.entries(page.properties)) {
      // 跳过 created_time 属性
      if (value.type === "created_time") continue;

      // 显示 rich_text 和 title 类型属性的 content 值
      if (value.type === "rich_text" || value.type === "title") {
        outputContent += `  ${key}: ${value[value.type][0].text.content}\n`;
      }
    }

    outputContent += "\n";
  });

  fs.writeFileSync("output.txt", outputContent, "utf-8");
  return outputContent;
}









