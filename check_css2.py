with open('downloaded_beta.html', 'r', encoding='utf-8') as f:
    for line in f:
        if '#view-marathon {' in line:
            print(line.strip())
        if '#view-marathon ' in line and '{' in line:
            print(line.strip())
