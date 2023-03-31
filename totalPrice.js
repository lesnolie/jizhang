const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
firstDayOfMonth.setHours(0, 0, 0, 0);

const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
lastDayOfMonth.setHours(0, 0, 0, 0);


const { Client } = require('@notionhq/client');

const databaseId = process.env.NOTION_DATABASE_ID;

async function fetchAllPages(databaseId) {
  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  let startCursor = undefined;
  let allPages = [];

  try {
    while (true) {
      const requestOptions = {
        database_id: databaseId,
        filter: {
          property: '时间',
          date: {
            on_or_after: firstDayOfMonth.toISOString(),
            before: lastDayOfMonth.toISOString()
          }
        }
      };
      if (startCursor) {
        requestOptions.start_cursor = startCursor;
      }
      const response = await notion.databases.query(requestOptions);
      allPages = allPages.concat(response.results);
      if (!response.has_more) {
        break;
      }
      startCursor = response.next_cursor;
    }
  } catch (error) {
    console.error('Error fetching pages:', error);
  }
  return allPages;
}

async function main() {
  const pages = await fetchAllPages(databaseId);
  console.log('Pages fetched:', pages);

  const totalPrice = pages.reduce((acc, page) => {
    const priceProperty = Object.entries(page.properties).find(([key, value]) => key === "价格");
    console.log("Price property:", priceProperty);
    const price = priceProperty ? (priceProperty[1].number !== null ? priceProperty[1].number : 0) : 0;
    console.log('Page price:', price);
    return acc + price;
  }, 0);

  console.log('Total price:', totalPrice);
}

main();
