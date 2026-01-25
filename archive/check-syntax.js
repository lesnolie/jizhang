const fs = require('fs');

// 检查字符串引号配对
function checkQuotes(line, lineNum, filename) {
  let singleQuotes = 0;
  let doubleQuotes = 0;
  let backticks = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let escaped = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === "'" && !inDoubleQuote && !inBacktick) {
      singleQuotes++;
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote && !inBacktick) {
      doubleQuotes++;
      inDoubleQuote = !inDoubleQuote;
    } else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
      backticks++;
      inBacktick = !inBacktick;
    }
  }

  if (inSingleQuote || inDoubleQuote || inBacktick) {
    console.log('❌', filename + ':' + lineNum, '未闭合的字符串');
    console.log('   内容:', line.trim().substring(0, 100));
    console.log('   单引号数:', singleQuotes, '双引号数:', doubleQuotes, '反引号数:', backticks);
    return false;
  }
  return true;
}

// 检查三个文件
const files = [
  'notion-worker.js',
  'scriptable小组件.js',
  'scriptable_review小组件.js'
];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  console.log('\n检查文件:', file);
  console.log('='.repeat(60));

  let hasError = false;
  let errorCount = 0;

  lines.forEach((line, idx) => {
    if (!checkQuotes(line, idx + 1, file)) {
      hasError = true;
      errorCount++;
    }
  });

  if (!hasError) {
    console.log('✅ 所有字符串引号配对正确');
  } else {
    console.log(`\n总计发现 ${errorCount} 个未闭合字符串错误`);
  }
});
