const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'academic', 'AcademicManager.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix create button
const oldButtonClick = "onClick={() => { setWizardStep(1); setShowCreateModal(true); }}";
if (content.includes(oldButtonClick)) {
  content = content.replace(oldButtonClick, "onClick={() => setShowCreateModal(true)}");
  console.log('Button fixed.');
} else {
  console.log('Button marker not found (may already be fixed).');
}

// 2. Replace giant old wizard modal with new component mount
const modalCommentMarker = 'MODAL ONBOARDING MULTI-';
const idxModalCommentPos = content.indexOf(modalCommentMarker);
if (idxModalCommentPos === -1) {
  console.error('MODAL START MARKER NOT FOUND');
  process.exit(1);
}
// Remonter jusqu'au début de la ligne de commentaire "      {/* ..."
const idxModalStart = content.lastIndexOf('{/*', idxModalCommentPos);
if (idxModalStart === -1) {
  console.error('MODAL COMMENT OPEN NOT FOUND');
  process.exit(1);
}
// Trouver le début de la ligne (retour arriere jusqu'au dernier \n)
const idxLineStart = content.lastIndexOf('\n', idxModalStart) + 1;

const confirmCommentMarker = "CONFIRMATION DE SUPPRESSION D'ANN";
const idxConfirmCommentPos = content.indexOf(confirmCommentMarker);
if (idxConfirmCommentPos === -1) {
  console.error('CONFIRM MARKER NOT FOUND');
  process.exit(1);
}
const idxConfirmStart = content.lastIndexOf('{/*', idxConfirmCommentPos);
if (idxConfirmStart === -1) {
  console.error('CONFIRM COMMENT OPEN NOT FOUND');
  process.exit(1);
}

const newModalBlock = `      {showCreateModal && (
        <SchoolYearOnboardingWizard
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          existingYears={years}
          onCreated={() => { loadYearsFromDb(); }}
        />
      )}

      `;

content = content.slice(0, idxModalStart) + newModalBlock + content.slice(idxConfirmStart);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Modal block replaced successfully. New length:', content.length);
