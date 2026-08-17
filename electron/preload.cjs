const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Fenetre
  getHwid:     ()  => ipcRenderer.invoke('get-hwid'),
  minimize:    ()  => ipcRenderer.send('window-minimize'),
  maximize:    ()  => ipcRenderer.send('window-maximize'),
  close:       ()  => ipcRenderer.send('window-close'),
  isMaximized: ()  => ipcRenderer.invoke('window-is-maximized'),
  platform:    process.platform,
  isElectron:  true,

  // Config app (onboarding, theme, ...)
  getConfig:    (key)        => ipcRenderer.invoke('db-get-config', key),
  setConfig:    (key, value) => ipcRenderer.invoke('db-set-config', key, value),
  deleteConfig: (key)        => ipcRenderer.invoke('db-delete-config', key),
  getAllConfig:  ()           => ipcRenderer.invoke('db-get-all-config'),

  // Session utilisateur
  getCurrentSession: ()      => ipcRenderer.invoke('db-get-current-session'),
  setCurrentSession: (sess)  => ipcRenderer.invoke('db-set-current-session', sess),

  // Utilisateurs
  getUsers:          ()              => ipcRenderer.invoke('db-get-users'),
  getUserByEmail:    (email)         => ipcRenderer.invoke('db-get-user-by-email', email),
  verifyCredentials: (email, pwd)    => ipcRenderer.invoke('db-verify-credentials', email, pwd),
  addUser:           (user)          => ipcRenderer.invoke('db-add-user', user),
  updateUser:        (id, upd)       => ipcRenderer.invoke('db-update-user', id, upd),
  deleteUser:        (id)            => ipcRenderer.invoke('db-delete-user', id),

  // Annees scolaires
  getSchoolYears:    ()        => ipcRenderer.invoke('db-get-school-years'),
  getSchoolYear:     (id)      => ipcRenderer.invoke('db-get-school-year', id),
  addSchoolYear:     (year)    => ipcRenderer.invoke('db-add-school-year', year),
  updateSchoolYear:  (id, upd) => ipcRenderer.invoke('db-update-school-year', id, upd),
  deleteSchoolYear:  (id)      => ipcRenderer.invoke('db-delete-school-year', id),

  // Classes
  getClasses:   (yearId)   => ipcRenderer.invoke('db-get-classes', yearId),
  addClass:     (cls)      => ipcRenderer.invoke('db-add-class', cls),
  updateClass:  (id, upd)  => ipcRenderer.invoke('db-update-class', id, upd),
  deleteClass:  (id)       => ipcRenderer.invoke('db-delete-class', id),

  // Salles Physiques
  getSalles:    (cycleCode) => ipcRenderer.invoke('db-get-salles', cycleCode),
  addSalle:     (salle)     => ipcRenderer.invoke('db-add-salle', salle),
  updateSalle:  (id, upd)   => ipcRenderer.invoke('db-update-salle', id, upd),
  deleteSalle:  (id)        => ipcRenderer.invoke('db-delete-salle', id),

  // Matieres
  getSubjects:   ()      => ipcRenderer.invoke('db-get-subjects'),
  addSubject:    (s)     => ipcRenderer.invoke('db-add-subject', s),
  deleteSubject: (id)    => ipcRenderer.invoke('db-delete-subject', id),

  // Eleves
  getEleves:   (filters) => ipcRenderer.invoke('db-get-eleves', filters),
  addEleve:    (e)       => ipcRenderer.invoke('db-add-eleve', e),
  updateEleve: (id, upd) => ipcRenderer.invoke('db-update-eleve', id, upd),
  deleteEleve: (id)      => ipcRenderer.invoke('db-delete-eleve', id),

  // Finances — Factures
  getInvoices: (yearId)  => ipcRenderer.invoke('db-get-invoices', yearId),
  addInvoice:  (inv)     => ipcRenderer.invoke('db-add-invoice', inv),
  updateInvoice:(id, upd)=> ipcRenderer.invoke('db-update-invoice', id, upd),
  deleteInvoice:(id)     => ipcRenderer.invoke('db-delete-invoice', id),
  cleanupDuplicateInvoices: () => ipcRenderer.invoke('db-cleanup-duplicate-invoices'),
  cleanupDuplicateFeeTypes: () => ipcRenderer.invoke('db-cleanup-duplicate-fee-types'),

  // Finances — Paiements
  getPayments: (invId)   => ipcRenderer.invoke('db-get-payments', invId),
  addPayment:  (p)       => ipcRenderer.invoke('db-add-payment', p),

  // Finances — Dépenses
  getExpenses:   ()     => ipcRenderer.invoke('db-get-expenses'),
  addExpense:    (e)    => ipcRenderer.invoke('db-add-expense', e),
  deleteExpense: (id)   => ipcRenderer.invoke('db-delete-expense', id),

  // Types de frais
  getFeeTypes:   (yearId)  => ipcRenderer.invoke('db-get-fee-types', yearId),
  addFeeType:    (ft)      => ipcRenderer.invoke('db-add-fee-type', ft),
  updateFeeType: (id, upd) => ipcRenderer.invoke('db-update-fee-type', id, upd),
  deleteFeeType: (id)      => ipcRenderer.invoke('db-delete-fee-type', id),

  // Caisse
  getCashOperations: (filters) => ipcRenderer.invoke('db-get-cash-operations', filters),
  addCashOperation:  (op)      => ipcRenderer.invoke('db-add-cash-operation', op),
  deleteCashOperation: (id)    => ipcRenderer.invoke('db-delete-cash-operation', id),

  // Comptabilité
  getComptes:    ()            => ipcRenderer.invoke('db-get-comptes'),
  addCompte:     (c)           => ipcRenderer.invoke('db-add-compte', c),
  updateCompte:  (id, upd)     => ipcRenderer.invoke('db-update-compte', id, upd),
  deleteCompte:  (id)          => ipcRenderer.invoke('db-delete-compte', id),

  getJournaux:   ()            => ipcRenderer.invoke('db-get-journaux'),
  addJournal:    (j)           => ipcRenderer.invoke('db-add-journal', j),
  updateJournal: (id, upd)     => ipcRenderer.invoke('db-update-journal', id, upd),
  deleteJournal: (id)          => ipcRenderer.invoke('db-delete-journal', id),

  getEcritures:  (filters)     => ipcRenderer.invoke('db-get-ecritures', filters),
  addEcriture:   (e)           => ipcRenderer.invoke('db-add-ecriture', e),
  deleteEcriture: (ecritureId) => ipcRenderer.invoke('db-delete-ecriture', ecritureId),

  getBudgets:    (filters)     => ipcRenderer.invoke('db-get-budgets', filters),
  addBudget:     (b)           => ipcRenderer.invoke('db-add-budget', b),
  updateBudget:  (id, upd)     => ipcRenderer.invoke('db-update-budget', id, upd),
  deleteBudget:  (id)          => ipcRenderer.invoke('db-delete-budget', id),

  getStaffExpenseNotes:   (filters) => ipcRenderer.invoke('db-get-staff-expense-notes', filters),
  addStaffExpenseNote:    (n)       => ipcRenderer.invoke('db-add-staff-expense-note', n),
  updateStaffExpenseNote: (id, upd) => ipcRenderer.invoke('db-update-staff-expense-note', id, upd),
  deleteStaffExpenseNote: (id)      => ipcRenderer.invoke('db-delete-staff-expense-note', id),
  reimburseStaffExpenseNote: (id, data) => ipcRenderer.invoke('db-reimburse-staff-expense-note', id, data),

  getInvoiceSendingHistory: (filters) => ipcRenderer.invoke('db-get-invoice-sending-history', filters),
  addInvoiceSendingHistory: (h)       => ipcRenderer.invoke('db-add-invoice-sending-history', h),
  deleteInvoiceSendingHistory: (id)   => ipcRenderer.invoke('db-delete-invoice-sending-history', id),

  // Personnel
  getStaff:    ()       => ipcRenderer.invoke('db-get-staff'),
  addStaff:    (m)      => ipcRenderer.invoke('db-add-staff', m),
  deleteStaff: (id)     => ipcRenderer.invoke('db-delete-staff', id),

  // Fiches de paie
  getFichesPaie:   (filters)  => ipcRenderer.invoke('db-get-fiches-paie', filters),
  addFichePaie:    (f)        => ipcRenderer.invoke('db-add-fiche-paie', f),
  updateFichePaie: (id, upd)  => ipcRenderer.invoke('db-update-fiche-paie', id, upd),
  deleteFichePaie: (id)       => ipcRenderer.invoke('db-delete-fiche-paie', id),

  // Cotes
  getCotes:   (filters) => ipcRenderer.invoke('db-get-cotes', filters),
  addCote:    (c)       => ipcRenderer.invoke('db-add-cote', c),
  updateCote: (id, upd) => ipcRenderer.invoke('db-update-cote', id, upd),
  deleteCote: (id)      => ipcRenderer.invoke('db-delete-cote', id),

  // Presences
  getPresences:   (filters) => ipcRenderer.invoke('db-get-presences', filters),
  addPresence:    (p)       => ipcRenderer.invoke('db-add-presence', p),
  deletePresence: (id)      => ipcRenderer.invoke('db-delete-presence', id),

  // School Events
  getSchoolEvents:   (filters) => ipcRenderer.invoke('db-get-school-events', filters),
  addSchoolEvent:    (ev)      => ipcRenderer.invoke('db-add-school-event', ev),
  deleteSchoolEvent: (id)      => ipcRenderer.invoke('db-delete-school-event', id),

  // Documents scolaires
  getStudentDocuments:    (studentId)       => ipcRenderer.invoke('documents-get-by-student', studentId),
  deleteStudentDocument:  (id)              => ipcRenderer.invoke('documents-delete', id),
  openStudentDocument:    (id)              => ipcRenderer.invoke('documents-open', id),
  readStudentDocument:    (id)              => ipcRenderer.invoke('documents-read-file', id),
  importStudentDocuments: (studentId)       => ipcRenderer.invoke('documents-import-files', studentId),
  importStudentFolder:    (studentId)       => ipcRenderer.invoke('documents-import-folder', studentId),
  importStudentImage:     (studentId, originalName, base64) => ipcRenderer.invoke('documents-import-image', studentId, originalName, base64),
  compressStudentDocuments: (studentId, ids) => ipcRenderer.invoke('documents-compress', studentId, ids),
  renameStudentDocument:  (id, newName)     => ipcRenderer.invoke('documents-rename', id, newName),

  // Scanner matériel (WIA)
  listWiaDevices: ()  => ipcRenderer.invoke('wia-list-devices'),
  wiaScan:        ()  => ipcRenderer.invoke('wia-scan'),

  // Imprimantes système
  getPrinters:    ()       => ipcRenderer.invoke('get-printers'),
  printReceipt:   (opts)   => ipcRenderer.invoke('print:silent', opts),
  printSilent:    (opts)   => ipcRenderer.invoke('print:silent', opts),

  // Nettoyage de la base de données
  cleanMockData:  ()  => ipcRenderer.invoke('db:clean-mock-data'),
});
