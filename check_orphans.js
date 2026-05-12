const fs = require('fs');
const content = fs.readFileSync('savvion_control_centre.html', 'utf-8');

// Get everything outside :root{...}
const rootStart = content.indexOf(':root{');
const rootEnd = findClosingBrace(content, rootStart);
const outsideRoot = content.slice(0, rootStart) + content.slice(rootEnd + 1);

// Find all var(--...) references outside :root
const refs = outsideRoot.match(/var\(--[^)]+\)/g) || [];
// Filter out the alias definitions themselves (they're inside :root)
// Count only actual usage references
const unique = [...new Set(refs)];
console.log('Unique var() references outside :root block:');
unique.forEach(r => console.log(`  ${r}`));
console.log(`\nTotal unique: ${unique.length}`);

function findClosingBrace(str, start) {
  let depth = 0;
  for (let i = start; i < str.length; i++) {
    if (str[i] === '{') depth++;
    if (str[i] === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}