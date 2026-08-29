import fs from 'fs';
import { CHECKLIST_DATA, TAB_INFO, DEPT_TABS_MAP } from './src/data/checklistData';

let csvContent = '\uFEFFDepartment,Tab,Category,ID,Check Item\n';

for (const [dept, tabs] of Object.entries(DEPT_TABS_MAP)) {
  const deptName = dept === 'facilities' ? '시설' : dept === 'reception' ? '리셉션' : dept === 'cleaning' ? '미화' : dept === 'food' ? '푸드' : dept === 'snack' ? '스낵' : dept;
  
  for (const tabId of tabs) {
    const tabName = TAB_INFO[tabId]?.name || tabId;
    const categories = CHECKLIST_DATA[tabId];
    if (!categories) continue;
    
    for (const cat of categories) {
      for (const item of cat.items) {
        const text = item.text.replace(/"/g, '""');
        csvContent += `"${deptName}","${tabName}","${cat.category}","${item.id}","${text}"\n`;
      }
    }
  }
}

// Add cleaning tabs that might be missing from DEPT_TABS_MAP directly
const cleaningTabs = ['cWTab1', 'cWTab2', 'cWTab3', 'cWTab4', 'cMTab1', 'cMTab2', 'cMTab3', 'cMTab4', 'cNTab1', 'cNTab2', 'cNTab3'];
for (const tabId of cleaningTabs) {
  if (!DEPT_TABS_MAP.cleaning.includes(tabId)) {
    const tabName = TAB_INFO[tabId]?.name || tabId;
    const categories = CHECKLIST_DATA[tabId];
    if (!categories) continue;
    for (const cat of categories) {
      for (const item of cat.items) {
        const text = item.text.replace(/"/g, '""');
        csvContent += `"미화","${tabName}","${cat.category}","${item.id}","${text}"\n`;
      }
    }
  }
}

fs.writeFileSync('점검내용_전체.csv', csvContent, 'utf8');
console.log('CSV created at 점검내용_전체.csv');
