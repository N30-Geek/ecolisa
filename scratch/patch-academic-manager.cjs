const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'academic', 'AcademicManager.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const beforeLen = content.length;

// 1. Import
const importMarker = "import { EpreuvesManager } from './EpreuvesManager';";
if (!content.includes(importMarker)) {
  console.error('IMPORT MARKER NOT FOUND');
  process.exit(1);
}
if (!content.includes('SchoolYearOnboardingWizard')) {
  content = content.replace(
    importMarker,
    importMarker + "\nimport { SchoolYearOnboardingWizard } from './SchoolYearOnboardingWizard';"
  );
  console.log('Import added.');
} else {
  console.log('Import already present.');
}

fs.writeFileSync(filePath, content, 'utf8');
const afterLen = content.length;
console.log(`Before: ${beforeLen} chars, After: ${afterLen} chars`);
