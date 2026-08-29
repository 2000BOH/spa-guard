const fs = require('fs');
let code = fs.readFileSync('public/pannel.html', 'utf8');
code = code.replace(
  /'⚠️ 주의: 설정 다름 \(목표: ' \+ target \+ '\)'/g,
  "'⚠️ 주의\\n(목표:' + target + ')'"
);
fs.writeFileSync('public/pannel.html', code);
console.log('Fixed panel HTML warning text');
