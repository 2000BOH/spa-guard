import re
import json

html_path = '/Users/toondran/Downloads/gemini-code-1786757403289.html'
out_path = '/Users/toondran/.gemini/antigravity-ide/scratch/spa-guard/src/data/checklistData.ts'

with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

tabs = {}
for i in range(1, 5):
    tab_id = f'tab{i}'
    pattern = rf'<div class="tab-panel.*?id="{tab_id}".*?>(.*?)</div>\s*<!-- \[탭'
    if i == 4:
        pattern = rf'<div class="tab-panel.*?id="{tab_id}".*?>(.*?)<div class="summary-box">'
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        continue
    
    tab_content = match.group(1)
    
    sections = []
    section_parts = tab_content.split('<div class="section-card">')[1:]
    for part in section_parts:
        title_match = re.search(r'<div class="section-title"><span>(.*?)</span>', part)
        title = title_match.group(1) if title_match else ""
        
        items = []
        item_matches = re.finditer(r'<div class="slim-item" data-id="([^"]+)".*?<span class="item-text">([^<]+)</span>', part)
        for im in item_matches:
            items.append({
                "id": im.group(1),
                "text": im.group(2)
            })
        
        sections.append({
            "category": title,
            "items": items
        })
    tabs[tab_id] = sections

ts_content = f"""
export const TAB_INFO = {{
  tab1: {{ id: 'tab1', name: '시설 Ⅰ (2층)', htmlName: '시설 Ⅰ\\n(2층)', title: '시설 Ⅰ (2층) 점검' }},
  tab2: {{ id: 'tab2', name: '시설 Ⅱ (지하)', htmlName: '시설 Ⅱ\\n(지하)', title: '시설 Ⅱ (지하) 점검' }},
  tab3: {{ id: 'tab3', name: '시설 Ⅲ (탕, 찜질)', htmlName: '시설 Ⅲ\\n(탕, 찜질)', title: '시설 Ⅲ (탕, 테마찜질방) 점검' }},
  tab4: {{ id: 'tab4', name: '시설 Ⅳ (기타)', htmlName: '시설 Ⅳ\\n(기타)', title: '시설 Ⅳ (기타 모든 구역) 점검' }}
}};

export const CHECKLIST_DATA = {json.dumps(tabs, ensure_ascii=False, indent=2)};
"""

import os
os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(ts_content.strip())

print("Data successfully parsed and written to", out_path)
