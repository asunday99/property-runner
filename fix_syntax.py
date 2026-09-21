with open('current_beta.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Fix the specific syntax error
broken_str = '''
            } catch (e) {
                console.error(e);
            }
        }
, 100);
            }
        }
'''

fixed_str = '''
            } catch (e) {
                console.error(e);
            }
        }
'''
if broken_str in html:
    html = html.replace(broken_str, fixed_str)
    with open('index_beta.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print('Fixed syntax error')
else:
    print('Syntax error pattern not found')
