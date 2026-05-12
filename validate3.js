const fs = require('fs');
const content = fs.readFileSync('savvion_control_centre.html', 'utf-8');

// Remove script and style content to avoid counting template literals
let clean = content.replace(/<script[\s\S]*?<\/script>/gi, '');
clean = clean.replace(/<style[\s\S]*?<\/style>/gi, '');

const openDivs = (clean.match(/<div[\s>]/g) || []).length;
const closeDivs = (clean.match(/<\/div>/g) || []).length;

console.log(`After removing <script> and <style> blocks:`);
console.log(`  Opening <div>: ${openDivs}`);
console.log(`  Closing </div>: ${closeDivs}`);
console.log(`  Balance: ${openDivs === closeDivs ? '✅ OK' : '❌ MISMATCH of ' + (openDivs - closeDivs)}`);

// Trace div nesting for body content
const bodyMatch = content.match(/<body[\s>]([\s\S]*)<\/body>/);
if (bodyMatch) {
  const body = bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const stack = [];
  let maxDepth = 0;
  const re = /<(\/?)(div)\b[^>]*>/gi;
  let m;
  let i = 0;
  while ((m = re.exec(body)) !== null) {
    i++;
    if (m[1] === '/') {
      if (stack.length > 0) {
        stack.pop();
      } else {
        console.log(`  WARNING: Extra </div> at match #${i} near: ...${body.substring(Math.max(0, m.index - 40), m.index + 40)}...`);
      }
    } else {
      stack.push(i);
      if (stack.length > maxDepth) maxDepth = stack.length;
    }
  }
  console.log(`\nMax nesting depth: ${maxDepth}`);
  console.log(`Remaining unclosed: ${stack.length === 0 ? 'None ✅' : stack.length}`);
}