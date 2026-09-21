with open('index_beta.html', 'r', encoding='utf-8') as f:
    html = f.read()
import re
script_blocks = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
js = script_blocks[-1]
stack = []
in_str = False
str_char = ""
for i, line in enumerate(js.split('\n')):
    for j, c in enumerate(line):
        if in_str:
            if c == str_char and (j == 0 or line[j-1] != '\\'):
                in_str = False
        else:
            if c in ['"', "'", '`']:
                in_str = True
                str_char = c
            elif c in '{[(': stack.append((c, i+1))
            elif c in '}])':
                if not stack: 
                    print(f'Unmatched {c} at line {i+1}')
                    exit(1)
                top, _ = stack.pop()
                if (c == '}' and top != '{') or (c == ']' and top != '[') or (c == ')' and top != '('):
                    print(f'Mismatched {c} at line {i+1}, expected match for {top}')
                    exit(1)
print('Brackets OK' if not stack else f'Unclosed {stack[-1][0]} from line {stack[-1][1]}')
