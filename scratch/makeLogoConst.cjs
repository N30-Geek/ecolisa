const fs = require('fs');
const b64 = fs.readFileSync('public/assets/logo_epst_rdc.png').toString('base64');
if (!fs.existsSync('src/assets')) {
  fs.mkdirSync('src/assets', { recursive: true });
}
const content = `export const LOGO_EPST_RDC_BASE64 = "data:image/png;base64,${b64}";\nexport const LOGO_EPST_RDC_URL = "/assets/logo_epst_rdc.png";\n`;
fs.writeFileSync('src/assets/logoEPSTData.ts', content);
console.log('LOGO EPST CONSTANT WRITTEN SUCCESSFULLY');
