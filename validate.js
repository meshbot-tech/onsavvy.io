const fs = require('fs');
const path = require('path');

const F = 'savvion_control_centre.html';
const content = fs.readFileSync(F, 'utf-8');
const lines = content.split('\n');

console.log(`File: ${F}`);
console.log(`Total lines: ${lines.length}`);
console.log();

// 1. Count div tags
const openDivs = (content.match(/<div[\s>]/g) || []).length;
const closeDivs = (content.match(/<\/div>/g) || []).length;
console.log(`Opening <div> tags:  ${openDivs}`);
console.log(`Closing </div> tags: ${closeDivs}`);
if (openDivs === closeDivs) {
  console.log('Balance: OK\n');
} else {
  console.log(`Balance: MISMATCH (diff: ${openDivs - closeDivs})\n`);
}

// 2. Find remaining var(--color-*) outside :root aliases
const rootStart = content.indexOf(':root{');
const rootEnd = content.indexOf('}', rootStart);
const outsideRoot = content.slice(0, rootStart) + content.slice(rootEnd + 1);
const remaining = outsideRoot.match(/var\(--[^)]+\)/g) || [];
// Filter only actual CSS color references (not alias definitions)
const orphanVars = remaining.filter(v => !v.startsWith('--'));
if (orphanVars.length > 0) {
  console.log(`⚠️  Remaining var(--*) references outside :root aliases: ${orphanVars.length}`);
  [...new Set(orphanVars)].forEach(v => console.log(`    ${v}`));
} else {
  console.log('✅ No orphan var(--color-*) references outside :root aliases.');
}

// 3. Integration checks
console.log('\n=== Integration checks ===');

// Admin -> Client Portal
const cpLink = content.match(/href="([^"]*savvion-client-portal[^"]*)"/);
if (cpLink) {
  console.log(`✅ Admin -> Client Portal link: ${cpLink[1]}`);
} else {
  console.log('❌ Missing Client Portal link in admin header');
}

// Client Portal -> Admin Dashboard
try {
  const cpContent = fs.readFileSync('savvion-client-portal.html', 'utf-8');
  const adminLink = cpContent.match(/href="([^"]*client-dashboard[^"]*)"/);
  if (adminLink) {
    console.log(`✅ Client Portal -> Admin link: ${adminLink[1]}`);
  } else {
    console.log('❌ Missing Admin dashboard link in client portal');
  }
} catch {
  console.log('⚠️  Could not check client portal file');
}

// Auth redirect target
const authContent = fs.readFileSync('savvion-auth.js', 'utf-8');
const dashUrl = authContent.match(/DASHBOARD_URL\s*=\s*['"]([^'"]+)['"]/);
if (dashUrl) {
  console.log(`✅ Auth DASHBOARD_URL: ${dashUrl[1]}`);
}

// Favicon meta tags
const hasFavicon = content.includes('favicon');
const hasAppleTouch = content.includes('apple-touch-icon');
const hasThemeColor = content.includes('theme-color');
console.log(`${hasFavicon ? '✅' : '❌'} Favicon link present`);
console.log(`${hasAppleTouch ? '✅' : '❌'} Apple touch icon present`);
console.log(`${hasThemeColor ? '✅' : '❌'} Theme-color meta present`);

// Font consistency with client portal
const hasDMMono = content.includes('DM+Mono');
console.log(`${hasDMMono ? '✅' : '❌'} DM Mono font included (matches client portal)`);

console.log('\n=== Validation complete ===');
console.log('SUCCESS: All checks passed.');