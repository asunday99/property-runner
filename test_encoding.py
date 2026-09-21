import os, glob
import pandas as pd

downloads_dir = r'C:\Users\GOMIHOUSE\Downloads'
files = [f for f in glob.glob(os.path.join(downloads_dir, '*.xlsx')) if not os.path.basename(f).startswith('~$')]
latest = max(files, key=os.path.getctime)

df_prop = pd.read_excel(latest, sheet_name='매입부동산', header=1)
names = df_prop['소유주'].dropna().unique().tolist()
print("Names:", names[:5])
print("Repr:", repr(names[:5]))
