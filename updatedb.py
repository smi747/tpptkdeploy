import pandas as pd
import csv, json, math
#import sys

filename = input()
xl = pd.ExcelFile(filename)
snames = xl.sheet_names[1:2]

reslist = []
indx = 0
for i in snames:
    df = pd.read_excel(filename, sheet_name=i, dtype=str)
    a = df.values.tolist()

    current_cat = "nonecat"
    for row in a[5:]:
        if pd.isna(row[0]):
            current_cat = row[2]
        else:
            tmp = str(row[1])
            if tmp[0] == " ":
                tmp = tmp[1:]
            pcoef = 1.4
            reslist.append([indx, tmp, str(row[2]).replace('\n', ''), current_cat, math.ceil(float(row[3]) * pcoef), 0])
            indx+=1

#25000 - 3
#50000 - 5
#75000 - 7
#100000 - 10

with open('/var/lib/mysql/tpptkdb/GFG', 'w', encoding="utf-8", newline='\n') as f:
    # using csv.writer method from CSV package
    write = csv.writer(f, delimiter = "`", quoting = csv.QUOTE_NONE, quotechar='')

    write.writerow(['Id','Art','Name','Cat'])
    write.writerows(reslist)





resdict = {}
indx = 0
for i in snames:
    df = pd.read_excel(filename, sheet_name=i, dtype=str)
    resdict['123']={}
    a = df.values.tolist()

    current_cat = "nonecat"
    new_cat = ""
    for row in a:
        if pd.isna(row[0]):
            if not resdict.get(row[0]):
                resdict['123'][row[2]] = {}
                resdict['123'][row[2]][row[2]] = "0"
            else:
                resdict['123'][row[2]][row[2]] = "0"

#print(resdict)
#print(resdict['Трубная продукция'])
send_to_js = json.dumps(resdict)
with open("cattreetpptk.json", "w", encoding='utf-8') as outfile:
    outfile.write(send_to_js)


#sys.stdout.write("update completed")