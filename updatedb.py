import pandas as pd
import csv, json
#import sys

filename = input()
xl = pd.ExcelFile(filename)
snames = xl.sheet_names[1:8]

reslist = []
indx = 0
for i in snames:
    df = pd.read_excel(filename, sheet_name=i, dtype=str)
    a = df.values.tolist()

    current_cat = "nonecat"
    current_subcat = "nonesubcat"
    current_units = "none"
    for row in a:
        if not pd.isna(row[0]):
            if row[3] not in ['м', 'тн',  'кв.м.', 'шт']:
                current_cat = row[0]
                current_subcat = row[3]
                current_units = row[8]
            else:
                tmp = ''
                check = False
                for c in row[0]:
                    if c.isdigit():
                        tmp+=c
                    elif c==',' and check == False:
                        tmp+=c
                        check = True
                    elif len(tmp)>0:
                        break
                reslist.append([indx,row[0], tmp, row[2], row[3], current_units, row[8], i, current_cat, current_subcat, 0])
                indx+=1

with open('/var/lib/mysql/positions/GFG', 'w', encoding="utf-8", newline='\n') as f:
    # using csv.writer method from CSV package
    write = csv.writer(f, delimiter = ":", quoting = csv.QUOTE_NONE, quotechar='')

    write.writerow(['Id','Name','Size','Mark','Units','Coef','Cat','Subcat','Subsubcat'])
    write.writerows(reslist)

resdict = {}
indx = 0
for i in snames:
    df = pd.read_excel(filename, sheet_name=i, dtype=str)
    resdict[i.strip()]={}
    a = df.values.tolist()

    current_cat = "nonecat"
    current_subcat = "nonesubcat"
    new_cat = ""
    new_subcat = ""
    for row in a:
        if not pd.isna(row[0]):
            if row[3] not in ['м', 'тн',  'кв.м.', 'шт']:
                if not resdict[i.strip()].get(row[0].strip()):
                    resdict[i.strip()][row[0].strip()] = {}
                    resdict[i.strip()][row[0].strip()][row[3].strip()] = "0"
                else:
                    resdict[i.strip()][row[0].strip()][row[3].strip()] = "0"

#print(resdict)
#print(resdict['Трубная продукция'])
send_to_js = json.dumps(resdict)
with open("cattree.json", "w", encoding='utf-8') as outfile:
    outfile.write(send_to_js)


#sys.stdout.write("update completed")