const fs = require('fs');
const b64 = fs.readFileSync('C:/Users/n30g3/.gemini/antigravity-ide/brain/f93eb8ed-6245-48be-8d47-5debe3109fee/media__1786209517446.png').toString('base64');
if (!fs.existsSync('public/assets')) {
  fs.mkdirSync('public/assets', { recursive: true });
}
fs.writeFileSync('public/assets/drapeau_rdc.png', fs.readFileSync('C:/Users/n30g3/.gemini/antigravity-ide/brain/f93eb8ed-6245-48be-8d47-5debe3109fee/media__1786209517446.png'));
const content = `export const FLAG_RDC_BASE64 = "data:image/png;base64,${b64}";\nexport const FLAG_RDC_URL = "/assets/drapeau_rdc.png";\n`;
fs.writeFileSync('src/assets/flagRDCData.ts', content);
console.log('FLAG RDC CONSTANT WRITTEN SUCCESSFULLY');
