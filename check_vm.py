with open('downloaded_beta.html', 'r', encoding='utf-8') as f:
    for line in f:
        if 'id="view-marathon"' in line:
            print(line.strip())
