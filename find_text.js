const fs = require('fs');
let code = fs.readFileSync('public/pannel.html', 'utf8');
const manifestMatch = code.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);
if (manifestMatch) {
  const manifest = JSON.parse(manifestMatch[1]);
  for (let key in manifest) {
    if (manifest[key].data) {
      let decoded = Buffer.from(manifest[key].data, 'base64').toString('utf8');
      if (decoded.includes('주의')) {
        console.log('Found in key:', key);
        let snippet = decoded.substring(decoded.indexOf('주의') - 50, decoded.indexOf('주의') + 50);
        console.log(snippet);
      }
    }
  }
}
