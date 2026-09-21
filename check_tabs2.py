with open('downloaded_beta.html', 'r', encoding='utf-8') as f:
    for line in f:
        if 'btn-properties' in line:
            print(line.encode('ascii', 'ignore').decode('ascii').strip())
