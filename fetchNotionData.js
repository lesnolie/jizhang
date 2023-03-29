const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

const { Client } = require('@notionhq/client');

const databaseId = process.env.NOTION_DATABASE_ID;
const apiKey = process.env.NOTION_API_KEY;

const notion = new Client({ auth: apiKey });

async function fetchAllPages(databaseId) {
  let allResults = [];
  let hasNextPage = true;
  let startCursor = null;

  while (hasNextPage) {
    try {
      const requestOptions = {
        database_id: databaseId,
        filter: {
          and: [
            {
              property: '时间',
              date: {
                on_or_after: firstDayOfMonth.toISOString(),
                before: lastDayOfMonth.toISOString()
              }
            },
            {
              property: '类目',
              select: {
                equals: '餐饮'
              }
            }
          ]
        }
      };
      if (startCursor) {
        requestOptions.start_cursor = startCursor;
      }
      const response = await notion.databases.query(requestOptions);

      const data = response;
      console.log('Current response data:', data);

      if (data.results) {
        console.log('Current page results:', data.results);
        allResults.push(...data.results);
      }
      hasNextPage = data.has_more;
      startCursor = data.next_cursor;
    } catch (error) {
      console.log('Error in request:', error);
    }
  }

  return allResults;
}

async function main() {
  const pages = await fetchAllPages(databaseId);
  console.log('Pages fetched:', pages);

  const totalAmount = pages.reduce((acc, page) => {
    const priceProperty = Object.entries(page.properties).find(([key, value]) => key === "价格");
    console.log("Price property:", priceProperty);
    const price = priceProperty ? (priceProperty[1].number !== null ? priceProperty[1].number : 0) : 0;
    console.log('Page price:', price);
    return acc + price;
  }, 0);

  console.log('Total amount spent on food:', totalAmount);

  const expensiveCount = pages.filter((page) => {
    const priceProperty = Object.entries(page.properties).find(([key, value]) => key === "价格");
    const price = priceProperty ? (priceProperty[1].number !== null ? priceProperty[1].number : 0) : 0;
    return price > 500;
  }).length;

  console.log('Number of expensive expenses:', expensiveCount);

  const foodAmount = pages.reduce((acc, page) => {
    const priceProperty = Object.entries(page.properties).find(([key, value]) => key === "价格");
    const price = priceProperty ? (priceProperty[1].number !== null ? priceProperty[1].number : 0) : 0;
    if (page.properties['类目'].select.name === '餐饮') {
      return acc + price;
    }
    return acc;
  }, 0);

  console.log('Total amount spent on food:', foodAmount);

  const nonFoodAmount = pages.reduce((acc, page) => {
    const priceProperty = Object.entries(page.properties).find(([key, value]) => key === "价格");
    const price = priceProperty ? (priceProperty[1].number !== null ? priceProperty[1].number : 0) : 0;
    if (page.properties['类目'].select.name !== '非餐饮') {
       return acc + price;
     }
    return acc;
   }, 0);

    console.log('Total amount spent on non-food items:', nonFoodAmount);
  }

main();
