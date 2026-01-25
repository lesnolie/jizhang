const fs = require('fs');

function analyzeQuotes(filename, lineNum) {
  const lines = fs.readFileSync(filename, 'utf8').split('\n');
  const line = lines[lineNum - 1];

  console.log('文件:', filename);
  console.log('行号:', lineNum);
  console.log('内容:', line);
  console.log('长度:', line.length);

  // 统计引号
  const singles = (line.match(/'/g) || []).length;
  const doubles = (line.match(/"/g) || []).length;
  const ticks = (line.match(/`/g) || []).length;

  console.log('单引号数:', singles, '(成对需要偶数)');
  console.log('双引号数:', doubles, '(成对需要偶数)');
  console.log('反引号数:', ticks, '(成对需要偶数)');

  if (singles % 2 !== 0) console.log('⚠️ 单引号不成对！');
  if (doubles % 2 !== 0) console.log('⚠️ 双引号不成对！');
  if (ticks % 2 !== 0) console.log('⚠️ 反引号不成对！');

  console.log('');
}

// 检查用户报告的所有问题行
console.log('=== Critical 错误检查 ===\n');
analyzeQuotes('notion-worker.js', 10);
analyzeQuotes('scriptable小组件.js', 33);
analyzeQuotes('scriptable_review小组件.js', 18);
analyzeQuotes('scriptable_review小组件.js', 192);
analyzeQuotes('scriptable_review小组件.js', 232);
analyzeQuotes('scriptable_review小组件.js', 441);
analyzeQuotes('scriptable_review小组件.js', 623);

console.log('=== High 错误检查 ===\n');
analyzeQuotes('scriptable_review小组件.js', 79);
analyzeQuotes('scriptable_review小组件.js', 175);
analyzeQuotes('notion-worker.js', 207);

console.log('=== Medium 错误检查 ===\n');
analyzeQuotes('scriptable小组件.js', 55);
analyzeQuotes('scriptable_review小组件.js', 11);
analyzeQuotes('scriptable_review小组件.js', 351);
analyzeQuotes('scriptable_review小组件.js', 692);
