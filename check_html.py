with open('dashboard.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Check for unclosed tags or syntax errors
import re
print("Script tags:", len(re.findall(r'<script', html)))
print("End Script tags:", len(re.findall(r'</script>', html)))
