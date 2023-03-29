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

  const currentMonth = moment().startOf('month');
  const totalPrice = pages.reduce((acc, page) => {
    const createdTime = moment(page.created_time);
    if (createdTime.isSameOrAfter(currentMonth)) {
      const priceProperty = Object.entries(page.properties).find(([key, value]) => key === "价格");
      console.log("Price property:", priceProperty);
      const price = priceProperty ? (priceProperty[1].number !== null ? priceProperty[1].number : 0) : 0;
      console.log('Page price:', price);
      return acc + price;
    }
    return acc;
  }, 0);

  console.log('Total price:', totalPrice);
}

main();
