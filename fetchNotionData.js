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
