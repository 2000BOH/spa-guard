import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read checklistData.ts
const dataStr = fs.readFileSync(path.join(__dirname, 'src/data/checklistData.ts'), 'utf8');

// A very hacky way to extract the CHECKLIST_DATA object
// In a real scenario we could compile it or use regex, but since it's just JS objects:
let csvContent = '\uFEFF'; // BOM for Excel UTF-8
csvContent += 'Department,Tab,ID,Check Item\n';

// We'll extract lines with id and text
const lines = dataStr.split('\n');
let currentDept = '';
let currentTab = '';

for (const line of lines) {
  const deptMatch = line.match(/^\s*(reception|facilities|cleaning|food|snack):\s*\{/);
  if (deptMatch) {
    currentDept = deptMatch[1];
  }
  
  const tabMatch = line.match(/^\s*(tab1|tab2|tab3|rTab1|rTab2|rTab3|rTab4|cTab1|cTab2|cTab3|cTab4|cTab5|cTab6|fTab1|fTab2|sTab1|sTab2|sTab3|sTab4):\s*\[/);
  if (tabMatch) {
    currentTab = tabMatch[1];
  }
  
  const itemMatch = line.match(/id:\s*'([^']+)',\s*text:\s*'([^']+)'/);
  if (itemMatch) {
    const id = itemMatch[1];
    const text = itemMatch[2].replace(/'/g, "''"); // Escape quotes for CSV
    
    // Map internal IDs to human readable names if needed, but english is fine
    const deptName = currentDept === 'facilities' ? '시설' : currentDept === 'reception' ? '리셉션' : currentDept === 'cleaning' ? '미화' : currentDept === 'food' ? '푸드' : currentDept === 'snack' ? '스낵' : currentDept;
    
    csvContent += `"${deptName}","${currentTab}","${id}","${text}"\n`;
  }
}

fs.writeFileSync('checklist_export.csv', csvContent, 'utf8');
console.log('CSV created at checklist_export.csv');
