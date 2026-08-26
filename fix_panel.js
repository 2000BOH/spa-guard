const fs = require('fs');
let code = fs.readFileSync('public/pannel.html', 'utf8');

// Shrink bigTabStyle
code = code.replace(/padding: '14px 8px', minHeight: '78px', borderRadius: '16px'/g, "padding: '8px 6px', minHeight: '62px', borderRadius: '12px'");

// Inject CSS to scale fonts
const css = `
<style>
/* Scale down Row 1 text */
div[style*="min-height: 62px"] > div:nth-child(1) { font-size: 26px !important; }
div[style*="min-height: 62px"] > div:nth-child(2) { font-size: 11px !important; }

/* Scale down Row 2 box and text */
div[style*="border-radius: 20px"][style*="padding: 20px 22px"] { padding: 12px 16px !important; border-radius: 16px !important; }
div[style*="border-radius: 20px"] > div:nth-child(1) { font-size: 40px !important; line-height: 1 !important; }
div[style*="border-radius: 20px"] > div:nth-child(2) { font-size: 13px !important; }
</style>
`;
code = code.replace('</body>', css + '\n</body>');
fs.writeFileSync('public/pannel.html', code);
console.log('Fixed panel HTML');
