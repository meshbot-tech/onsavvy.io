import re
from html.parser import HTMLParser

F = 'savvion_control_centre.html'

with open(F, 'r') as f:
    content = f.read()
    lines = content.split('\n')

print(f'File: {F}')
print(f'Total lines: {len(lines)}')
print()

# 1. Count div tags
opens = len(re.findall(r'<div[\s>]', content))
closes = len(re.findall(r'</div>', content))
print(f'Opening <div> tags:  {opens}')
print(f'Closing </div> tags: {closes}')
diff = opens - closes
print(f'Balance: {"OK" if diff == 0 else f"MISMATCH (diff: {diff})"}\n')

# 2. Check for unmatched div tags via stack
stack = []
unclosed = []
for i, line in enumerate(lines, 1):
    for m in re.finditer(r'<div[\s>]', line):
        stack.append(i)
    for m in re.finditer(r'</div>', line):
        if stack:
            stack.pop()
        else:
            print(f'  WARNING: Line {i}: Extra </div> without matching <div>')

if stack:
    for line_no in stack:
        unclosed.append(f'  Line {line_no}: Unclosed <div>')
        print(f'  WARNING: Line {line_no}: Unclosed <div>')

if not stack:
    print('All <div> tags properly balanced.\n')

# 3. Check overall tag pairing ignoring self-closing/void
class TagChecker(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.void = {'meta','link','br','hr','img','input','col','area','base','embed','source','track','wbr','!doctype'}
        self.errors = []
        self.pos_to_line = {}
        pos = 0
        for lineno, line in enumerate(lines, 1):
            for _ in line:
                self.pos_to_line[pos] = lineno
                pos += 1
            self.pos_to_line[pos] = lineno  # newline
            pos += 1

    def handle_starttag(self, tag, attrs):
        if tag not in self.void:
            line_no = self.pos_to_line.get(self.getpos()[0], '?')
            self.stack.append((tag, line_no))

    def handle_endtag(self, tag):
        if tag in self.void:
            return
        if self.stack and self.stack[-1][0] == tag:
            self.stack.pop()
        else:
            line_no = self.pos_to_line.get(self.getpos()[0], '?')
            self.errors.append(f'Line {line_no}: Mismatched </{tag}>')

checker = TagChecker()
try:
    checker.feed(content)
except Exception as e:
    print(f'  Parser error: {e}')

if checker.errors:
    print('Tag mismatches:')
    for e in checker.errors:
        print(f'  {e}')
else:
    print('All HTML tag pairs properly matched.')

if checker.stack:
    print(f'Unclosed tags: {[f"<{t}> (line {ln})" for t, ln in checker.stack]}')
else:
    print('No unclosed tags found.\n')

# 4. Check for remaining var(--color-*) outside :root aliases
# Find :root block boundaries
root_start = content.find(':root{')
root_end = content.find('}', root_start) if root_start > -1 else -1
root_block = content[root_start:root_end+1] if root_start > -1 and root_end > -1 else ''

outside_root = content[:root_start] + content[root_end+1:]
remaining = re.findall(r'var\(--[^)]+\)', outside_root)
# Filter out the alias definitions themselves
alias_defs = re.findall(r'--\w+:var\(--[^)]+\)', root_block)

if remaining:
    print(f'⚠️  Remaining var(--*) references outside :root aliases: {len(remaining)}')
    for ref in set(remaining):
        print(f'    {ref}')
else:
    print('✅ No orphan var(--color-*) references outside :root aliases.')

# 5. Verify key integrations
print()
print('=== Integration checks ===')

# Check client-portal link in admin
cp_link = re.search(r'href="([^"]*savvion-client-portal[^"]*)"', content)
if cp_link:
    print(f'✅ Admin -> Client Portal link: {cp_link.group(1)}')
else:
    print('❌ Missing Client Portal link in admin header')

# Check admin link in client portal (if we can read it)
try:
    with open('savvion-client-portal.html', 'r') as f2:
        cp_content = f2.read()
    admin_link = re.search(r'href="([^"]*client-dashboard[^"]*)"', cp_content)
    if admin_link:
        print(f'✅ Client Portal -> Admin link: {admin_link.group(1)}')
    else:
        print('❌ Missing Admin dashboard link in client portal')
except:
    print('⚠️  Could not check client portal file')

print()
print('=== Validation complete ===')