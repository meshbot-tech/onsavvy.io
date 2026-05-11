const fs = require('fs');
const content = fs.readFileSync('savvion_control_centre.html', 'utf-8');

// Remove script and style blocks
let clean = content.replace(/<script[\s\S]*?<\/script>/gi, '##SCRIPT##');
clean = clean.replace(/<style[\s\S]*?<\/style>/gi, '##STYLE##');

// Split into lines
const lines = clean.split('\n');

// Track div nesting with context
const stack = [];
let depth = 0;

lines.forEach((line, i) => {
  const openMatches = line.match(/<div[\s>]/g);
  const closeMatches = line.match(/<\/div>/g);

  if (openMatches) {
    openMatches.forEach(() => {
      depth++;
      stack.push({ line: i + 1, depth, preview: line.trim().substring(0, 80) });
    });
  }
  if (closeMatches) {
    closeMatches.forEach(() => {
      if (stack.length > 0) {
        const opened = stack.pop();
        // console.log(`  Matched: opened line ${opened.line} ↔ closed line ${i + 1}`);
      } else {
        console.log(`  EXTRA close at line ${i + 1}: ${line.trim().substring(0, 60)}`);
      }
    });
  }
});

if (stack.length > 0) {
  console.log(`\nUnclosed divs (${stack.length}):`);
  stack.forEach(s => {
    console.log(`  Line ${s.line} (depth ${s.depth}): ${s.preview}`);
  });
} else {
  console.log('\nAll divs properly closed ✅');
}

// Print context around unclosed divs
if (stack.length > 0) {
  console.log('\n=== Context around unclosed divs ===');
  stack.forEach(s => {
    const start = Math.max(0, s.line - 2);
    const end = Math.min(lines.length, s.line + 3);
    console.log(`\n--- Lines ${start + 1}-${end} ---`);
    for (let i = start; i < end; i++) {
      const marker = i === s.line - 1 ? '>>> ' : '    ';
      console.log(`${marker}${i + 1}: ${lines[i]}`);
    }
  });
}