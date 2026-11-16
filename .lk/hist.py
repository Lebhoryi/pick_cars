import json, subprocess, time, os
UA = "Mozilla/5.0"
out = {}
for month in range(1, 11):
    found = None
    for page in range(1, 8):
        path = f'.lk/m{month:02d}_p{page}.json'
        if not os.path.exists(path):
            url = f"https://autolink.sae-china.org/api/rankings/series?year=2026&month={month}&sale_type=retail&page={page}&page_size=100"
            subprocess.run(['curl', '-sL', '-A', UA, '--max-time', '25', url, '-o', path], check=True)
            time.sleep(0.6)
        data = json.load(open(path)).get('data') or []
        for r in data:
            if r['series_id'] == 1193:
                found = {'retail': r['retail_sales'], 'wholesale': r['wholesale_sales']}
        if len(data) < 100:
            break
    out[f'2026-{month:02d}'] = found
    print(f'2026-{month:02d}', found)
json.dump(out, open('.lk/history.json', 'w'), ensure_ascii=False, indent=1)
