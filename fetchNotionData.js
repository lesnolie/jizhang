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
       }    ;
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

const fs = require('fs');

async function main() {
  const pages = await fetchAllPages(databaseId);
  console.log('Pages fetched:', pages);

   const totalPrice = pages.reduce((acc, page) => {
    // ...
  }, 0);

  console.log('Total price:', totalPrice);

  // Create new GitHub Issue with the total price as the issue title
  const octokit = github.getOctokit(core.getInput('repo_token'));
  const { context = {} } = github;
  const { owner, repo } = context.repo || {};
  const newIssue = await octokit.issues.create({
    owner,
    repo,
    title: `Total Price: ${totalPrice}`,
  });

  console.log(`New issue created: ${newIssue.data.html_url}`);
}

main();
