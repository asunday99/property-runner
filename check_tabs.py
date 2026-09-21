with open('downloaded_beta.html', 'r', encoding='utf-8') as f:
    for line in f:
        if 'class="tabs-container"' in line:
            print("Found tabs")
        if 'btn-dashboard' in line or 'btn-properties' in line or 'btn-marathon' in line:
            print(line.strip())
