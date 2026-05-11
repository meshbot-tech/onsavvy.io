const fs = require('fs');
const content = fs.readFileSync('savvion_control_centre.html', 'utf-8');

// Extract all inline style/content inside script tags to exclude from div counting
const scriptMatches = content.match(/<script>[\s\S]*?<\/script>/g) || [];
let cleanContent = content;
for (const s of scriptMatches) {
  cleanContent = cleanContent.replace(s, '<script>...</script>');
}

const openDivs = (cleanContent.match(/<div[\s>]/g) || []).length;
const closeDivs = (cleanContent.match(/<\/div>/g) || []).length;

console.log(`Without script content:`);
console.log(`  Opening <div>: ${openDivs}`);
console.log(`  Closing </div>: ${closeDivs}`);
console.log(`  Balance: ${openDivs === closeDivs ? 'OK' : 'MISMATCH: ' + (openDivs - closeDivs)}`);

// Now show actual structure in body
const bodyStart = cleanContent.indexOf('<body>');
const bodyEnd = cleanContent.indexOf('</body>');
const body = cleanContent.slice(bodyStart, bodyEnd);

const bodyOpen = (body.match(/<div[\s>]/g) || []).length;
const bodyClose = (body.match(/<\/div>/g) || []).length;
console.log(`\nBody only (excluding script):`);
console.log(`  Opening <div>: ${bodyOpen}`);
console.log(`  Closing </div>: ${bodyClose}`);

// Check specific problematic patterns - closing divs without opening
// Look at the document structure more carefully
const html = cleanContent.slice(cleanContent.indexOf('<html'));
const headEnd = html.indexOf('</head>');
const bodyHtml = html.slice(html.indexOf('<body'), html.indexOf('</body>'));

// Count nested structure
let stack = 0;
const tagRe = /<\/(div|html|body|head|style|script|section|aside|main|nav|footer|header|p|span|a|h[1-6])[^>]*>|<((?:div|html|body|head|style|script|section|aside|main|nav|footer|header|p|span|a|h[1-6])[\s>])/gi;
let m;
let issues = [];
let pos = 0;

while ((m = tagRe.exec(bodyHtml)) !== null) {
  const tag = m[1] || m[2];
  if (m[0].startsWith('</')) {
    stack--;
    if (stack < 0) {
      issues.push(`Extra closing tag </${tag}> at regex pos ${m.index}`);
      stack = 0;
    }
  } else if (!m[0].endsWith('/>')) {
    stack++;
  }
}

console.log(`\nStructural analysis:`);
if (issues.length) {
  issues.forEach(i => console.log(`  ${i}`));
} else {
  console.log('  No extra closing tags found in body.');
}
console.log(`  Final stack depth: ${stack} (expected ~1 for body wrapper + main divs)`);

// Print the actual HTML structure skeleton
console.log('\n=== HTML Skeleton ===');
const skel = bodyHtml.replace(/<script[\s\S]*?<\/script>/gi, '<script>...</script>');
const skelClean = skel.replace(/>\s*</g, '>\n<');
console.log(skelClean.substring(0, 3000));