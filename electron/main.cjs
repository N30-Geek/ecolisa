const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const os = require('os');
const { scryptSync, randomBytes, timingSafeEqual, randomUUID } = require('crypto');

// ─────────────────────────────────────────────────────────────────────────────
//  CRYPTOGRAPHIE — Hachage scrypt (Node.js natif, sans dépendances)
// ─────────────────────────────────────────────────────────────────────────────
function hashPassword(password) {
  const salt = randomBytes(32).toString('hex'); // 256-bit salt aléatoire
  const hash = scryptSync(password, salt, 64);  // 512-bit hash scrypt
  return `scrypt:${salt}:${hash.toString('hex')}`;
}

function verifyPassword(password, storedHash) {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
    const [, salt, hash] = parts;
    const hashBuf = Buffer.from(hash, 'hex');
    const verifyBuf = scryptSync(password, salt, 64);
    return timingSafeEqual(hashBuf, verifyBuf); // constant-time compare
  } catch {
    return false;
  }
}

let mainWindow;
let db = null;

// ─────────────────────────────────────────────────────────────────────────────
//  INITIALISATION BASE SQLITE RELATIONNELLE AVEC MIGRATIONS AUTOMATIQUES
// ─────────────────────────────────────────────────────────────────────────────
const initDatabase = () => {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'ecolisa_database.db');
  try {
    const Database = require('better-sqlite3');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL');

    // 1. Migrations de schéma
    try {
      const syCols = db.prepare(`PRAGMA table_info(school_years)`).all().map(c => c.name);
      if (syCols.length > 0 && (!syCols.includes('cycles_json') || syCols.includes('data_json'))) {
        console.log('[ECOLISA Migration] Mise a jour du schema de la table school_years...');
        db.exec(`DROP TABLE IF EXISTS school_years;`);
      }
    } catch (e) {}
    // Migration : ajout de la colonne password_hash si absente
    try {
      const userCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
      if (!userCols.includes('password_hash')) {
        db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT;');
        console.log('[ECOLISA Migration] Colonne password_hash ajoutee a users.');
      }
    } catch (e) {}
    // Migration : supprimer les anciens comptes seed (sans mot de passe hashé)
    // Tout compte sans password_hash est un compte préexistant non sécurisé
    try {
      const deleted = db.prepare("DELETE FROM users WHERE password_hash IS NULL OR password_hash = ''").run();
      if (deleted.changes > 0) {
        console.log(`[ECOLISA Migration] ${deleted.changes} ancien(s) compte(s) sans mot de passe supprime(s).`);
      }
    } catch (e) {}
    // Migration : ajout de la colonne capacite sur classes si absente
    try {
      const classCols = db.prepare('PRAGMA table_info(classes)').all().map(c => c.name);
      if (classCols.length > 0 && !classCols.includes('capacite')) {
        db.exec('ALTER TABLE classes ADD COLUMN capacite INTEGER DEFAULT 45;');
        console.log('[ECOLISA Migration] Colonne capacite ajoutee a classes.');
      }
    } catch (e) {}

    // 2. Creation des tables relationnelles
    db.exec(`
      CREATE TABLE IF NOT EXISTS app_config (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS users (
        id                 TEXT PRIMARY KEY,
        email              TEXT UNIQUE NOT NULL,
        nom                TEXT NOT NULL,
        prenom             TEXT,
        role               TEXT NOT NULL,
        pin_code           TEXT,
        password_hash      TEXT,
        avatar_url         TEXT,
        statut             TEXT NOT NULL DEFAULT 'ACTIF',
        telephone          TEXT,
        cree_le            TEXT NOT NULL DEFAULT (date('now')),
        derniere_connexion TEXT
      );
      CREATE TABLE IF NOT EXISTS school_years (
        id                  TEXT PRIMARY KEY,
        nom                 TEXT NOT NULL,
        statut              TEXT NOT NULL DEFAULT 'EN_COURS',
        debut               TEXT,
        fin                 TEXT,
        nombre_eleves_total INTEGER DEFAULT 0,
        frais_inscription   REAL DEFAULT 0,
        frais_connexion     REAL DEFAULT 0,
        frais_reinscription REAL DEFAULT 0,
        frais_carte         REAL DEFAULT 0,
        frais_annexes_json  TEXT DEFAULT '[]',
        cycles_json         TEXT DEFAULT '[]',
        options_json        TEXT DEFAULT '[]',
        salles_json         TEXT DEFAULT '[]',
        semestres_json      TEXT DEFAULT '[]',
        periodes_json       TEXT DEFAULT '[]'
      );
      CREATE TABLE IF NOT EXISTS classes (
        id                   TEXT PRIMARY KEY,
        cycle_id             TEXT,
        school_year_id       TEXT,
        option_code          TEXT,
        salle_code           TEXT,
        nom                  TEXT NOT NULL,
        salle                TEXT,
        nombre_eleves        INTEGER DEFAULT 0,
        professeur_titulaire TEXT
      );
      CREATE TABLE IF NOT EXISTS subjects (
        id          TEXT PRIMARY KEY,
        code        TEXT UNIQUE NOT NULL,
        nom         TEXT NOT NULL,
        coefficient INTEGER DEFAULT 1,
        max_score   INTEGER DEFAULT 100,
        categorie   TEXT DEFAULT 'GENERAL'
      );
      CREATE TABLE IF NOT EXISTS eleves (
        id                  TEXT PRIMARY KEY,
        registration_number TEXT,
        prenom              TEXT NOT NULL,
        nom                 TEXT NOT NULL,
        postnom             TEXT,
        sexe                TEXT DEFAULT 'M',
        date_naissance      TEXT,
        lieu_naissance      TEXT,
        class_id            TEXT,
        school_year_id      TEXT,
        statut              TEXT DEFAULT 'ACTIF',
        photo_url           TEXT,
        nom_parent          TEXT,
        contact_parent      TEXT,
        adresse             TEXT,
        data_json           TEXT NOT NULL DEFAULT '{}'
      );
      CREATE TABLE IF NOT EXISTS invoices (
        id             TEXT PRIMARY KEY,
        eleve_id       TEXT,
        school_year_id TEXT,
        montant_total  REAL DEFAULT 0,
        montant_paye   REAL DEFAULT 0,
        statut         TEXT DEFAULT 'EN_ATTENTE',
        date_echeance  TEXT,
        data_json      TEXT NOT NULL DEFAULT '{}'
      );
      CREATE TABLE IF NOT EXISTS payments (
        id            TEXT PRIMARY KEY,
        invoice_id    TEXT,
        eleve_id      TEXT,
        montant       REAL NOT NULL,
        methode       TEXT DEFAULT 'CASH',
        date_paiement TEXT,
        recu_numero   TEXT,
        encaisse_par  TEXT,
        data_json     TEXT NOT NULL DEFAULT '{}'
      );
      CREATE TABLE IF NOT EXISTS expenses (
        id                  TEXT PRIMARY KEY,
        motif               TEXT NOT NULL,
        montant             REAL NOT NULL,
        devise              TEXT DEFAULT 'USD',
        categorie           TEXT DEFAULT 'GENERAL',
        valide_par          TEXT,
        date_depense        TEXT,
        mode_paiement       TEXT DEFAULT 'CASH',
        piece_justificative TEXT
      );
      CREATE TABLE IF NOT EXISTS staff (
        id           TEXT PRIMARY KEY,
        nom          TEXT NOT NULL,
        prenom       TEXT,
        role         TEXT,
        telephone    TEXT,
        email        TEXT,
        salaire_base REAL DEFAULT 0,
        devise       TEXT DEFAULT 'USD',
        statut       TEXT DEFAULT 'ACTIF',
        data_json    TEXT DEFAULT '{}'
      );

      -- Fiches de paie du personnel
      CREATE TABLE IF NOT EXISTS fiches_paie (
        id                   TEXT PRIMARY KEY,
        staff_id             TEXT,
        staff_name           TEXT,
        staff_matricule      TEXT,
        staff_role           TEXT,
        staff_function       TEXT,
        staff_bank_account   TEXT,
        staff_mobile_money   TEXT,
        staff_payment_mode   TEXT,
        periode              TEXT,
        school_year_id       TEXT,
        annee_scolaire       TEXT,
        salaire_base         REAL DEFAULT 0,
        devise               TEXT DEFAULT 'USD',
        heures_prestees      REAL DEFAULT 0,
        salaire_brut         REAL DEFAULT 0,
        total_primes         REAL DEFAULT 0,
        total_deductions     REAL DEFAULT 0,
        total_avances        REAL DEFAULT 0,
        salaire_net          REAL DEFAULT 0,
        mode_paiement        TEXT DEFAULT 'CASH',
        reference            TEXT,
        date_paiement        TEXT,
        caissier             TEXT,
        statut               TEXT DEFAULT 'BROUILLON',
        numero_fiche         TEXT,
        notes                TEXT,
        origine_expense_id   TEXT,
        data_json            TEXT DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_fiches_paie_staff ON fiches_paie(staff_id);
      CREATE INDEX IF NOT EXISTS idx_fiches_paie_periode ON fiches_paie(periode);
      CREATE INDEX IF NOT EXISTS idx_fiches_paie_year ON fiches_paie(school_year_id);

      CREATE TABLE IF NOT EXISTS current_session (
        id        INTEGER PRIMARY KEY CHECK (id = 1),
        user_json TEXT
      );
      CREATE TABLE IF NOT EXISTS student_documents (
        id            TEXT PRIMARY KEY,
        eleve_id      TEXT NOT NULL,
        file_name     TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mime_type     TEXT,
        category      TEXT,
        size_bytes    INTEGER DEFAULT 0,
        storage_path  TEXT,
        is_archive    INTEGER DEFAULT 0,
        archive_count INTEGER DEFAULT 0,
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        data_json     TEXT DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_student_documents_eleve ON student_documents(eleve_id);

      -- Salles physiques d'étude
      CREATE TABLE IF NOT EXISTS salles (
        id          TEXT PRIMARY KEY,
        code_salle  TEXT UNIQUE NOT NULL,
        nom_salle   TEXT NOT NULL,
        capacite    INTEGER DEFAULT 45,
        cycle_code  TEXT,
        batiment    TEXT,
        statut      TEXT DEFAULT 'DISPONIBLE'
      );
      CREATE INDEX IF NOT EXISTS idx_salles_cycle ON salles(cycle_code);

      CREATE TABLE IF NOT EXISTS cotes (
        id          TEXT PRIMARY KEY,
        eleve_id    TEXT NOT NULL,
        matiere_id  TEXT,
        classe_id   TEXT,
        periode     TEXT DEFAULT '1ER_TRIMESTRE',
        type        TEXT DEFAULT 'INTERROGATION',
        score       REAL DEFAULT 0,
        max_score   REAL DEFAULT 100,
        date_cote   TEXT,
        data_json   TEXT DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_cotes_eleve ON cotes(eleve_id);
      CREATE INDEX IF NOT EXISTS idx_cotes_classe ON cotes(classe_id);

      CREATE TABLE IF NOT EXISTS presences (
        id         TEXT PRIMARY KEY,
        eleve_id   TEXT NOT NULL,
        classe_id  TEXT,
        date_jour  TEXT NOT NULL,
        statut     TEXT DEFAULT 'PRESENT',
        motif      TEXT,
        data_json  TEXT DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_presences_eleve ON presences(eleve_id);
      CREATE INDEX IF NOT EXISTS idx_presences_jour ON presences(date_jour);

      CREATE TABLE IF NOT EXISTS school_events (
        id          TEXT PRIMARY KEY,
        titre       TEXT NOT NULL,
        subtitre    TEXT,
        date_debut  TEXT NOT NULL,
        date_fin    TEXT,
        categorie   TEXT DEFAULT 'AUTRE',
        public_cible TEXT DEFAULT 'TOUS',
        highlight   INTEGER DEFAULT 0,
        data_json   TEXT DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_school_events_debut ON school_events(date_debut);

      -- Types de frais scolaires
      CREATE TABLE IF NOT EXISTS fee_types (
        id               TEXT PRIMARY KEY,
        code             TEXT,
        nom              TEXT NOT NULL,
        categorie        TEXT DEFAULT 'AUTRE',
        montant          REAL DEFAULT 0,
        devise           TEXT DEFAULT 'USD',
        obligatoire      INTEGER DEFAULT 0,
        portee           TEXT,
        school_year_id   TEXT,
        class_id         TEXT,
        salle_id         TEXT,
        mode_paiement    TEXT DEFAULT 'UNIQUE',
        nombre_tranches  INTEGER DEFAULT 1,
        data_json        TEXT DEFAULT '{}'
      );
      -- Indexes fee_types créés APRÈS les migrations de colonnes (voir plus bas)
      -- pour éviter l'erreur "no such column" sur les anciennes bases.

      -- Journal d'audit — trace toutes les actions utilisateurs
      CREATE TABLE IF NOT EXISTS audit_log (
        id           TEXT PRIMARY KEY,
        user_id      TEXT,
        user_nom     TEXT,
        user_role    TEXT,
        action       TEXT NOT NULL,
        module       TEXT,
        entite       TEXT,
        entite_id    TEXT,
        details_json TEXT DEFAULT '{}',
        ip_info      TEXT,
        created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );
      CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_date ON audit_log(created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_log_module ON audit_log(module);

      -- Journal de caisse (recettes et dépenses)
      CREATE TABLE IF NOT EXISTS cash_operations (
        id                  TEXT PRIMARY KEY,
        date_operation      TEXT NOT NULL,
        libelle             TEXT NOT NULL,
        description         TEXT,
        montant             REAL NOT NULL,
        devise              TEXT DEFAULT 'USD',
        type                TEXT NOT NULL, -- ENTREE / SORTIE
        categorie           TEXT DEFAULT 'GENERAL',
        mode_paiement       TEXT DEFAULT 'CASH',
        reference           TEXT,
        caissier            TEXT,
        piece_justificative TEXT,
        school_year_id      TEXT,
        origine             TEXT DEFAULT 'MANUAL', -- PAYMENT, EXPENSE, MANUAL, PAYROLL
        origine_id          TEXT,
        data_json           TEXT DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_cash_ops_date ON cash_operations(date_operation);
      CREATE INDEX IF NOT EXISTS idx_cash_ops_year ON cash_operations(school_year_id);
      CREATE INDEX IF NOT EXISTS idx_cash_ops_type ON cash_operations(type);

      -- Plan comptable
      CREATE TABLE IF NOT EXISTS comptes (
        id        TEXT PRIMARY KEY,
        code      TEXT UNIQUE NOT NULL,
        nom       TEXT NOT NULL,
        type      TEXT NOT NULL, -- ACTIF, PASSIF, CAPITAUX, CHARGE, PRODUIT
        parent_id TEXT,
        actif     INTEGER DEFAULT 1
      );

      -- Journaux comptables
      CREATE TABLE IF NOT EXISTS journaux (
        id    TEXT PRIMARY KEY,
        code  TEXT UNIQUE NOT NULL,
        nom   TEXT NOT NULL,
        type  TEXT NOT NULL, -- ACHATS, VENTES, CAISSE, BANQUE, OD, PAYE
        actif INTEGER DEFAULT 1
      );

      -- Écritures comptables (une ligne par écriture)
      CREATE TABLE IF NOT EXISTS ecritures (
        id          TEXT PRIMARY KEY,
        ecriture_id TEXT NOT NULL,
        journal_id  TEXT,
        date_ecriture TEXT NOT NULL,
        reference   TEXT,
        libelle     TEXT,
        compte_id   TEXT,
        debit       REAL DEFAULT 0,
        credit      REAL DEFAULT 0,
        devise      TEXT DEFAULT 'USD',
        piece       TEXT,
        data_json   TEXT DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_ecritures_id ON ecritures(ecriture_id);
      CREATE INDEX IF NOT EXISTS idx_ecritures_date ON ecritures(date_ecriture);
      CREATE INDEX IF NOT EXISTS idx_ecritures_compte ON ecritures(compte_id);

      -- Budgets prévisionnels (revenus / dépenses)
      CREATE TABLE IF NOT EXISTS budgets (
        id            TEXT PRIMARY KEY,
        school_year_id TEXT,
        periode       TEXT NOT NULL, -- ex: 2025-01, T1-2025, 2025
        date_debut    TEXT,
        date_fin      TEXT,
        categorie     TEXT NOT NULL, -- catégorie de frais ou de dépense
        type          TEXT NOT NULL, -- REVENU ou DEPENSE
        montant       REAL DEFAULT 0,
        devise        TEXT DEFAULT 'USD',
        note          TEXT,
        data_json     TEXT DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_budgets_year ON budgets(school_year_id);
      CREATE INDEX IF NOT EXISTS idx_budgets_periode ON budgets(periode);
      CREATE INDEX IF NOT EXISTS idx_budgets_type ON budgets(type);

      -- Notes de frais professionnels du personnel
      CREATE TABLE IF NOT EXISTS staff_expense_notes (
        id                        TEXT PRIMARY KEY,
        staff_id                  TEXT,
        staff_name                TEXT,
        school_year_id            TEXT,
        date_note                 TEXT,
        categorie                 TEXT,
        description               TEXT,
        montant                   REAL DEFAULT 0,
        devise                    TEXT DEFAULT 'USD',
        justificatif              TEXT,
        statut                    TEXT DEFAULT 'SOUMIS',
        valide_par                TEXT,
        date_validation           TEXT,
        commentaire_validation    TEXT,
        montant_rembourse         REAL,
        date_remboursement        TEXT,
        mode_remboursement        TEXT,
        reference_remboursement   TEXT,
        cree_par                  TEXT,
        date_creation             TEXT,
        data_json                 TEXT DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_staff_expense_notes_year ON staff_expense_notes(school_year_id);
      CREATE INDEX IF NOT EXISTS idx_staff_expense_notes_staff ON staff_expense_notes(staff_id);
      CREATE INDEX IF NOT EXISTS idx_staff_expense_notes_statut ON staff_expense_notes(statut);
      CREATE INDEX IF NOT EXISTS idx_staff_expense_notes_date ON staff_expense_notes(date_note);

      -- Historique d'envoi / partage des factures
      CREATE TABLE IF NOT EXISTS invoice_sending_history (
        id              TEXT PRIMARY KEY,
        invoice_id      TEXT,
        methode         TEXT, -- EMAIL, SMS, WHATSAPP, PRINT, DOWNLOAD, SHARE
        destinataire    TEXT,
        contact         TEXT,
        statut          TEXT DEFAULT 'SIMULE',
        date_envoi      TEXT,
        message         TEXT,
        data_json       TEXT DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_invoice_sending_invoice ON invoice_sending_history(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_invoice_sending_date ON invoice_sending_history(date_envoi);
    `);

    // 2b. Migrations incrementales : ajouter les colonnes manquantes des anciennes DB
    try {
      const ensureColumn = (table, column, type) => {
        try {
          const existing = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
          if (existing.length === 0) return;
          if (!existing.includes(column)) {
            db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
            console.log(`[ECOLISA Migration] Colonne ${column} ajoutee a ${table}.`);
          }
        } catch (err) {}
      };
      // Eleves
      ensureColumn('eleves', 'date_naissance', 'TEXT');
      ensureColumn('eleves', 'lieu_naissance', 'TEXT');
      ensureColumn('eleves', 'school_year_id', 'TEXT');
      ensureColumn('eleves', 'photo_url', 'TEXT');
      ensureColumn('eleves', 'nom_parent', 'TEXT');
      ensureColumn('eleves', 'contact_parent', 'TEXT');
      ensureColumn('eleves', 'adresse', 'TEXT');
      // Classes
      ensureColumn('classes', 'cycle_id', 'TEXT');
      ensureColumn('classes', 'school_year_id', 'TEXT');
      ensureColumn('classes', 'option_code', 'TEXT');
      ensureColumn('classes', 'salle_code', 'TEXT');
      ensureColumn('classes', 'professeur_titulaire', 'TEXT');
      ensureColumn('classes', 'nombre_eleves', 'INTEGER DEFAULT 0');
      // Invoices
      ensureColumn('invoices', 'school_year_id', 'TEXT');
      ensureColumn('invoices', 'date_echeance', 'TEXT');
      // Payments
      ensureColumn('payments', 'eleve_id', 'TEXT');
      ensureColumn('payments', 'recu_numero', 'TEXT');
      ensureColumn('payments', 'encaisse_par', 'TEXT');
      // Staff
      ensureColumn('staff', 'salaire_base', 'REAL DEFAULT 0');
      ensureColumn('staff', 'devise', 'TEXT DEFAULT \'USD\'');
    } catch (e) {}

    // 3. Seed des comptes de test par defaut (scrypt hashé)
    const insUser = db.prepare(`INSERT OR IGNORE INTO users (id,email,nom,prenom,role,pin_code,password_hash,statut,telephone) VALUES (?,?,?,?,?,?,?,?,?)`);
    const defaultAccounts = [
      ['usr_admin',      'admin@ecolisa.cd',      'KABANGE',   'Jean-Baptiste','PROMOTEUR_ADMIN',    '992001', hashPassword('admin123'),     'ACTIF', '+243 81 555 0192'],
      ['usr_prefet',     'prefet@ecolisa.cd',     'MUKENDI',   'Alphonse',     'PREFET_DIRECTEUR',   '112233', hashPassword('prefet123'),    'ACTIF', '+243 99 444 0123'],
      ['usr_comptable',  'comptable@ecolisa.cd',  'BAJIKA',    'Christian',    'COMPTABLE',          '123456', hashPassword('comptable123'), 'ACTIF', '+243 85 777 6655'],
    ];

    const seedTx = db.transaction(() => {
      defaultAccounts.forEach(u => insUser.run(...u));
    });
    seedTx();

    // Mettre à jour tout compte de test existant s'il n'avait pas de mot de passe haché
    db.prepare(`UPDATE users SET password_hash = ? WHERE email = 'admin@ecolisa.cd' AND (password_hash IS NULL OR password_hash = '')`).run(hashPassword('admin123'));

    console.log('[ECOLISA] Comptes de test prets : admin@ecolisa.cd (mdp: admin123, pin: 992001)');

    // Migration : supprimer l'année scolaire de démonstration auto-injectée par les anciennes versions
    try {
      const delYear = db.prepare("DELETE FROM school_years WHERE id = 'ay-default'").run();
      if (delYear.changes > 0) {
        console.log('[ECOLISA Migration] Annee scolaire de demonstration supprimee (ay-default).');
      }
    } catch (e) {}

    // Migration : ajouter les colonnes manquantes aux tables existantes
    const columnMigrations = [
      { table: 'classes',  column: 'school_year_id',       def: 'TEXT' },
      { table: 'eleves',   column: 'school_year_id',        def: 'TEXT' },
      { table: 'invoices', column: 'school_year_id',        def: 'TEXT' },
      { table: 'eleves',   column: 'registration_number',   def: 'TEXT' },
      { table: 'eleves',   column: 'postnom',               def: 'TEXT' },
      { table: 'eleves',   column: 'lieu_naissance',        def: 'TEXT' },
      { table: 'eleves',   column: 'photo_url',             def: 'TEXT' },
      { table: 'eleves',   column: 'nom_parent',            def: 'TEXT' },
      { table: 'eleves',   column: 'contact_parent',        def: 'TEXT' },
      { table: 'eleves',   column: 'adresse',               def: 'TEXT' },
      { table: 'school_years', column: 'frais_annexes_json', def: "TEXT DEFAULT '[]'" },
      { table: 'school_years', column: 'cycles_json',        def: "TEXT DEFAULT '[]'" },
      { table: 'school_years', column: 'options_json',       def: "TEXT DEFAULT '[]'" },
      { table: 'school_years', column: 'salles_json',        def: "TEXT DEFAULT '[]'" },
      { table: 'school_years', column: 'semestres_json',     def: "TEXT DEFAULT '[]'" },
      { table: 'school_years', column: 'periodes_json',      def: "TEXT DEFAULT '[]'" },
      { table: 'classes',      column: 'option_code',        def: 'TEXT' },
      { table: 'classes',      column: 'salle_code',         def: 'TEXT' },
      { table: 'school_years', column: 'frais_reinscription', def: 'REAL DEFAULT 0' },
      { table: 'school_years', column: 'frais_carte',         def: 'REAL DEFAULT 0' },
      { table: 'fee_types',    column: 'class_id',            def: 'TEXT' },
      { table: 'fee_types',    column: 'salle_id',            def: 'TEXT' },
      { table: 'fee_types',    column: 'mode_paiement',       def: "TEXT DEFAULT 'UNIQUE'" },
      { table: 'fee_types',    column: 'nombre_tranches',     def: 'INTEGER DEFAULT 1' },
      { table: 'ecritures',    column: 'devise',              def: "TEXT DEFAULT 'USD'" },
      { table: 'subjects',    column: 'max_examen',          def: 'INTEGER DEFAULT 40' },
      { table: 'subjects',    column: 'max_semestre',        def: 'INTEGER DEFAULT 80' },
      { table: 'subjects',    column: 'max_annuel',          def: 'INTEGER DEFAULT 160' },
      { table: 'subjects',    column: 'cycle_code',          def: 'TEXT' },
      { table: 'subjects',    column: 'option_code',         def: 'TEXT' },
      { table: 'subjects',    column: 'volume_horaire',      def: 'INTEGER DEFAULT 2' },
      { table: 'subjects',    column: 'groupe_maternelle',   def: 'TEXT' },
      { table: 'subjects',    column: 'enseignant_id',       def: 'TEXT' },
      { table: 'subjects',    column: 'enseignant_nom',      def: 'TEXT' },
      { table: 'subjects',    column: 'data_json',           def: "TEXT DEFAULT '{}'" },
    ];
    for (const { table, column, def } of columnMigrations) {
      try {
        const cols = db.prepare(`PRAGMA table_info(${table})`).all();
        if (!cols.find(c => c.name === column)) {
          db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`).run();
          console.log(`[ECOLISA Migration] Colonne '${column}' ajoutee a '${table}'.`);
        }
      } catch (e) {
        console.warn(`[ECOLISA Migration] Impossible d'ajouter '${column}' a '${table}':`, e.message);
      }
    }

    // Indexes fee_types — créés APRÈS les migrations de colonnes (class_id/salle_id)
    // pour éviter l'erreur "no such column" sur les anciennes bases.
    try {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_fee_types_year ON fee_types(school_year_id);
        CREATE INDEX IF NOT EXISTS idx_fee_types_class ON fee_types(class_id);
      `);
    } catch (e) {
      console.warn('[ECOLISA Migration] Index fee_types:', e.message);
    }

    // Seed du plan comptable minimal
    try {
      const seedComptes = db.transaction(() => {
        const stmt = db.prepare('INSERT OR IGNORE INTO comptes (id,code,nom,type,parent_id,actif) VALUES (?,?,?,?,?,?)');
        const defaultComptes = [
          ['cpt_caisse',  '57',  'Caisse',                    'ACTIF',   null, 1],
          ['cpt_banque',  '52',  'Banques',                   'ACTIF',   null, 1],
          ['cpt_client',  '41',  'Clients',                   'ACTIF',   null, 1],
          ['cpt_frs',     '40',  'Fournisseurs',              'PASSIF',  null, 1],
          ['cpt_capital', '10',  'Capital',                   'CAPITAUX',null, 1],
          ['cpt_result',  '12',  'Résultat de l\'exercice',   'CAPITAUX',null, 1],
          ['cpt_produit', '70',  'Produits encaissés',        'PRODUIT', null, 1],
          ['cpt_minerval','701', 'Minerval',                  'PRODUIT', 'cpt_produit', 1],
          ['cpt_inscript','702', 'Frais d\'inscription',      'PRODUIT', 'cpt_produit', 1],
          ['cpt_frais_ks','703', 'Frais scolaires',           'PRODUIT', 'cpt_produit', 1],
          ['cpt_charge',  '60',  'Charges',                   'CHARGE',  null, 1],
          ['cpt_salaire', '61',  'Salaires & rétributions',   'CHARGE',  'cpt_charge', 1],
          ['cpt_fournit', '62',  'Fournitures',               'CHARGE',  'cpt_charge', 1],
          ['cpt_charge_e','63',  'Charges externes',          'CHARGE',  'cpt_charge', 1],
        ];
        defaultComptes.forEach(c => stmt.run(...c));
      });
      seedComptes();

      const seedJournaux = db.transaction(() => {
        const stmt = db.prepare('INSERT OR IGNORE INTO journaux (id,code,nom,type,actif) VALUES (?,?,?,?,?)');
        const defaultJournaux = [
          ['jnl_ventes', 'JV', 'Journal des Ventes',     'VENTES', 1],
          ['jnl_caisse', 'JC', 'Journal de Caisse',      'CAISSE', 1],
          ['jnl_banque', 'JB', 'Journal de Banque',      'BANQUE', 1],
          ['jnl_achats', 'JA', 'Journal des Achats',     'ACHATS', 1],
          ['jnl_paie',   'JP', 'Journal de Paie',        'PAYE',   1],
          ['jnl_od',     'JO', 'Journal des Opérations Diverses', 'OD', 1],
        ];
        defaultJournaux.forEach(j => stmt.run(...j));
      });
      seedJournaux();
      console.log('[ECOLISA] Plan comptable et journaux initiaux prêts.');
    } catch (e) {
      console.warn('[ECOLISA] Erreur seed plan comptable :', e.message);
    }

    console.log('✅ [ECOLISA] SQLite relationnel pret :', dbPath);

    // 4. Vérification & compteurs
    try {
      const studentCount = db.prepare('SELECT COUNT(*) as cnt FROM eleves').get().cnt;
      console.log(`[ECOLISA SQLite] Base de données prête avec ${studentCount} élève(s) enregistré(s).`);
      // Recalcul des effectifs par classe
      db.prepare('UPDATE classes SET nombre_eleves = COALESCE((SELECT COUNT(*) FROM eleves WHERE class_id = classes.id), 0)').run();

      // Nettoyage des factures en double pour le même élève/année/frais
      try {
        const removed = cleanupDuplicateInvoices();
        if (removed > 0) console.log(`[ECOLISA Migration] ${removed} facture(s) en double supprimée(s).`);
      } catch (e) {
        console.warn('[ECOLISA Migration] Nettoyage des factures en double :', e.message);
      }

      // Réparation des types de frais dont l'identifiant est vide/corrompu
      // (ancien bug : un nouveau frais non encore enregistré pouvait être
      // inséré avec un id vide, ce qui risquait d'être écrasé par le prochain
      // frais créé sans id). On leur attribue un identifiant unique définitif.
      try {
        const broken = db.prepare("SELECT id FROM fee_types WHERE id IS NULL OR TRIM(id) = ''").all();
        if (broken.length > 0) {
          const fix = db.transaction(() => {
            broken.forEach(() => {
              // On ne peut pas cibler une ligne avec id vide de façon unique via WHERE id=?
              // si plusieurs existent : on traite une ligne à la fois via rowid.
              const row = db.prepare("SELECT rowid, data_json FROM fee_types WHERE id IS NULL OR TRIM(id) = '' LIMIT 1").get();
              if (!row) return;
              const newId = randomUUID();
              let data = {};
              try { data = JSON.parse(row.data_json || '{}'); } catch {}
              db.prepare('UPDATE fee_types SET id=?, data_json=? WHERE rowid=?').run(newId, JSON.stringify({ ...data, id: newId }), row.rowid);
            });
          });
          fix();
          console.log(`[ECOLISA Migration] ${broken.length} type(s) de frais avec identifiant manquant réparé(s).`);
        }
      } catch (e) {
        console.warn('[ECOLISA Migration] Réparation des identifiants de frais :', e.message);
      }

      // Réparation des lignes de facture / allocations de paiement dont le
      // feeTypeId ne correspond plus à aucun frais existant (ex: doublon
      // supprimé par une exécution antérieure de nettoyage, avant que le
      // remapping automatique n'existe). Évite qu'un frais déjà payé
      // réapparaisse comme impayé dans le guichet d'encaissement.
      try {
        const repaired = repairOrphanedFeeReferences();
        if (repaired > 0) console.log(`[ECOLISA Migration] ${repaired} ligne(s) de facture réassociée(s) à leur type de frais.`);
      } catch (e) {
        console.warn('[ECOLISA Migration] Réparation des références de frais orphelines :', e.message);
      }

      // Nettoyage des types de frais en double (même frais défini plusieurs fois
      // pour la même année, avec des portées différentes comme "Toute l'école")
      try {
        const removedFees = cleanupDuplicateFeeTypes();
        if (removedFees > 0) console.log(`[ECOLISA Migration] ${removedFees} type(s) de frais en double supprimé(s).`);
      } catch (e) {
        console.warn('[ECOLISA Migration] Nettoyage des frais en double :', e.message);
      }
    } catch (err) {
      console.warn('[ECOLISA Seeder] Remarque vérification DB :', err);
    }

    return true;
  } catch (err) {
    console.error('[ECOLISA Database Error] Erreur critique d’initialisation SQLite :', err);
    db = null;
    return false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  MAPPERS SQLite -> camelCase JS
// ─────────────────────────────────────────────────────────────────────────────
const jp = (v, fb='[]') => { try { return JSON.parse(v||fb); } catch { return JSON.parse(fb); } };

function mapUser(r) { return { id:r.id, email:r.email, nom:r.nom, prenom:r.prenom, role:r.role, pinCode:r.pin_code, avatarUrl:r.avatar_url, statut:r.statut, telephone:r.telephone, creeLe:r.cree_le, derniereConnexion:r.derniere_connexion }; }
function mapSalle(r) { return { id:r.id, codeSalle:r.code_salle, nomSalle:r.nom_salle, capacite:r.capacite||45, cycleCode:r.cycle_code, batiment:r.batiment, statut:r.statut||'DISPONIBLE' }; }
function mapYear(r) { return { id:r.id, nom:r.nom, statut:r.statut, debut:r.debut, fin:r.fin, nombreElevesTotal:r.nombre_eleves_total||0, fraisInscription:r.frais_inscription||0, fraisConnexion:r.frais_connexion||0, fraisReinscription:r.frais_reinscription||0, fraisCarte:r.frais_carte||0, fraisAnnexes:jp(r.frais_annexes_json), cycles:jp(r.cycles_json), options:jp(r.options_json), salles:jp(r.salles_json), semestres:jp(r.semestres_json), periodes:jp(r.periodes_json) }; }
function mapClass(r) { return { id:r.id, cycleId:r.cycle_id, schoolYearId:r.school_year_id, optionCode:r.option_code, salleCode:r.salle_code, nom:r.nom, salle:r.salle, nombreEleves:r.nombre_eleves||0, capacite:r.capacite||45, professeurTitulaire:r.professeur_titulaire }; }
function mapEleve(r) { const b={id:r.id,registrationNumber:r.registration_number,prenom:r.prenom,nom:r.nom,postnom:r.postnom,sexe:r.sexe,dateNaissance:r.date_naissance,lieuNaissance:r.lieu_naissance,classId:r.class_id,schoolYearId:r.school_year_id,statut:r.statut,photoUrl:r.photo_url,nomParent:r.nom_parent,...(r.contact_parent?{telephoneParent:r.contact_parent}:{}),adresse:r.adresse}; try{return{...b,...JSON.parse(r.data_json||'{}')};}catch{return b;} }
function mapInvoice(r) { const b={id:r.id,eleveId:r.eleve_id,schoolYearId:r.school_year_id,montantTotal:r.montant_total,montantPaye:r.montant_paye,statut:r.statut,dateEcheance:r.date_echeance}; try{return{...JSON.parse(r.data_json||'{}'),...b};}catch{return b;} }
function mapPayment(r) { const b={id:r.id,invoiceId:r.invoice_id,eleveId:r.eleve_id,montant:r.montant,methode:r.methode,datePaiement:r.date_paiement,recuNumero:r.recu_numero,encaissePar:r.encaisse_par}; try{return{...JSON.parse(r.data_json||'{}'),...b};}catch{return b;} }
function mapExpense(r) { const b={id:r.id,motif:r.motif,montant:r.montant,devise:r.devise||'USD',categorie:r.categorie,validePar:r.valide_par,date:r.date_depense,modePaiement:r.mode_paiement,pieceJustificative:r.piece_justificative,caissier:r.valide_par}; try{return{...JSON.parse(r.data_json||'{}'),...b};}catch{return b;} }
function mapBudget(r) { const b={id:r.id,schoolYearId:r.school_year_id,periode:r.periode,dateDebut:r.date_debut,dateFin:r.date_fin,categorie:r.categorie,type:r.type,montant:r.montant,devise:r.devise||'USD',note:r.note}; try{return{...JSON.parse(r.data_json||'{}'),...b};}catch{return b;} }
function mapStaffExpenseNote(r) { const b={id:r.id,staffId:r.staff_id,staffName:r.staff_name,schoolYearId:r.school_year_id,dateNote:r.date_note,categorie:r.categorie,description:r.description,montant:r.montant,devise:r.devise||'USD',justificatif:r.justificatif,statut:r.statut||'SOUMIS',validePar:r.valide_par,dateValidation:r.date_validation,commentaireValidation:r.commentaire_validation,montantRembourse:r.montant_rembourse,dateRemboursement:r.date_remboursement,modeRemboursement:r.mode_remboursement,referenceRemboursement:r.reference_remboursement,creePar:r.cree_par,dateCreation:r.date_creation}; try{return{...JSON.parse(r.data_json||'{}'),...b};}catch{return b;} }
function mapInvoiceSendingHistory(r) { const b={id:r.id,invoiceId:r.invoice_id,methode:r.methode,destinataire:r.destinataire,contact:r.contact,statut:r.statut||'SIMULE',dateEnvoi:r.date_envoi,message:r.message}; try{return{...JSON.parse(r.data_json||'{}'),...b};}catch{return b;} }
function mapStaff(r) { if (!r) return null; const b={id:r.id,nom:r.nom,prenom:r.prenom,role:r.role,telephone:r.telephone,email:r.email,salaireBase:r.salaire_base,devise:r.devise,statut:r.statut}; try{return{...b,...JSON.parse(r.data_json||'{}')};}catch{return b;} }
function mapFichePaie(r) { const b={id:r.id,staffId:r.staff_id,staffName:r.staff_name,staffMatricule:r.staff_matricule,staffRole:r.staff_role,staffFunction:r.staff_function,staffBankAccount:r.staff_bank_account,staffMobileMoney:r.staff_mobile_money,staffPaymentMode:r.staff_payment_mode,periode:r.periode,schoolYearId:r.school_year_id,anneeScolaire:r.annee_scolaire,salaireBase:r.salaire_base,devise:r.devise||'USD',heuresPrestees:r.heures_prestees,salaireBrut:r.salaire_brut,totalPrimes:r.total_primes,totalDeductions:r.total_deductions,totalAvances:r.total_avances,salaireNet:r.salaire_net,modePaiement:r.mode_paiement||'CASH',reference:r.reference,datePaiement:r.date_paiement,caissier:r.caissier,statut:r.statut||'BROUILLON',numeroFiche:r.numero_fiche,notes:r.notes,origineExpenseId:r.origine_expense_id}; try{return{...b,...JSON.parse(r.data_json||'{}')};}catch{return b;} }
function mapCote(r) { const b={id:r.id,eleveId:r.eleve_id,matiereId:r.matiere_id,classeId:r.classe_id,periode:r.periode,type:r.type,score:r.score,maxScore:r.max_score,dateCote:r.date_cote}; try{return{...JSON.parse(r.data_json||'{}'),...b};}catch{return b;} }
function mapPresence(r) { const b={id:r.id,eleveId:r.eleve_id,classeId:r.classe_id,dateJour:r.date_jour,statut:r.statut,motif:r.motif}; try{return{...JSON.parse(r.data_json||'{}'),...b};}catch{return b;} }
function mapSchoolEvent(r) { const b={id:r.id,titre:r.titre,subtitre:r.subtitre,dateDebut:r.date_debut,dateFin:r.date_fin,categorie:r.categorie,publicCible:r.public_cible,highlight:!!r.highlight}; try{return{...JSON.parse(r.data_json||'{}'),...b};}catch{return b;} }
function mapSubject(r) {
  if (!r) return null;
  const b = {
    id: r.id,
    code: r.code,
    nom: r.nom,
    coefficient: r.coefficient || 1,
    maxScore: r.max_score || 20,
    maxExamen: r.max_examen || ((r.max_score || 20) * 2),
    maxSemestre: r.max_semestre || ((r.max_score || 20) * 4),
    maxAnnuel: r.max_annuel || ((r.max_score || 20) * 8),
    categorie: r.categorie || 'GENERAL',
    cycleCode: r.cycle_code,
    optionCode: r.option_code,
    volumeHoraire: r.volume_horaire || 2,
    groupeMaternelle: r.groupe_maternelle,
    enseignantId: r.enseignant_id,
    enseignantNom: r.enseignant_nom
  };
  try {
    return { ...b, ...JSON.parse(r.data_json || '{}') };
  } catch {
    return b;
  }
}

function mapFeeType(r) { const b={id:r.id,code:r.code,nom:r.nom,categorie:r.categorie,montant:r.montant,devise:r.devise||'USD',obligatoire:!!r.obligatoire,portee:r.portee,schoolYearId:r.school_year_id,modePaiement:r.mode_paiement||'UNIQUE',nombreTranches:r.nombre_tranches||1}; try{return{...JSON.parse(r.data_json||'{}'),...b};}catch{return b;} }
function mapCashOp(r) { const b={id:r.id,date:r.date_operation,libelle:r.libelle,description:r.description,montant:r.montant,devise:r.devise||'USD',type:r.type,categorie:r.categorie,modePaiement:r.mode_paiement,reference:r.reference,caissier:r.caissier,pieceJustificative:r.piece_justificative,schoolYearId:r.school_year_id,origine:r.origine,origineId:r.origine_id}; try{return{...JSON.parse(r.data_json||'{}'),...b};}catch{return b;} }
function mapCompte(r) { return {id:r.id,code:r.code,nom:r.nom,type:r.type,parentId:r.parent_id,actif:!!r.actif}; }
function mapJournal(r) { return {id:r.id,code:r.code,nom:r.nom,type:r.type,actif:!!r.actif}; }
function mapEcriture(r) { const b={id:r.id,ecritureId:r.ecriture_id,journalId:r.journal_id,date:r.date_ecriture,reference:r.reference,libelle:r.libelle,compteId:r.compte_id,debit:r.debit,credit:r.credit,devise:r.devise||'USD',piece:r.piece}; try{return{...JSON.parse(r.data_json||'{}'),...b};}catch{return b;} }

/**
 * Supprime les factures en double pour le même élève/année/frais.
 * Garde la facture payée si elle existe, sinon la plus récente.
 * Supprime en cascade les paiements, opérations de caisse et écritures liés aux doublons.
 */
function cleanupDuplicateInvoices() {
  if (!db) return 0;
  const allInvoices = db.prepare('SELECT * FROM invoices').all().map(mapInvoice);
  const groups = new Map();

  allInvoices.forEach(inv => {
    const studentId = inv.eleveId || inv.studentId || '';
    const yearId = inv.schoolYearId || inv.anneeScolaireId || inv.anneeScolaire || '';
    const linesKey = (inv.lignes?.length)
      ? inv.lignes.map(l => `${l.feeTypeId}:${l.trancheId || ''}:${(l.montant || 0).toFixed(2)}:${l.devise || ''}`).sort().join('|')
      : `no-lines:${(inv.montantTotal || 0).toFixed(2)}:${inv.devise || ''}`;
    const key = `${studentId}::${yearId}::${linesKey}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(inv);
  });

  const toDelete = new Set();
  groups.forEach(group => {
    if (group.length < 2) return;

    const withPayments = [];
    const withoutPayments = [];
    group.forEach(inv => {
      const paymentCount = db.prepare('SELECT COUNT(*) as cnt FROM payments WHERE invoice_id=?').get(inv.id).cnt;
      const paymentsTotal = db.prepare('SELECT COALESCE(SUM(montant), 0) as total FROM payments WHERE invoice_id=?').get(inv.id).total || 0;
      if (paymentCount > 0 || paymentsTotal > 0.001 || (inv.montantPaye || 0) > 0.001) {
        withPayments.push(inv);
      } else {
        withoutPayments.push(inv);
      }
    });

    let keeper;
    if (withPayments.length > 0) {
      keeper = withPayments.sort((a, b) => {
        const paidDiff = (b.montantPaye || 0) - (a.montantPaye || 0);
        if (Math.abs(paidDiff) > 0.001) return paidDiff;
        return new Date(b.dateEcheance || 0).getTime() - new Date(a.dateEcheance || 0).getTime();
      })[0];
    } else {
      keeper = withoutPayments.sort((a, b) => new Date(b.dateEcheance || 0).getTime() - new Date(a.dateEcheance || 0).getTime())[0];
    }

    group.forEach(inv => {
      if (inv.id !== keeper.id) toDelete.add(inv.id);
    });
  });

  if (toDelete.size === 0) return 0;

  const tx = db.transaction(() => {
    toDelete.forEach(id => {
      const payments = db.prepare('SELECT id, recu_numero FROM payments WHERE invoice_id=?').all(id);
      const paymentIds = payments.map(p => p.id);
      const refs = new Set([...paymentIds, ...payments.map(p => p.recu_numero).filter(Boolean)]);

      for (const ref of refs) db.prepare('DELETE FROM ecritures WHERE reference=?').run(ref);
      for (const pid of paymentIds) db.prepare("DELETE FROM cash_operations WHERE origine='PAYMENT' AND origine_id=?").run(pid);

      db.prepare('DELETE FROM payments WHERE invoice_id=?').run(id);
      db.prepare('DELETE FROM invoices WHERE id=?').run(id);
    });
  });
  tx();
  console.log(`[ECOLISA Cleanup] ${toDelete.size} facture(s) doublon(s) supprimée(s).`);
  return toDelete.size;
}

/**
 * Normalise le nom d'un type de frais pour la détection de doublons :
 * retire les suffixes de portée/ciblage ("— Toute l'école", "(Tronc Commun)", etc.)
 * qui font qu'un même frais apparaît sous des libellés légèrement différents.
 */
function normalizeFeeName(nom) {
  return (nom || '')
    .toLowerCase()
    .replace(/\s*[—-]\s*toute\s+l.?[ée]cole.*$/i, '')
    .replace(/\s*\(tronc commun\)\s*/gi, '')
    .replace(/\s*[—-]\s*.+$/, '') // retire tout suffixe " — <cible>" restant
    .trim();
}

/**
 * Redirige toutes les références à un type de frais supprimé (lignes de
 * facture ET allocations de paiement) vers le type de frais conservé
 * ("keeper"), afin qu'un frais déjà payé ne réapparaisse jamais comme
 * impayé après une fusion de doublons. Les tranches sont réassociées par
 * ordre puis par nom si les identifiants de tranche diffèrent entre les
 * deux définitions.
 */
function remapFeeTypeReferences(oldId, keeper) {
  if (!db || !oldId || oldId === keeper.id) return;

  const oldFt = db.prepare('SELECT * FROM fee_types WHERE id=?').get(oldId);
  const oldTranches = oldFt ? (mapFeeType(oldFt).tranches || []) : [];
  const keeperTranches = keeper.tranches || [];
  const trancheMap = new Map();
  oldTranches.forEach(ot => {
    let match = keeperTranches.find(kt => kt.ordre === ot.ordre);
    if (!match) match = keeperTranches.find(kt => (kt.nom || '').toLowerCase().trim() === (ot.nom || '').toLowerCase().trim());
    if (match) trancheMap.set(ot.id, match.id);
  });
  const remapTranche = (trancheId) => (trancheId ? (trancheMap.get(trancheId) || trancheId) : trancheId);

  const invoices = db.prepare('SELECT id, data_json FROM invoices').all();
  const updateInvoiceStmt = db.prepare('UPDATE invoices SET data_json=? WHERE id=?');
  invoices.forEach(inv => {
    let data;
    try { data = JSON.parse(inv.data_json || '{}'); } catch { return; }
    if (!Array.isArray(data.lignes) || data.lignes.length === 0) return;
    let changed = false;
    data.lignes = data.lignes.map(l => {
      if (l.feeTypeId === oldId) {
        changed = true;
        return { ...l, feeTypeId: keeper.id, trancheId: remapTranche(l.trancheId) };
      }
      return l;
    });
    if (changed) updateInvoiceStmt.run(JSON.stringify(data), inv.id);
  });

  const payments = db.prepare('SELECT id, data_json FROM payments').all();
  const updatePaymentStmt = db.prepare('UPDATE payments SET data_json=? WHERE id=?');
  payments.forEach(p => {
    let data;
    try { data = JSON.parse(p.data_json || '{}'); } catch { return; }
    if (!Array.isArray(data.allocations) || data.allocations.length === 0) return;
    let changed = false;
    data.allocations = data.allocations.map(a => {
      if (a.feeTypeId === oldId) {
        changed = true;
        return { ...a, feeTypeId: keeper.id, trancheId: remapTranche(a.trancheId) };
      }
      return a;
    });
    if (changed) updatePaymentStmt.run(JSON.stringify(data), p.id);
  });
}

/**
 * Répare les lignes de facture / allocations de paiement dont le feeTypeId
 * ne correspond plus à aucun type de frais existant (ex: doublon supprimé
 * par une exécution antérieure de cleanupDuplicateFeeTypes, avant que le
 * remapping automatique n'existe). On tente de retrouver le type de frais
 * correspondant pour la même année via le nom normalisé de la ligne.
 */
function repairOrphanedFeeReferences() {
  if (!db) return 0;
  const allFeeTypes = db.prepare('SELECT * FROM fee_types').all().map(mapFeeType);
  const feeTypeIds = new Set(allFeeTypes.map(ft => ft.id));
  if (feeTypeIds.size === 0) return 0;

  // Compare deux montants en tolérant les écarts d'échelle USD/CDF classiques
  // de l'application (1, ×2850, ÷2850), et renvoie le meilleur ratio (1 = identique).
  const montantMatchRatio = (a, b) => {
    if (!a || !b) return 0;
    const factors = [1, 2850, 1 / 2850];
    let best = 0;
    for (const f of factors) {
      const scaled = a * f;
      const ratio = Math.min(scaled, b) / Math.max(scaled, b);
      if (ratio > best) best = ratio;
    }
    return best;
  };

  const findReplacement = (lineName, lineMontant, yearId) => {
    const rawName = lineName || '';
    const [namePrefix, ...suffixParts] = rawName.split(' — ');
    const suffix = suffixParts.join(' — ').toLowerCase().trim();
    const normalizedLineName = normalizeFeeName(namePrefix);
    if (!normalizedLineName) return null;
    const candidates = allFeeTypes.filter(ft =>
      (ft.schoolYearId || ft.anneeScolaireId || '') === (yearId || '') &&
      normalizeFeeName(ft.nom) === normalizedLineName
    );
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    // Si le libellé de la ligne contient un suffixe de portée (ex: "— Cycle
    // Primaire (1ère – 6ème) (Tronc Commun)"), on tente d'abord de retrouver
    // le frais dont la portée correspond exactement à ce suffixe : c'est un
    // identifiant bien plus fiable que le montant pour désambiguïser.
    if (suffix) {
      const byPortee = candidates.filter(ft => (ft.portee || '').toLowerCase().trim() === suffix);
      if (byPortee.length === 1) return byPortee[0];
    }

    // Sinon, plusieurs frais partagent le même nom pour cette année (ex:
    // "Uniforme Scolaire" par cycle) : on ne remappe que si un candidat se
    // distingue clairement par son montant, pour éviter d'attacher le
    // paiement au mauvais frais (et de faire réapparaître le bon comme impayé).
    const scored = candidates
      .map(ft => ({ ft, ratio: montantMatchRatio(lineMontant, ft.montant) }))
      .sort((a, b) => b.ratio - a.ratio);
    if (scored[0].ratio >= 0.9 && (scored.length === 1 || scored[0].ratio - scored[1].ratio >= 0.05)) {
      return scored[0].ft;
    }
    return null;
  };

  let repairedCount = 0;
  const resolvedMap = new Map(); // oldFeeTypeId -> replacement fee type id (réutilisé pour les paiements)
  const invoices = db.prepare('SELECT id, data_json FROM invoices').all();
  const updateInvoiceStmt = db.prepare('UPDATE invoices SET data_json=? WHERE id=?');
  invoices.forEach(inv => {
    let data;
    try { data = JSON.parse(inv.data_json || '{}'); } catch { return; }
    if (!Array.isArray(data.lignes) || data.lignes.length === 0) return;
    const yearId = data.schoolYearId || data.anneeScolaireId || '';
    let changed = false;
    data.lignes = data.lignes.map(l => {
      if (l.feeTypeId && !feeTypeIds.has(l.feeTypeId)) {
        const replacement = findReplacement(l.nom, l.montant, yearId);
        if (replacement) {
          changed = true;
          repairedCount++;
          resolvedMap.set(l.feeTypeId, replacement.id);
          return { ...l, feeTypeId: replacement.id };
        }
      }
      return l;
    });
    if (changed) updateInvoiceStmt.run(JSON.stringify(data), inv.id);
  });

  const payments = db.prepare('SELECT id, data_json FROM payments').all();
  const updatePaymentStmt = db.prepare('UPDATE payments SET data_json=? WHERE id=?');
  payments.forEach(p => {
    let data;
    try { data = JSON.parse(p.data_json || '{}'); } catch { return; }
    if (!Array.isArray(data.allocations) || data.allocations.length === 0) return;
    let changed = false;
    data.allocations = data.allocations.map(a => {
      if (a.feeTypeId && !feeTypeIds.has(a.feeTypeId) && resolvedMap.has(a.feeTypeId)) {
        changed = true;
        return { ...a, feeTypeId: resolvedMap.get(a.feeTypeId) };
      }
      return a;
    });
    if (changed) updatePaymentStmt.run(JSON.stringify(data), p.id);
  });

  return repairedCount;
}

/**
 * Supprime les types de frais en double pour la même année scolaire : un même
 * frais (même nom normalisé, même montant, même devise, même mode de paiement)
 * ne doit exister qu'une seule fois, même s'il a été créé plusieurs fois avec
 * des portées différentes (ex: "Tricot" pour une classe ET "Tricot — Toute
 * l'école" pour toute l'école). On garde en priorité le frais déjà utilisé
 * dans une facture, sinon celui dont la portée est la plus spécifique, sinon
 * le plus récent. Toutes les factures/paiements référençant un doublon
 * supprimé sont automatiquement redirigés vers le frais conservé, pour ne
 * jamais perdre l'historique de paiement d'un frais déjà réglé.
 */
function cleanupDuplicateFeeTypes() {
  if (!db) return 0;
  const allFeeTypes = db.prepare('SELECT * FROM fee_types').all().map(mapFeeType);
  const allInvoicesJson = db.prepare('SELECT data_json FROM invoices').all().map(r => r.data_json || '');

  const usageCount = (feeTypeId) => {
    let count = 0;
    for (const json of allInvoicesJson) {
      if (json.includes(`"feeTypeId":"${feeTypeId}"`)) count++;
    }
    return count;
  };

  const groups = new Map();
  allFeeTypes.forEach(ft => {
    const yearId = ft.schoolYearId || ft.anneeScolaireId || '';
    const normalizedName = normalizeFeeName(ft.nom);
    if (!normalizedName) return;
    const key = `${yearId}::${normalizedName}::${(ft.montant || 0).toFixed(2)}::${ft.devise || ''}::${ft.modePaiement || 'UNIQUE'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(ft);
  });

  const toDelete = new Set();
  const remaps = []; // { oldId, keeper }
  groups.forEach(group => {
    if (group.length < 2) return;

    const scored = group.map(ft => ({
      ft,
      usage: usageCount(ft.id),
      isGeneric: /toute\s+l.?[ée]cole/i.test(ft.portee || ''),
    }));

    scored.sort((a, b) => {
      if (a.usage !== b.usage) return b.usage - a.usage;
      if (a.isGeneric !== b.isGeneric) return a.isGeneric ? 1 : -1;
      return 0;
    });

    const keeper = scored[0].ft;
    group.forEach(ft => {
      if (ft.id !== keeper.id) {
        toDelete.add(ft.id);
        remaps.push({ oldId: ft.id, keeper });
      }
    });
  });

  if (toDelete.size === 0) return 0;

  const tx = db.transaction(() => {
    remaps.forEach(({ oldId, keeper }) => remapFeeTypeReferences(oldId, keeper));
    toDelete.forEach(id => db.prepare('DELETE FROM fee_types WHERE id=?').run(id));
  });
  tx();
  console.log(`[ECOLISA Cleanup] ${toDelete.size} type(s) de frais doublon(s) supprimé(s) (historique de paiement conservé).`);
  return toDelete.size;
}

function mapStudentDocument(r) {
  const b = {
    id: r.id,
    eleveId: r.eleve_id,
    fileName: r.file_name,
    originalName: r.original_name,
    mimeType: r.mime_type,
    category: r.category,
    sizeBytes: r.size_bytes || 0,
    storagePath: r.storage_path,
    isArchive: !!r.is_archive,
    archiveCount: r.archive_count || 0,
    createdAt: r.created_at
  };
  try { return { ...JSON.parse(r.data_json || '{}'), ...b }; } catch { return b; }
}

function getDocumentsBase() {
  const base = path.join(app.getPath('userData'), 'student_documents');
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  return base;
}

function sanitizeFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_');
}

function getMimeFromName(name) {
  const ext = path.extname(name).toLowerCase();
  const map = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.zip': 'application/zip', '.tar': 'application/x-tar', '.gz': 'application/gzip',
    '.tgz': 'application/gzip', '.7z': 'application/x-7z-compressed', '.rar': 'application/vnd.rar',
    '.txt': 'text/plain', '.csv': 'text/csv', '.json': 'application/json',
    '.xml': 'application/xml', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo', '.mov': 'video/quicktime'
  };
  return map[ext] || 'application/octet-stream';
}

function formatSize(bytes) {
  if (bytes === 0) return '0 o';
  const k = 1024;
  const sizes = ['o', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const ALLOWED_DOC_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'tif', 'svg']);
const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'tif']);

function fileExtension(name) {
  return (path.extname(name).toLowerCase() || '').replace(/^\./, '');
}

function isAllowedDocumentFile(filePath) {
  return ALLOWED_DOC_EXTENSIONS.has(fileExtension(filePath));
}

function isAllowedImageFile(filePath) {
  return ALLOWED_IMAGE_EXTENSIONS.has(fileExtension(filePath));
}

function dosDateTime(d) {
  const year = Math.max(0, d.getFullYear() - 1980) & 0x7f;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours();
  const minute = d.getMinutes();
  const second = d.getSeconds();
  const date = (year << 9) | (month << 5) | day;
  const time = (hour << 11) | (minute << 5) | (second >> 1);
  return { date, time };
}

function buildZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const now = new Date();
  const dt = dosDateTime(now);

  for (const e of entries) {
    const data = e.data;
    const compressed = zlib.deflateRawSync(data);
    const crc = zlib.crc32(data);
    const nameBuf = Buffer.from(e.name, 'utf8');
    const utf8Flag = 0x0800;
    const versionNeeded = 20;
    const compressionMethod = 8;

    const lfh = Buffer.alloc(30 + nameBuf.length);
    lfh.writeUInt32LE(0x04034b50, 0);
    lfh.writeUInt16LE(versionNeeded, 4);
    lfh.writeUInt16LE(utf8Flag, 6);
    lfh.writeUInt16LE(compressionMethod, 8);
    lfh.writeUInt16LE(dt.time, 10);
    lfh.writeUInt16LE(dt.date, 12);
    lfh.writeUInt32LE(crc, 14);
    lfh.writeUInt32LE(compressed.length, 18);
    lfh.writeUInt32LE(data.length, 22);
    lfh.writeUInt16LE(nameBuf.length, 26);
    lfh.writeUInt16LE(0, 28);
    nameBuf.copy(lfh, 30);

    localParts.push(lfh, compressed);

    const cdh = Buffer.alloc(46 + nameBuf.length);
    cdh.writeUInt32LE(0x02014b50, 0);
    cdh.writeUInt16LE(0x0314, 4);
    cdh.writeUInt16LE(versionNeeded, 6);
    cdh.writeUInt16LE(utf8Flag, 8);
    cdh.writeUInt16LE(compressionMethod, 10);
    cdh.writeUInt16LE(dt.time, 12);
    cdh.writeUInt16LE(dt.date, 14);
    cdh.writeUInt32LE(crc, 16);
    cdh.writeUInt32LE(compressed.length, 20);
    cdh.writeUInt32LE(data.length, 24);
    cdh.writeUInt16LE(nameBuf.length, 28);
    cdh.writeUInt16LE(0, 30);
    cdh.writeUInt16LE(0, 32);
    cdh.writeUInt16LE(0, 34);
    cdh.writeUInt16LE(0, 36);
    cdh.writeUInt32LE(0, 38);
    cdh.writeUInt32LE(offset, 42);
    nameBuf.copy(cdh, 46);

    centralParts.push(cdh);
    offset += lfh.length + compressed.length;
  }

  const centralOffset = offset;
  const centralBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralBuf, eocd]);
}

function listFilesRecursive(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full, base));
    else out.push({ fullPath: full, relPath: path.relative(base, full).replace(/[\\/]/g, '/') });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
//  ENREGISTREMENT DES HANDLERS IPC (TOUJOURS AVANT CREATEWINDOW)
// ─────────────────────────────────────────────────────────────────────────────
function registerIpcHandlers() {
  // Fenetre
  ipcMain.on('window-minimize', () => { if (mainWindow) mainWindow.minimize(); });
  ipcMain.on('window-maximize', () => { if (!mainWindow) return; if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); });
  ipcMain.on('window-close', () => { if (mainWindow) mainWindow.close(); });
  ipcMain.handle('window-is-maximized', () => mainWindow ? mainWindow.isMaximized() : false);
  ipcMain.handle('get-hwid', () => 'HWID-ECOLISA-' + os.hostname().toUpperCase());

  // App Config
  ipcMain.handle('db-get-config', (_, key) => { if (!db) return null; const r=db.prepare('SELECT value FROM app_config WHERE key=?').get(key); if(!r) return null; try{return JSON.parse(r.value);}catch{return r.value;} });
  ipcMain.handle('db-set-config', (_, key, value) => { if (!db) return false; db.prepare('INSERT OR REPLACE INTO app_config (key,value) VALUES (?,?)').run(key, JSON.stringify(value)); return true; });
  ipcMain.handle('db-delete-config', (_, key) => { if (!db) return false; db.prepare('DELETE FROM app_config WHERE key=?').run(key); return true; });
  ipcMain.handle('db-get-all-config', () => { if (!db) return {}; const rows=db.prepare('SELECT key,value FROM app_config').all(); const out={}; rows.forEach(r=>{ try{out[r.key]=JSON.parse(r.value);}catch{out[r.key]=r.value;} }); return out; });

  // Session
  ipcMain.handle('db-get-current-session', () => { if (!db) return null; const r=db.prepare('SELECT user_json FROM current_session WHERE id=1').get(); if(!r||!r.user_json) return null; try{return JSON.parse(r.user_json);}catch{return null;} });
  ipcMain.handle('db-set-current-session', (_, sess) => { if (!db) return false; if(sess){db.prepare('INSERT OR REPLACE INTO current_session (id,user_json) VALUES (1,?)').run(JSON.stringify(sess)); if(sess.id) db.prepare("UPDATE users SET derniere_connexion=datetime('now') WHERE id=?").run(sess.id);} else {db.prepare('DELETE FROM current_session WHERE id=1').run();} return true; });

  // Users
  ipcMain.handle('db-get-users', () => { if (!db) return []; return db.prepare('SELECT * FROM users ORDER BY cree_le ASC').all().map(mapUser); });
  ipcMain.handle('db-get-user-by-email', (_, email) => { if (!db) return null; const r=db.prepare("SELECT * FROM users WHERE LOWER(email)=LOWER(?) AND statut='ACTIF'").get(email); return r?mapUser(r):null; });

  // Ajout utilisateur — le mot de passe est haché côté serveur (main process)
  ipcMain.handle('db-add-user', (_, u) => {
    if (!db) return null;
    const passwordHash = u.password ? hashPassword(u.password) : null;
    db.prepare('INSERT OR REPLACE INTO users (id,email,nom,prenom,role,pin_code,password_hash,avatar_url,statut,telephone,cree_le) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(
      u.id, u.email, u.nom, u.prenom||null, u.role, u.pinCode||null, passwordHash,
      u.avatarUrl||null, u.statut||'ACTIF', u.telephone||null,
      u.creeLe||new Date().toISOString().split('T')[0]
    );
    return mapUser(db.prepare('SELECT * FROM users WHERE id=?').get(u.id));
  });

  // Mise à jour utilisateur (supporte le changement de mot de passe)
  ipcMain.handle('db-update-user', (_, id, upd) => {
    if (!db) return null;
    const f=[], v=[];
    if (upd.nom!==undefined)       { f.push('nom=?');           v.push(upd.nom); }
    if (upd.prenom!==undefined)    { f.push('prenom=?');        v.push(upd.prenom); }
    if (upd.email!==undefined)     { f.push('email=?');         v.push(upd.email); }
    if (upd.role!==undefined)      { f.push('role=?');          v.push(upd.role); }
    if (upd.pinCode!==undefined)   { f.push('pin_code=?');      v.push(upd.pinCode); }
    if (upd.statut!==undefined)    { f.push('statut=?');        v.push(upd.statut); }
    if (upd.telephone!==undefined) { f.push('telephone=?');     v.push(upd.telephone); }
    if (upd.password)              { f.push('password_hash=?'); v.push(hashPassword(upd.password)); }
    if (!f.length) return null;
    v.push(id);
    db.prepare(`UPDATE users SET ${f.join(',')} WHERE id=?`).run(...v);
    return mapUser(db.prepare('SELECT * FROM users WHERE id=?').get(id));
  });

  ipcMain.handle('db-delete-user', (_, id) => { if (!db) return false; db.prepare('DELETE FROM users WHERE id=?').run(id); return true; });

  // Verification des identifiants — Mot de passe prioritaire & PIN de secours
  ipcMain.handle('db-verify-credentials', (_, identifier, password) => {
    if (!db) return null;
    const cleanId = String(identifier || '').trim();
    const cleanPwd = String(password || '').trim();
    const cleanDigits = cleanId.replace(/[^0-9]/g, '');

    let r = db.prepare("SELECT * FROM users WHERE (LOWER(email)=LOWER(?) OR id=?) AND statut='ACTIF'").get(cleanId, cleanId);
    if (!r && cleanDigits.length >= 6) {
      r = db.prepare("SELECT * FROM users WHERE replace(replace(replace(telephone,' ',''),'+',''),'-','') LIKE ? AND statut='ACTIF'").get(`%${cleanDigits}%`);
    }

    if (!r) {
      // Égaliser le temps de réponse (anti-enumeration)
      try { scryptSync(cleanPwd + 'fake_work', randomBytes(32).toString('hex'), 64); } catch {}
      return null;
    }

    // 1. Vérification par mot de passe sécurisé (Hash scrypt)
    let isPassMatch = false;
    if (r.password_hash) {
      try {
        isPassMatch = verifyPassword(cleanPwd, r.password_hash);
      } catch {
        isPassMatch = false;
      }
    }

    // 2. Vérification par code PIN (secours / accès rapide)
    const isPinMatch = r.pin_code && (r.pin_code === cleanPwd);

    // 3. Cas de migration : si le compte n'avait pas encore de mot de passe haché
    //    et que l'utilisateur saisit son PIN ou son mot de passe initial, on met à jour son hash
    if (!isPassMatch && !r.password_hash && isPinMatch) {
      isPassMatch = true;
      try {
        db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(cleanPwd), r.id);
      } catch {}
    }

    if (!isPassMatch && !isPinMatch) {
      return null;
    }

    // Mise à jour de la dernière connexion
    try {
      db.prepare("UPDATE users SET derniere_connexion=datetime('now') WHERE id=?").run(r.id);
    } catch {}

    return mapUser(r);
  });

  // School Years
  ipcMain.handle('db-get-school-years', () => { if (!db) return []; return db.prepare('SELECT * FROM school_years ORDER BY debut DESC').all().map(mapYear); });
  ipcMain.handle('db-get-school-year', (_, id) => { if (!db) return null; const r=db.prepare('SELECT * FROM school_years WHERE id=?').get(id); return r?mapYear(r):null; });
  ipcMain.handle('db-add-school-year', (_, y) => { if (!db) return null; db.prepare('INSERT OR REPLACE INTO school_years (id,nom,statut,debut,fin,nombre_eleves_total,frais_inscription,frais_connexion,frais_reinscription,frais_carte,frais_annexes_json,cycles_json,options_json,salles_json,semestres_json,periodes_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(y.id,y.nom,y.statut||'EN_COURS',y.debut||'',y.fin||'',y.nombreElevesTotal||0,y.fraisInscription||0,y.fraisConnexion||0,y.fraisReinscription||0,y.fraisCarte||0,JSON.stringify(y.fraisAnnexes||[]),JSON.stringify(y.cycles||[]),JSON.stringify(y.options||[]),JSON.stringify(y.salles||[]),JSON.stringify(y.semestres||[]),JSON.stringify(y.periodes||[])); return mapYear(db.prepare('SELECT * FROM school_years WHERE id=?').get(y.id)); });
  ipcMain.handle('db-update-school-year', (_, id, upd) => { if (!db) return null; const r=db.prepare('SELECT * FROM school_years WHERE id=?').get(id); if(!r) return null; const m={...mapYear(r),...upd}; db.prepare('UPDATE school_years SET nom=?,statut=?,debut=?,fin=?,nombre_eleves_total=?,frais_inscription=?,frais_connexion=?,frais_reinscription=?,frais_carte=?,frais_annexes_json=?,cycles_json=?,options_json=?,salles_json=?,semestres_json=?,periodes_json=? WHERE id=?').run(m.nom,m.statut,m.debut,m.fin,m.nombreElevesTotal||0,m.fraisInscription||0,m.fraisConnexion||0,m.fraisReinscription||0,m.fraisCarte||0,JSON.stringify(m.fraisAnnexes||[]),JSON.stringify(m.cycles||[]),JSON.stringify(m.options||[]),JSON.stringify(m.salles||[]),JSON.stringify(m.semestres||[]),JSON.stringify(m.periodes||[]),id); return mapYear(db.prepare('SELECT * FROM school_years WHERE id=?').get(id)); });
  ipcMain.handle('db-delete-school-year', (_, id) => { if (!db) return false; db.prepare('DELETE FROM school_years WHERE id=?').run(id); return true; });

  // Classes
  ipcMain.handle('db-get-classes', (_, yearId) => { if (!db) return []; if (yearId) return db.prepare('SELECT * FROM classes WHERE school_year_id=? ORDER BY nom').all(yearId).map(mapClass); return db.prepare('SELECT * FROM classes ORDER BY nom').all().map(mapClass); });
  ipcMain.handle('db-add-class', (_, c) => { if (!db) return null; db.prepare('INSERT OR REPLACE INTO classes (id,cycle_id,school_year_id,option_code,salle_code,nom,salle,nombre_eleves,capacite,professeur_titulaire) VALUES (?,?,?,?,?,?,?,?,?,?)').run(c.id,c.cycleId||null,c.schoolYearId||null,c.optionCode||null,c.salleCode||null,c.nom,c.salle||null,c.nombreEleves||0,c.capacite||45,c.professeurTitulaire||null); return mapClass(db.prepare('SELECT * FROM classes WHERE id=?').get(c.id)); });
  ipcMain.handle('db-update-class', (_, id, upd) => { if (!db) return null; const f=[],v=[]; if(upd.nom!==undefined){f.push('nom=?');v.push(upd.nom);} if(upd.salle!==undefined){f.push('salle=?');v.push(upd.salle);} if(upd.salleCode!==undefined){f.push('salle_code=?');v.push(upd.salleCode);} if(upd.optionCode!==undefined){f.push('option_code=?');v.push(upd.optionCode);} if(upd.cycleId!==undefined){f.push('cycle_id=?');v.push(upd.cycleId);} if(upd.schoolYearId!==undefined){f.push('school_year_id=?');v.push(upd.schoolYearId);} if(upd.nombreEleves!==undefined){f.push('nombre_eleves=?');v.push(upd.nombreEleves);} if(upd.capacite!==undefined){f.push('capacite=?');v.push(upd.capacite);} if(upd.professeurTitulaire!==undefined){f.push('professeur_titulaire=?');v.push(upd.professeurTitulaire);} if(!f.length) return null; v.push(id); db.prepare(`UPDATE classes SET ${f.join(',')} WHERE id=?`).run(...v); return mapClass(db.prepare('SELECT * FROM classes WHERE id=?').get(id)); });
  ipcMain.handle('db-delete-class', (_, id) => { if (!db) return false; db.prepare('DELETE FROM classes WHERE id=?').run(id); return true; });

  // Salles Physiques
  ipcMain.handle('db-get-salles', (_, cycleCode) => { if (!db) return []; if (cycleCode) return db.prepare('SELECT * FROM salles WHERE cycle_code=? ORDER BY nom_salle').all(cycleCode).map(mapSalle); return db.prepare('SELECT * FROM salles ORDER BY nom_salle').all().map(mapSalle); });
  ipcMain.handle('db-add-salle', (_, s) => { if (!db) return null; db.prepare('INSERT OR REPLACE INTO salles (id,code_salle,nom_salle,capacite,cycle_code,batiment,statut) VALUES (?,?,?,?,?,?,?)').run(s.id, s.codeSalle||s.id, s.nomSalle, s.capacite||45, s.cycleCode||null, s.batiment||null, s.statut||'DISPONIBLE'); return mapSalle(db.prepare('SELECT * FROM salles WHERE id=?').get(s.id)); });
  ipcMain.handle('db-update-salle', (_, id, upd) => { if (!db) return null; const r=db.prepare('SELECT * FROM salles WHERE id=?').get(id); if(!r) return null; const f=[],v=[]; if(upd.codeSalle!==undefined){f.push('code_salle=?');v.push(upd.codeSalle);} if(upd.nomSalle!==undefined){f.push('nom_salle=?');v.push(upd.nomSalle);} if(upd.capacite!==undefined){f.push('capacite=?');v.push(upd.capacite);} if(upd.cycleCode!==undefined){f.push('cycle_code=?');v.push(upd.cycleCode);} if(upd.batiment!==undefined){f.push('batiment=?');v.push(upd.batiment);} if(upd.statut!==undefined){f.push('statut=?');v.push(upd.statut);} if(!f.length) return mapSalle(r); v.push(id); db.prepare(`UPDATE salles SET ${f.join(',')} WHERE id=?`).run(...v); return mapSalle(db.prepare('SELECT * FROM salles WHERE id=?').get(id)); });
  ipcMain.handle('db-delete-salle', (_, id) => { if (!db) return false; db.prepare('DELETE FROM salles WHERE id=?').run(id); return true; });

  // Subjects
  ipcMain.handle('db-get-subjects', () => {
    if (!db) return [];
    return db.prepare('SELECT * FROM subjects ORDER BY nom').all().map(mapSubject);
  });
  ipcMain.handle('db-add-subject', (_, s) => {
    if (!db) return null;
    const dataJson = JSON.stringify(s);
    db.prepare('INSERT OR REPLACE INTO subjects (id,code,nom,coefficient,max_score,categorie,max_examen,max_semestre,max_annuel,cycle_code,option_code,volume_horaire,groupe_maternelle,enseignant_id,enseignant_nom,data_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(
        s.id,
        s.code,
        s.nom,
        s.coefficient || 1,
        s.maxScore || 20,
        s.categorie || 'GENERAL',
        s.maxExamen || ((s.maxScore || 20) * 2),
        s.maxSemestre || ((s.maxScore || 20) * 4),
        s.maxAnnuel || ((s.maxScore || 20) * 8),
        s.cycleCode || null,
        s.optionCode || null,
        s.volumeHoraire || 2,
        s.groupeMaternelle || null,
        s.enseignantId || null,
        s.enseignantNom || null,
        dataJson
      );
    return mapSubject(db.prepare('SELECT * FROM subjects WHERE id=?').get(s.id));
  });
  ipcMain.handle('db-update-subject', (_, id, upd) => {
    if (!db) return null;
    const r = db.prepare('SELECT * FROM subjects WHERE id=?').get(id);
    if (!r) return null;
    const existingObj = mapSubject(r) || {};
    const merged = { ...existingObj, ...upd, id };
    const dataJson = JSON.stringify(merged);
    db.prepare('INSERT OR REPLACE INTO subjects (id,code,nom,coefficient,max_score,categorie,max_examen,max_semestre,max_annuel,cycle_code,option_code,volume_horaire,groupe_maternelle,enseignant_id,enseignant_nom,data_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(
        merged.id,
        merged.code,
        merged.nom,
        merged.coefficient || 1,
        merged.maxScore || 20,
        merged.categorie || 'GENERAL',
        merged.maxExamen || ((merged.maxScore || 20) * 2),
        merged.maxSemestre || ((merged.maxScore || 20) * 4),
        merged.maxAnnuel || ((merged.maxScore || 20) * 8),
        merged.cycleCode || null,
        merged.optionCode || null,
        merged.volumeHoraire || 2,
        merged.groupeMaternelle || null,
        merged.enseignantId || null,
        merged.enseignantNom || null,
        dataJson
      );
    return mapSubject(db.prepare('SELECT * FROM subjects WHERE id=?').get(id));
  });
  ipcMain.handle('db-delete-subject', (_, id) => {
    if (!db) return false;
    db.prepare('DELETE FROM subjects WHERE id=?').run(id);
    return true;
  });

  // Eleves
  ipcMain.handle('db-get-eleves', (_, filters) => {
    if (!db) return [];
    let q='SELECT * FROM eleves', p=[];
    if (filters?.classId) {
      q+=' WHERE class_id=?'; p.push(filters.classId);
    } else if (filters?.schoolYearId) {
      // Résoudre le nom de l'année en id (l'appelant peut passer l'un ou l'autre)
      const year = db.prepare('SELECT id FROM school_years WHERE id=? OR nom=?').get(filters.schoolYearId, filters.schoolYearId);
      q+=' WHERE school_year_id=?'; p.push(year?.id || filters.schoolYearId);
    }
    q+=' ORDER BY nom,prenom';
    return db.prepare(q).all(...p).map(mapEleve);
  });
  ipcMain.handle('db-add-eleve', (_, e) => {
    if (!db) return null;
    try {
      db.prepare('INSERT OR REPLACE INTO eleves (id,registration_number,prenom,nom,postnom,sexe,date_naissance,lieu_naissance,class_id,school_year_id,statut,photo_url,nom_parent,contact_parent,adresse,data_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .run(e.id, e.registrationNumber||null, e.prenom, e.nom, e.postnom||null, e.sexe||'M', e.dateNaissance||null, e.lieuNaissance||null, e.classId||null, e.schoolYearId||null, e.statut||'ACTIF', e.photoUrl||null, e.nomParent||null, e.telephoneParent||null, e.adressePhysique||e.adresse||null, JSON.stringify(e));
      if (e.classId) db.prepare('UPDATE classes SET nombre_eleves=nombre_eleves+1 WHERE id=?').run(e.classId);
      return mapEleve(db.prepare('SELECT * FROM eleves WHERE id=?').get(e.id));
    } catch (err) {
      console.error('[DB SQLite] db-add-eleve ERROR:', err.message, err.stack);
      console.error('[DB SQLite] db-add-eleve PAYLOAD:', JSON.stringify(e, null, 2));
      return null;
    }
  });
  ipcMain.handle('db-update-eleve', (_, id, upd) => {
    if (!db) return null;
    try {
      const r = db.prepare('SELECT * FROM eleves WHERE id=?').get(id);
      if (!r) return null;
      const m = { ...mapEleve(r), ...upd };
      // Handle class change: update student counts
      const oldClassId = r.class_id;
      const newClassId = m.classId || null;
      if (oldClassId !== newClassId) {
        if (oldClassId) db.prepare('UPDATE classes SET nombre_eleves=MAX(0,nombre_eleves-1) WHERE id=?').run(oldClassId);
        if (newClassId) db.prepare('UPDATE classes SET nombre_eleves=nombre_eleves+1 WHERE id=?').run(newClassId);
      }
      db.prepare('UPDATE eleves SET registration_number=?,prenom=?,nom=?,postnom=?,sexe=?,date_naissance=?,lieu_naissance=?,class_id=?,school_year_id=?,statut=?,photo_url=?,nom_parent=?,contact_parent=?,adresse=?,data_json=? WHERE id=?')
        .run(m.registrationNumber||r.registration_number, m.prenom, m.nom, m.postnom||null, m.sexe||'M', m.dateNaissance||null, m.lieuNaissance||null, newClassId, m.schoolYearId||null, m.statut||'ACTIF', m.photoUrl||null, m.nomParent||null, m.telephoneParent||null, m.adressePhysique||m.adresse||null, JSON.stringify(m), id);
      return mapEleve(db.prepare('SELECT * FROM eleves WHERE id=?').get(id));
    } catch (e) {
      console.error('[db-update-eleve] Erreur mise à jour élève :', e);
      return null;
    }
  });
  ipcMain.handle('db-delete-eleve', (_, id) => { if (!db) return false; const r=db.prepare('SELECT class_id FROM eleves WHERE id=?').get(id); db.prepare('DELETE FROM eleves WHERE id=?').run(id); if(r?.class_id) db.prepare('UPDATE classes SET nombre_eleves=MAX(0,nombre_eleves-1) WHERE id=?').run(r.class_id); return true; });

  // Finances
  ipcMain.handle('db-get-invoices', (_, yearId) => { if (!db) return []; if(yearId) return db.prepare('SELECT * FROM invoices WHERE school_year_id=? ORDER BY date_echeance DESC').all(yearId).map(mapInvoice); return db.prepare('SELECT * FROM invoices ORDER BY date_echeance DESC').all().map(mapInvoice); });
  ipcMain.handle('db-add-invoice', (_, inv) => {
    if (!db) return null;
    const lignes = Array.isArray(inv.lignes) ? inv.lignes : [];
    const total = lignes.reduce((a, l) => a + (l.montant || 0), 0);
    db.prepare('INSERT OR REPLACE INTO invoices (id,eleve_id,school_year_id,montant_total,montant_paye,statut,date_echeance,data_json) VALUES (?,?,?,?,?,?,?,?)').run(inv.id,inv.eleveId||inv.studentId||null,inv.anneeScolaireId||inv.schoolYearId||null,total||inv.montantTotal||0,inv.montantPaye||0,inv.statut||'NON_PAYE',inv.dateEcheance||null,JSON.stringify({...inv, montantTotal: total||inv.montantTotal||0, eleveId: inv.eleveId||inv.studentId||null, schoolYearId: inv.anneeScolaireId||inv.schoolYearId||null}));
    // Écriture comptable : créance client / produit par catégorie
    if (lignes.length) {
      const lignesEcriture = [];
      for (const l of lignes) {
        const compteProduit = compteProduitForCategorie(l.categorie || 'PRODUIT');
        lignesEcriture.push({ compteId: 'cpt_client', debit: l.montant, credit: 0 });
        lignesEcriture.push({ compteId: compteProduit, debit: 0, credit: l.montant });
      }
      insertEcriture('JV', inv.dateEcheance || new Date().toISOString(), inv.id, `Facture ${inv.numeroFacture || inv.id}`, lignesEcriture, inv.devise || 'USD');
    }
    return mapInvoice(db.prepare('SELECT * FROM invoices WHERE id=?').get(inv.id));
  });
  ipcMain.handle('db-update-invoice', (_, id, upd) => {
    if (!db) return null;
    const r = db.prepare('SELECT * FROM invoices WHERE id=?').get(id);
    if (!r) return null;
    const existing = mapInvoice(r);
    const merged = { ...existing, ...upd };
    const f = [], v = [];
    if (upd.montantPaye !== undefined) { f.push('montant_paye=?'); v.push(upd.montantPaye); }
    if (upd.statut !== undefined) { f.push('statut=?'); v.push(upd.statut); }
    if (upd.montantTotal !== undefined) { f.push('montant_total=?'); v.push(upd.montantTotal); }

    // Si des lignes sont fournies, reconstruire data_json avec les nouvelles lignes et le total
    if (upd.lignes) {
      const lignes = Array.isArray(upd.lignes) ? upd.lignes : existing.lignes || [];
      const total = lignes.reduce((a, l) => a + (l.montant || 0), 0);
      merged.lignes = lignes;
      // Supprimer montant_total s'il était déjà présent pour le recalculer
      const mtIdx = f.indexOf('montant_total=?');
      if (mtIdx >= 0) { f.splice(mtIdx, 1); v.splice(mtIdx, 1); }
      f.push('montant_total=?');
      v.push(total);
      const dataJson = JSON.stringify({ ...existing, ...merged, lignes, montantTotal: total, montantPaye: upd.montantPaye ?? existing.montantPaye ?? 0 });
      db.prepare(`UPDATE invoices SET data_json=? WHERE id=?`).run(dataJson, id);
    }

    if (f.length) {
      v.push(id);
      db.prepare(`UPDATE invoices SET ${f.join(',')} WHERE id=?`).run(...v);
    }
    return mapInvoice(db.prepare('SELECT * FROM invoices WHERE id=?').get(id));
  });
  ipcMain.handle('db-delete-invoice', (_, id) => {
    if (!db) return false;
    const tx = db.transaction(() => {
      const payments = db.prepare('SELECT id, recu_numero FROM payments WHERE invoice_id=?').all(id);
      const paymentIds = payments.map(p => p.id);
      const paymentRefs = payments.map(p => p.recu_numero || p.id).filter(Boolean);

      // Supprimer les écritures et opérations de caisse liées aux paiements de cette facture
      for (const ref of new Set([...paymentIds, ...paymentRefs])) {
        db.prepare('DELETE FROM ecritures WHERE reference=?').run(ref);
      }
      for (const pid of paymentIds) {
        db.prepare("DELETE FROM cash_operations WHERE origine='PAYMENT' AND origine_id=?").run(pid);
      }

      db.prepare('DELETE FROM payments WHERE invoice_id=?').run(id);
      db.prepare('DELETE FROM invoices WHERE id=?').run(id);
      return true;
    });
    try { return tx(); } catch (e) { console.error('[db-delete-invoice] Erreur cascade:', e); return false; }
  });
  ipcMain.handle('db-cleanup-duplicate-invoices', () => {
    if (!db) return 0;
    try { return cleanupDuplicateInvoices(); } catch (e) { console.error('[db-cleanup-duplicate-invoices] Erreur:', e); return 0; }
  });
  ipcMain.handle('db-cleanup-duplicate-fee-types', () => {
    if (!db) return 0;
    try { return cleanupDuplicateFeeTypes(); } catch (e) { console.error('[db-cleanup-duplicate-fee-types] Erreur:', e); return 0; }
  });
  ipcMain.handle('db-get-payments', (_, invoiceId) => { if (!db) return []; if(invoiceId) return db.prepare('SELECT * FROM payments WHERE invoice_id=? ORDER BY date_paiement DESC').all(invoiceId).map(mapPayment); return db.prepare('SELECT * FROM payments ORDER BY date_paiement DESC').all().map(mapPayment); });

  function compteProduitForCategorie(categorie) {
    if (categorie === 'FRAIS_MINERVAL') return 'cpt_minerval';
    if (categorie === 'FRAIS_INSCRIPTION' || categorie === 'FRAIS_REINSCRIPTION') return 'cpt_inscript';
    if (categorie === 'FRAIS_SCOLAIRES' || categorie === 'FRAIS_CONNEXES' || categorie === 'FRAIS_KITS_EQUIPEMENTS') return 'cpt_frais_ks';
    return 'cpt_produit';
  }

  function insertEcriture(journalCode, date, reference, libelle, lignes, devise) {
    if (!db || !lignes || !lignes.length) return null;
    const journal = db.prepare('SELECT * FROM journaux WHERE code=?').get(journalCode);
    const journalId = journal ? journal.id : null;
    const ecritureId = randomUUID();
    const defaultDevise = devise || 'USD';
    const stmt = db.prepare('INSERT OR REPLACE INTO ecritures (id,ecriture_id,journal_id,date_ecriture,reference,libelle,compte_id,debit,credit,devise,piece,data_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
    for (const l of lignes) {
      const lineDevise = l.devise || defaultDevise;
      stmt.run(randomUUID(), ecritureId, journalId, date, reference, libelle, l.compteId || null, l.debit || 0, l.credit || 0, lineDevise, l.piece || null, JSON.stringify({ ...l, devise: lineDevise }));
    }
    return ecritureId;
  }

  function insertCashOp(op) {
    if (!db) return null;
    db.prepare('INSERT OR REPLACE INTO cash_operations (id,date_operation,libelle,description,montant,devise,type,categorie,mode_paiement,reference,caissier,piece_justificative,school_year_id,origine,origine_id,data_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
      op.id, op.date, op.libelle, op.description||null, op.montant, op.devise||'USD', op.type, op.categorie||'GENERAL', op.modePaiement||'CASH', op.reference||null, op.caissier||null, op.pieceJustificative||null, op.schoolYearId||null, op.origine||'MANUAL', op.origineId||null, JSON.stringify(op)
    );
    const stored = mapCashOp(db.prepare('SELECT * FROM cash_operations WHERE id=?').get(op.id));
    if (stored.origine === 'MANUAL') {
      if (stored.type === 'ENTREE') {
        insertEcriture('JC', stored.date, stored.reference || stored.id, stored.libelle, [
          { compteId: 'cpt_caisse', debit: stored.montant, credit: 0, piece: stored.id },
          { compteId: 'cpt_produit', debit: 0, credit: stored.montant, piece: stored.id },
        ], stored.devise);
      } else if (stored.type === 'SORTIE') {
        const compteCharge = stored.categorie === 'SALAIRES' ? 'cpt_salaire' : stored.categorie === 'FOURNITURES' ? 'cpt_fournit' : 'cpt_charge_e';
        insertEcriture('JC', stored.date, stored.reference || stored.id, stored.libelle, [
          { compteId: compteCharge, debit: stored.montant, credit: 0, piece: stored.id },
          { compteId: 'cpt_caisse', debit: 0, credit: stored.montant, piece: stored.id },
        ], stored.devise);
      }
    }
    return stored;
  }

  ipcMain.handle('db-add-payment', (_, p) => {
    if (!db) return null;
    const paymentData = {...p, montant: p.montantPaye || p.montant || 0, methode: p.moyenPaiement || p.methode || 'CASH', datePaiement: p.dateCreation || p.datePaiement || new Date().toISOString(), encaissePar: p.nomCaissier || p.encaissePar || null, recuNumero: p.numeroRecu || p.recuNumero || null};
    db.prepare('INSERT OR REPLACE INTO payments (id,invoice_id,eleve_id,montant,methode,date_paiement,recu_numero,encaisse_par,data_json) VALUES (?,?,?,?,?,?,?,?,?)').run(
      p.id, p.invoiceId||null, p.eleveId||null, paymentData.montant, paymentData.methode, paymentData.datePaiement, paymentData.recuNumero, paymentData.encaissePar, JSON.stringify(paymentData)
    );
    // Laisser le renderer recalculer montantPaye/statut via financeCalculations
    // pour éviter les erreurs de conversion monétaire et les double-comptes.
    const inv = db.prepare('SELECT * FROM invoices WHERE id=?').get(p.invoiceId);

    // Déterminer la catégorie de frais pour la caisse/comptabilité
    const allocations = Array.isArray(paymentData.allocations) && paymentData.allocations.length ? paymentData.allocations : [{ feeTypeId: null, montant: paymentData.montant }];
    let cashCategorie = 'PAIEMENT';
    if (allocations.some(a => a.feeTypeId)) {
      const firstFeeId = allocations.find(a => a.feeTypeId)?.feeTypeId;
      const ft = firstFeeId ? db.prepare('SELECT categorie FROM fee_types WHERE id=?').get(firstFeeId) : null;
      if (ft?.categorie) cashCategorie = ft.categorie;
    } else if (inv?.data_json) {
      try {
        const invData = JSON.parse(inv.data_json);
        if (invData.lignes?.[0]?.categorie) cashCategorie = invData.lignes[0].categorie;
      } catch (e) {}
    }

    // Opération de caisse (entrée)
    const cash = {
      id: randomUUID(),
      date: paymentData.datePaiement,
      libelle: `Encaissement ${p.nomEleve || ''} — ${p.numeroRecu || p.id}`.trim(),
      description: paymentData.reference || null,
      montant: paymentData.montant,
      devise: paymentData.devise || 'USD',
      type: 'ENTREE',
      categorie: cashCategorie,
      modePaiement: paymentData.methode,
      reference: paymentData.recuNumero,
      caissier: paymentData.encaissePar,
      schoolYearId: p.anneeScolaireId || (inv ? inv.school_year_id : null),
      origine: 'PAYMENT',
      origineId: p.id,
    };
    insertCashOp(cash);
    // Écriture comptable
    const lignesEcriture = [];
    const hasClient = db.prepare("SELECT id FROM comptes WHERE code='cpt_client'").get();
    if (inv && hasClient) {
      // Paiement d'une facture : caisse vs créance client
      for (const alloc of allocations) {
        lignesEcriture.push({ compteId: 'cpt_caisse', debit: alloc.montant, credit: 0 });
        lignesEcriture.push({ compteId: 'cpt_client', debit: 0, credit: alloc.montant });
      }
    } else {
      // Encaissement direct : caisse vs produit par catégorie
      for (const alloc of allocations) {
        let categorie = 'PRODUIT';
        if (alloc.feeTypeId) {
          const ft = db.prepare('SELECT * FROM fee_types WHERE id=?').get(alloc.feeTypeId);
          if (ft) categorie = ft.categorie;
        }
        const compteProduit = compteProduitForCategorie(categorie);
        lignesEcriture.push({ compteId: 'cpt_caisse', debit: alloc.montant, credit: 0 });
        lignesEcriture.push({ compteId: compteProduit, debit: 0, credit: alloc.montant });
      }
    }
    insertEcriture('JC', cash.date, paymentData.recuNumero || p.id, `Encaissement ${p.nomEleve || ''}`, lignesEcriture, paymentData.devise || p.devise || 'USD');
    return mapPayment(db.prepare('SELECT * FROM payments WHERE id=?').get(p.id));
  });

  ipcMain.handle('db-get-expenses', () => { if (!db) return []; return db.prepare('SELECT * FROM expenses ORDER BY date_depense DESC').all().map(mapExpense); });
  ipcMain.handle('db-add-expense', (_, e) => {
    if (!db) return null;
    const libelle = e.libelle || e.motif;
    const validePar = e.caissier || e.validePar;
    db.prepare('INSERT OR REPLACE INTO expenses (id,motif,montant,categorie,valide_par,date_depense,mode_paiement,piece_justificative) VALUES (?,?,?,?,?,?,?,?)').run(e.id,libelle,e.montant,e.categorie||'GENERAL',validePar||null,e.date||null,e.modePaiement||'CASH',e.pieceJustificative||null);
    // Opération de caisse (sortie)
    const cash = {
      id: randomUUID(),
      date: e.date || new Date().toISOString(),
      libelle,
      description: libelle,
      montant: e.montant,
      devise: e.devise || 'USD',
      type: 'SORTIE',
      categorie: e.categorie || 'GENERAL',
      modePaiement: e.modePaiement || 'CASH',
      reference: e.reference || null,
      caissier: validePar,
      beneficiaire: e.beneficiaire || null,
      pieceJustificative: e.pieceJustificative || null,
      schoolYearId: e.schoolYearId || null,
      origine: 'EXPENSE',
      origineId: e.id,
    };
    insertCashOp(cash);
    // Écriture comptable
    const compteCharge = e.categorie === 'SALAIRES' ? 'cpt_salaire' : e.categorie === 'FOURNITURES' ? 'cpt_fournit' : 'cpt_charge_e';
    insertEcriture('JO', cash.date, e.id, e.motif, [
      { compteId: compteCharge, debit: e.montant, credit: 0 },
      { compteId: 'cpt_caisse', debit: 0, credit: e.montant },
    ], e.devise || 'USD');
    return mapExpense(db.prepare('SELECT * FROM expenses WHERE id=?').get(e.id));
  });
  ipcMain.handle('db-delete-expense', (_, id) => { if (!db) return false; db.prepare('DELETE FROM expenses WHERE id=?').run(id); db.prepare("DELETE FROM cash_operations WHERE origine='EXPENSE' AND origine_id=?").run(id); db.prepare("DELETE FROM ecritures WHERE reference=?").run(id); return true; });

  // Types de frais
  ipcMain.handle('db-get-fee-types', (_, yearId) => { if (!db) return []; if(yearId) return db.prepare('SELECT * FROM fee_types WHERE school_year_id=? ORDER BY nom').all(yearId).map(mapFeeType); return db.prepare('SELECT * FROM fee_types ORDER BY nom').all().map(mapFeeType); });
  ipcMain.handle('db-add-fee-type', (_, ft) => { if (!db) return null; const id = ft.id || randomUUID(); db.prepare('INSERT OR REPLACE INTO fee_types (id,code,nom,categorie,montant,devise,obligatoire,portee,school_year_id,class_id,salle_id,mode_paiement,nombre_tranches,data_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,ft.code||'',ft.nom,ft.categorie||'AUTRE',ft.montant||0,ft.devise||'USD',ft.obligatoire?1:0,ft.portee||null,ft.schoolYearId||null,ft.classId||null,ft.salleId||null,ft.modePaiement||'UNIQUE',ft.nombreTranches||1,JSON.stringify({...ft, id})); return mapFeeType(db.prepare('SELECT * FROM fee_types WHERE id=?').get(id)); });
  ipcMain.handle('db-update-fee-type', (_, id, upd) => { if (!db) return null; const r=db.prepare('SELECT * FROM fee_types WHERE id=?').get(id); if(!r) return null; const m={...mapFeeType(r),...upd}; db.prepare('UPDATE fee_types SET code=?,nom=?,categorie=?,montant=?,devise=?,obligatoire=?,portee=?,school_year_id=?,class_id=?,salle_id=?,mode_paiement=?,nombre_tranches=?,data_json=? WHERE id=?').run(m.code||'',m.nom,m.categorie||'AUTRE',m.montant||0,m.devise||'USD',m.obligatoire?1:0,m.portee||null,m.schoolYearId||null,m.classId||null,m.salleId||null,m.modePaiement||'UNIQUE',m.nombreTranches||1,JSON.stringify(m),id); return mapFeeType(db.prepare('SELECT * FROM fee_types WHERE id=?').get(id)); });
  ipcMain.handle('db-delete-fee-type', (_, id) => { if (!db) return false; db.prepare('DELETE FROM fee_types WHERE id=?').run(id); return true; });

  // Caisse
  ipcMain.handle('db-get-cash-operations', (_, filters) => { if (!db) return []; let q='SELECT * FROM cash_operations', p=[]; const cond=[]; if(filters?.yearId){cond.push('school_year_id=?');p.push(filters.yearId);} if(filters?.type){cond.push('type=?');p.push(filters.type);} if(cond.length) q+=' WHERE '+cond.join(' AND '); q+=' ORDER BY date_operation DESC'; return db.prepare(q).all(...p).map(mapCashOp); });
  ipcMain.handle('db-add-cash-operation', (_, op) => { if (!db) return null; return insertCashOp(op); });
  ipcMain.handle('db-delete-cash-operation', (_, id) => { if (!db) return false; db.prepare('DELETE FROM cash_operations WHERE id=?').run(id); db.prepare("DELETE FROM ecritures WHERE piece=?").run(id); return true; });

  // Plan comptable
  ipcMain.handle('db-get-comptes', () => { if (!db) return []; return db.prepare('SELECT * FROM comptes ORDER BY code').all().map(mapCompte); });
  ipcMain.handle('db-add-compte', (_, c) => { if (!db) return null; db.prepare('INSERT OR REPLACE INTO comptes (id,code,nom,type,parent_id,actif) VALUES (?,?,?,?,?,?)').run(c.id,c.code,c.nom,c.type||'CHARGE',c.parentId||null,c.actif!==false?1:0); return mapCompte(db.prepare('SELECT * FROM comptes WHERE id=?').get(c.id)); });
  ipcMain.handle('db-update-compte', (_, id, upd) => { if (!db) return null; const r=db.prepare('SELECT * FROM comptes WHERE id=?').get(id); if(!r) return null; const m={...mapCompte(r),...upd}; db.prepare('UPDATE comptes SET code=?,nom=?,type=?,parent_id=?,actif=? WHERE id=?').run(m.code,m.nom,m.type,m.parentId||null,m.actif?1:0,id); return mapCompte(db.prepare('SELECT * FROM comptes WHERE id=?').get(id)); });
  ipcMain.handle('db-delete-compte', (_, id) => { if (!db) return false; db.prepare('DELETE FROM comptes WHERE id=?').run(id); return true; });

  // Journaux
  ipcMain.handle('db-get-journaux', () => { if (!db) return []; return db.prepare('SELECT * FROM journaux ORDER BY code').all().map(mapJournal); });
  ipcMain.handle('db-add-journal', (_, j) => { if (!db) return null; db.prepare('INSERT OR REPLACE INTO journaux (id,code,nom,type,actif) VALUES (?,?,?,?,?)').run(j.id,j.code,j.nom,j.type||'OD',j.actif!==false?1:0); return mapJournal(db.prepare('SELECT * FROM journaux WHERE id=?').get(j.id)); });
  ipcMain.handle('db-update-journal', (_, id, upd) => { if (!db) return null; const r=db.prepare('SELECT * FROM journaux WHERE id=?').get(id); if(!r) return null; const m={...mapJournal(r),...upd}; db.prepare('UPDATE journaux SET code=?,nom=?,type=?,actif=? WHERE id=?').run(m.code,m.nom,m.type,m.actif?1:0,id); return mapJournal(db.prepare('SELECT * FROM journaux WHERE id=?').get(id)); });
  ipcMain.handle('db-delete-journal', (_, id) => { if (!db) return false; db.prepare('DELETE FROM journaux WHERE id=?').run(id); return true; });

  // Écritures comptables
  ipcMain.handle('db-get-ecritures', (_, filters) => {
    if (!db) return [];
    let q='SELECT * FROM ecritures', p=[];
    const cond=[];
    if(filters?.compteId){cond.push('compte_id=?');p.push(filters.compteId);}
    if(filters?.journalId){cond.push('journal_id=?');p.push(filters.journalId);}
    if(filters?.dateFrom && filters?.dateTo){cond.push('date_ecriture BETWEEN ? AND ?');p.push(filters.dateFrom,filters.dateTo);} else if(filters?.dateFrom){cond.push('date_ecriture>=?');p.push(filters.dateFrom);} else if(filters?.dateTo){cond.push('date_ecriture<=?');p.push(filters.dateTo);}
    if(cond.length) q+=' WHERE '+cond.join(' AND ');
    q+=' ORDER BY date_ecriture DESC, ecriture_id';
    const rows = db.prepare(q).all(...p).map(mapEcriture);
    const grouped = {};
    for (const r of rows) {
      if (!grouped[r.ecritureId]) grouped[r.ecritureId] = { id: r.ecritureId, journalId: r.journalId, journalCode: (db.prepare('SELECT code FROM journaux WHERE id=?').get(r.journalId)?.code) || null, date: r.date, reference: r.reference, libelle: r.libelle, piece: r.piece, lignes: [] };
      grouped[r.ecritureId].lignes.push(r);
    }
    return Object.values(grouped);
  });
  ipcMain.handle('db-add-ecriture', (_, e) => { if (!db) return null; const journal = db.prepare('SELECT * FROM journaux WHERE code=?').get(e.journalCode || 'JO'); const journalId = journal ? journal.id : (e.journalId || null); const ecritureId = randomUUID(); const stmt = db.prepare('INSERT OR REPLACE INTO ecritures (id,ecriture_id,journal_id,date_ecriture,reference,libelle,compte_id,debit,credit,devise,piece,data_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'); for (const l of (e.lignes||[])) { const lineDevise = l.devise || e.devise || 'USD'; stmt.run(randomUUID(), ecritureId, journalId, e.date, e.reference, e.libelle, l.compteId, l.debit||0, l.credit||0, lineDevise, e.piece||null, JSON.stringify({ ...l, devise: lineDevise })); } return ecritureId; });
  ipcMain.handle('db-delete-ecriture', (_, ecritureId) => { if (!db) return false; db.prepare('DELETE FROM ecritures WHERE ecriture_id=?').run(ecritureId); return true; });

  // Budgets prévisionnels
  ipcMain.handle('db-get-budgets', (_, filters) => { if (!db) return []; let q='SELECT * FROM budgets', p=[], cond=[]; if(filters?.schoolYearId){cond.push('school_year_id=?');p.push(filters.schoolYearId);} if(filters?.periode){cond.push('periode=?');p.push(filters.periode);} if(filters?.type){cond.push('type=?');p.push(filters.type);} if(cond.length) q+=' WHERE '+cond.join(' AND '); q+=' ORDER BY periode, type, categorie'; return db.prepare(q).all(...p).map(mapBudget); });
  ipcMain.handle('db-add-budget', (_, b) => { if (!db) return null; db.prepare('INSERT OR REPLACE INTO budgets (id,school_year_id,periode,date_debut,date_fin,categorie,type,montant,devise,note,data_json) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(b.id,b.schoolYearId||null,b.periode||'',b.dateDebut||null,b.dateFin||null,b.categorie||'',b.type||'REVENU',b.montant||0,b.devise||'USD',b.note||null,JSON.stringify(b)); return mapBudget(db.prepare('SELECT * FROM budgets WHERE id=?').get(b.id)); });
  ipcMain.handle('db-update-budget', (_, id, upd) => { if (!db) return null; const r=db.prepare('SELECT * FROM budgets WHERE id=?').get(id); if(!r) return null; const m={...mapBudget(r),...upd}; db.prepare('UPDATE budgets SET school_year_id=?,periode=?,date_debut=?,date_fin=?,categorie=?,type=?,montant=?,devise=?,note=?,data_json=? WHERE id=?').run(m.schoolYearId||null,m.periode||'',m.dateDebut||null,m.dateFin||null,m.categorie||'',m.type||'REVENU',m.montant||0,m.devise||'USD',m.note||null,JSON.stringify(m),id); return mapBudget(db.prepare('SELECT * FROM budgets WHERE id=?').get(id)); });
  ipcMain.handle('db-delete-budget', (_, id) => { if (!db) return false; db.prepare('DELETE FROM budgets WHERE id=?').run(id); return true; });

  // Notes de frais professionnels
  ipcMain.handle('db-get-staff-expense-notes', (_, filters) => { if (!db) return []; let q='SELECT * FROM staff_expense_notes', p=[], cond=[]; if(filters?.schoolYearId){cond.push('school_year_id=?');p.push(filters.schoolYearId);} if(filters?.staffId){cond.push('staff_id=?');p.push(filters.staffId);} if(filters?.statut){cond.push('statut=?');p.push(filters.statut);} if(cond.length) q+=' WHERE '+cond.join(' AND '); q+=' ORDER BY date_note DESC, staff_name COLLATE NOCASE'; return db.prepare(q).all(...p).map(mapStaffExpenseNote); });
  ipcMain.handle('db-add-staff-expense-note', (_, n) => { if (!db) return null; db.prepare(`INSERT OR REPLACE INTO staff_expense_notes (id,staff_id,staff_name,school_year_id,date_note,categorie,description,montant,devise,justificatif,statut,valide_par,date_validation,commentaire_validation,montant_rembourse,date_remboursement,mode_remboursement,reference_remboursement,cree_par,date_creation,data_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(n.id,n.staffId||null,n.staffName||'',n.schoolYearId||null,n.dateNote||'',n.categorie||'',n.description||null,n.montant||0,n.devise||'USD',n.justificatif||null,n.statut||'SOUMIS',n.validePar||null,n.dateValidation||null,n.commentaireValidation||null,n.montantRembourse||null,n.dateRemboursement||null,n.modeRemboursement||null,n.referenceRemboursement||null,n.creePar||null,n.dateCreation||new Date().toISOString(),JSON.stringify(n)); return mapStaffExpenseNote(db.prepare('SELECT * FROM staff_expense_notes WHERE id=?').get(n.id)); });
  ipcMain.handle('db-update-staff-expense-note', (_, id, upd) => { if (!db) return null; const r=db.prepare('SELECT * FROM staff_expense_notes WHERE id=?').get(id); if(!r) return null; const m={...mapStaffExpenseNote(r),...upd}; db.prepare(`UPDATE staff_expense_notes SET staff_id=?,staff_name=?,school_year_id=?,date_note=?,categorie=?,description=?,montant=?,devise=?,justificatif=?,statut=?,valide_par=?,date_validation=?,commentaire_validation=?,montant_rembourse=?,date_remboursement=?,mode_remboursement=?,reference_remboursement=?,cree_par=?,date_creation=?,data_json=? WHERE id=?`).run(m.staffId||null,m.staffName||'',m.schoolYearId||null,m.dateNote||'',m.categorie||'',m.description||null,m.montant||0,m.devise||'USD',m.justificatif||null,m.statut||'SOUMIS',m.validePar||null,m.dateValidation||null,m.commentaireValidation||null,m.montantRembourse??null,m.dateRemboursement||null,m.modeRemboursement||null,m.referenceRemboursement||null,m.creePar||null,m.dateCreation||new Date().toISOString(),JSON.stringify(m),id); return mapStaffExpenseNote(db.prepare('SELECT * FROM staff_expense_notes WHERE id=?').get(id)); });
  ipcMain.handle('db-delete-staff-expense-note', (_, id) => { if (!db) return false; db.prepare('DELETE FROM staff_expense_notes WHERE id=?').run(id); db.prepare(`DELETE FROM cash_operations WHERE origine='STAFF_EXPENSE' AND origine_id=?`).run(id); db.prepare(`DELETE FROM ecritures WHERE reference=?`).run(id); return true; });
  ipcMain.handle('db-reimburse-staff-expense-note', (_, id, data) => { if (!db) return null; const n=mapStaffExpenseNote(db.prepare('SELECT * FROM staff_expense_notes WHERE id=?').get(id)); if(!n) return null; const montant=data.montantRembourse ?? n.montant; const remDevise=data.devise||n.devise||'USD'; const dateRemboursement=data.dateRemboursement||new Date().toISOString().split('T')[0]; const modeRemboursement=data.modeRemboursement||'CASH'; const referenceRemboursement=data.referenceRemboursement||''; const validePar=data.validePar||n.validePar||''; const m={...n,statut:'REMBOURSE',montantRembourse:montant,dateRemboursement,modeRemboursement,referenceRemboursement,validePar}; db.prepare(`UPDATE staff_expense_notes SET statut='REMBOURSE',valide_par=?,date_validation=?,montant_rembourse=?,date_remboursement=?,mode_remboursement=?,reference_remboursement=?,data_json=? WHERE id=?`).run(validePar,new Date().toISOString(),montant,dateRemboursement,modeRemboursement,referenceRemboursement,JSON.stringify(m),id); const cashId=randomUUID(); const cash={id:cashId,date:dateRemboursement,libelle:`Remboursement note frais - ${n.staffName||n.staffId} - ${n.categorie}`,montant,devise:remDevise,type:'SORTIE',categorie:n.categorie||'AUTRE',modePaiement:modeRemboursement,reference:referenceRemboursement,caissier:validePar,validePar,origine:'STAFF_EXPENSE',origineId:id,pieceJustificative:n.justificatif}; insertCashOp(cash); const compteCharge = n.categorie==='SALAIRES'?'cpt_salaire':n.categorie==='FOURNITURES'?'cpt_fournit':'cpt_charge_e'; insertEcriture({ date:dateRemboursement, reference:id, libelle:`Remboursement note frais - ${n.staffName||n.staffId} - ${n.categorie}`, devise:remDevise, lignes:[ {compteId:compteCharge,debit:montant,credit:0,devise:remDevise}, {compteId:'cpt_caisse',debit:0,credit:montant,devise:remDevise} ] }); return mapStaffExpenseNote(db.prepare('SELECT * FROM staff_expense_notes WHERE id=?').get(id)); });

  // Historique d'envoi de factures
  ipcMain.handle('db-get-invoice-sending-history', (_, filters) => { if (!db) return []; let q='SELECT * FROM invoice_sending_history', p=[], cond=[]; if(filters?.invoiceId){cond.push('invoice_id=?');p.push(filters.invoiceId);} if(filters?.methode){cond.push('methode=?');p.push(filters.methode);} if(cond.length) q+=' WHERE '+cond.join(' AND '); q+=' ORDER BY date_envoi DESC'; return db.prepare(q).all(...p).map(mapInvoiceSendingHistory); });
  ipcMain.handle('db-add-invoice-sending-history', (_, h) => { if (!db) return null; db.prepare(`INSERT OR REPLACE INTO invoice_sending_history (id,invoice_id,methode,destinataire,contact,statut,date_envoi,message,data_json) VALUES (?,?,?,?,?,?,?,?,?)`).run(h.id,h.invoiceId||null,h.methode||'',h.destinataire||'',h.contact||null,h.statut||'SIMULE',h.dateEnvoi||new Date().toISOString(),h.message||null,JSON.stringify(h)); return mapInvoiceSendingHistory(db.prepare('SELECT * FROM invoice_sending_history WHERE id=?').get(h.id)); });
  ipcMain.handle('db-delete-invoice-sending-history', (_, id) => { if (!db) return false; db.prepare('DELETE FROM invoice_sending_history WHERE id=?').run(id); return true; });

  // Staff
  ipcMain.handle('db-get-staff', () => { if (!db) return []; return db.prepare('SELECT * FROM staff ORDER BY nom').all().map(mapStaff); });
  ipcMain.handle('db-get-staff-by-role', (_, role) => { if (!db) return []; return db.prepare('SELECT * FROM staff WHERE role=? ORDER BY nom').all(role).map(mapStaff); });
  ipcMain.handle('db-add-staff', (_, m) => { if (!db) return null; db.prepare('INSERT OR REPLACE INTO staff (id,nom,prenom,role,telephone,email,salaire_base,devise,statut,data_json) VALUES (?,?,?,?,?,?,?,?,?,?)').run(m.id,m.nom,m.prenom||null,m.role||null,m.telephone||null,m.email||null,m.salaireBase||0,m.devise||'USD',m.statut||'ACTIF',JSON.stringify(m)); return mapStaff(db.prepare('SELECT * FROM staff WHERE id=?').get(m.id)); });
  ipcMain.handle('db-update-staff', (_, id, upd) => { if (!db) return null; const r=db.prepare('SELECT * FROM staff WHERE id=?').get(id); const existing = r ? mapStaff(r) : { id }; const m={...existing,...upd,id}; db.prepare('INSERT OR REPLACE INTO staff (id,nom,prenom,role,telephone,email,salaire_base,devise,statut,data_json) VALUES (?,?,?,?,?,?,?,?,?,?)').run(m.id,m.nom||'',m.prenom||null,m.role||null,m.telephone||null,m.email||null,m.salaireBase||0,m.devise||'USD',m.statut||'ACTIF',JSON.stringify(m)); return mapStaff(db.prepare('SELECT * FROM staff WHERE id=?').get(id)); });
  ipcMain.handle('db-delete-staff', (_, id) => { if (!db) return false; db.prepare('DELETE FROM staff WHERE id=?').run(id); return true; });

  // Fiches de paie
  ipcMain.handle('db-get-fiches-paie', (_, filters) => {
    if (!db) return [];
    let q = 'SELECT * FROM fiches_paie', p = [], cond = [];
    if (filters?.staffId) { cond.push('staff_id=?'); p.push(filters.staffId); }
    if (filters?.periode) { cond.push('periode=?'); p.push(filters.periode); }
    if (filters?.schoolYearId) { cond.push('school_year_id=?'); p.push(filters.schoolYearId); }
    if (filters?.statut) { cond.push('statut=?'); p.push(filters.statut); }
    if (cond.length) q += ' WHERE ' + cond.join(' AND ');
    q += ' ORDER BY periode DESC, staff_name COLLATE NOCASE';
    return db.prepare(q).all(...p).map(mapFichePaie);
  });
  ipcMain.handle('db-add-fiche-paie', (_, f) => {
    if (!db) return null;
    db.prepare(`INSERT OR REPLACE INTO fiches_paie (id,staff_id,staff_name,staff_matricule,staff_role,staff_function,staff_bank_account,staff_mobile_money,staff_payment_mode,periode,school_year_id,annee_scolaire,salaire_base,devise,heures_prestees,salaire_brut,total_primes,total_deductions,total_avances,salaire_net,mode_paiement,reference,date_paiement,caissier,statut,numero_fiche,notes,origine_expense_id,data_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      f.id,f.staffId||null,f.staffName||'',f.staffMatricule||null,f.staffRole||null,f.staffFunction||null,f.staffBankAccount||null,f.staffMobileMoney||null,f.staffPaymentMode||null,f.periode||'',f.schoolYearId||null,f.anneeScolaire||null,f.salaireBase||0,f.devise||'USD',f.heuresPrestees||0,f.salaireBrut||0,f.totalPrimes||0,f.totalDeductions||0,f.totalAvances||0,f.salaireNet||0,f.modePaiement||'CASH',f.reference||null,f.datePaiement||null,f.caissier||null,f.statut||'BROUILLON',f.numeroFiche||null,f.notes||null,f.origineExpenseId||null,JSON.stringify(f)
    );
    return mapFichePaie(db.prepare('SELECT * FROM fiches_paie WHERE id=?').get(f.id));
  });
  ipcMain.handle('db-update-fiche-paie', (_, id, upd) => {
    if (!db) return null;
    const r = db.prepare('SELECT * FROM fiches_paie WHERE id=?').get(id);
    if (!r) return null;
    const m = { ...mapFichePaie(r), ...upd };
    db.prepare(`UPDATE fiches_paie SET staff_id=?,staff_name=?,staff_matricule=?,staff_role=?,staff_function=?,staff_bank_account=?,staff_mobile_money=?,staff_payment_mode=?,periode=?,school_year_id=?,annee_scolaire=?,salaire_base=?,devise=?,heures_prestees=?,salaire_brut=?,total_primes=?,total_deductions=?,total_avances=?,salaire_net=?,mode_paiement=?,reference=?,date_paiement=?,caissier=?,statut=?,numero_fiche=?,notes=?,origine_expense_id=?,data_json=? WHERE id=?`).run(
      m.staffId||null,m.staffName||'',m.staffMatricule||null,m.staffRole||null,m.staffFunction||null,m.staffBankAccount||null,m.staffMobileMoney||null,m.staffPaymentMode||null,m.periode||'',m.schoolYearId||null,m.anneeScolaire||null,m.salaireBase||0,m.devise||'USD',m.heuresPrestees||0,m.salaireBrut||0,m.totalPrimes||0,m.totalDeductions||0,m.totalAvances||0,m.salaireNet||0,m.modePaiement||'CASH',m.reference||null,m.datePaiement||null,m.caissier||null,m.statut||'BROUILLON',m.numeroFiche||null,m.notes||null,m.origineExpenseId||null,JSON.stringify(m),id
    );
    return mapFichePaie(db.prepare('SELECT * FROM fiches_paie WHERE id=?').get(id));
  });
  ipcMain.handle('db-delete-fiche-paie', (_, id) => { if (!db) return false; db.prepare('DELETE FROM fiches_paie WHERE id=?').run(id); return true; });

  // Journal d'Audit
  ipcMain.handle('db-get-audit-log', (_, filters) => {
    if (!db) return [];
    let q = 'SELECT * FROM audit_log', p = [], cond = [];
    if (filters?.userId) { cond.push('user_id=?'); p.push(filters.userId); }
    if (filters?.module) { cond.push('module=?'); p.push(filters.module); }
    if (filters?.action) { cond.push('action=?'); p.push(filters.action); }
    if (filters?.dateFrom) { cond.push('created_at>=?'); p.push(filters.dateFrom); }
    if (filters?.dateTo) { cond.push('created_at<=?'); p.push(filters.dateTo); }
    if (cond.length) q += ' WHERE ' + cond.join(' AND ');
    q += ' ORDER BY created_at DESC LIMIT 2000';
    return db.prepare(q).all(...p).map(r => ({ id: r.id, userId: r.user_id, userNom: r.user_nom, userRole: r.user_role, action: r.action, module: r.module, entite: r.entite, entiteId: r.entite_id, details: (() => { try { return JSON.parse(r.details_json || '{}'); } catch { return {}; } })(), createdAt: r.created_at }));
  });
  ipcMain.handle('db-add-audit-entry', (_, entry) => {
    if (!db) return null;
    const id = entry.id || randomUUID();
    db.prepare('INSERT INTO audit_log (id,user_id,user_nom,user_role,action,module,entite,entite_id,details_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,datetime(\'now\',\'localtime\'))').run(
      id, entry.userId||null, entry.userNom||null, entry.userRole||null, entry.action, entry.module||null, entry.entite||null, entry.entiteId||null, JSON.stringify(entry.details||{})
    );
    return id;
  });
  ipcMain.handle('db-clear-audit-log', () => { if (!db) return false; db.prepare('DELETE FROM audit_log WHERE created_at < datetime(\'now\', \'-90 days\')').run(); return true; });

  // Cotes
  ipcMain.handle('db-get-cotes', (_, filters) => {
    if (!db) return [];
    let q='SELECT * FROM cotes', p=[], cond=[];
    if(filters?.eleveId){ cond.push('eleve_id=?'); p.push(filters.eleveId); }
    if(filters?.classeId){ cond.push('classe_id=?'); p.push(filters.classeId); }
    if(filters?.matiereId){ cond.push('matiere_id=?'); p.push(filters.matiereId); }
    if(filters?.periode){ cond.push('periode=?'); p.push(filters.periode); }
    if(filters?.type){ cond.push('type=?'); p.push(filters.type); }
    if(filters?.evaluationId){ cond.push('json_extract(data_json, "$.evaluationId")=?'); p.push(filters.evaluationId); }
    if(cond.length){ q+=' WHERE '+cond.join(' AND '); }
    q+=' ORDER BY date_cote DESC';
    return db.prepare(q).all(...p).map(mapCote);
  });
  ipcMain.handle('db-add-cote', (_, c) => { if (!db) return null; db.prepare('INSERT OR REPLACE INTO cotes (id,eleve_id,matiere_id,classe_id,periode,type,score,max_score,date_cote,data_json) VALUES (?,?,?,?,?,?,?,?,?,?)').run(c.id,c.eleveId,c.matiereId||null,c.classeId||null,c.periode||'1ER_TRIMESTRE',c.type||'INTERROGATION',c.score||0,c.maxScore||100,c.dateCote||null,JSON.stringify(c)); return mapCote(db.prepare('SELECT * FROM cotes WHERE id=?').get(c.id)); });
  ipcMain.handle('db-update-cote', (_, id, upd) => { if (!db) return null; const r=db.prepare('SELECT * FROM cotes WHERE id=?').get(id); if(!r) return null; const m={...mapCote(r),...upd}; db.prepare('UPDATE cotes SET eleve_id=?,matiere_id=?,classe_id=?,periode=?,type=?,score=?,max_score=?,date_cote=?,data_json=? WHERE id=?').run(m.eleveId,m.matiereId||null,m.classeId||null,m.periode||'1ER_TRIMESTRE',m.type||'INTERROGATION',m.score||0,m.maxScore||100,m.dateCote||null,JSON.stringify(m),id); return mapCote(db.prepare('SELECT * FROM cotes WHERE id=?').get(id)); });
  ipcMain.handle('db-delete-cote', (_, id) => { if (!db) return false; db.prepare('DELETE FROM cotes WHERE id=?').run(id); return true; });

  // Presences
  ipcMain.handle('db-get-presences', (_, filters) => { if (!db) return []; let q='SELECT * FROM presences',p=[]; if(filters?.eleveId){q+=' WHERE eleve_id=?';p.push(filters.eleveId);} else if(filters?.classeId){q+=' WHERE classe_id=?';p.push(filters.classeId);} else if(filters?.dateJour){q+=' WHERE date_jour=?';p.push(filters.dateJour);} q+=' ORDER BY date_jour DESC'; return db.prepare(q).all(...p).map(mapPresence); });
  ipcMain.handle('db-add-presence', (_, p) => { if (!db) return null; db.prepare('INSERT OR REPLACE INTO presences (id,eleve_id,classe_id,date_jour,statut,motif,data_json) VALUES (?,?,?,?,?,?,?)').run(p.id,p.eleveId,p.classeId||null,p.dateJour,p.statut||'PRESENT',p.motif||null,JSON.stringify(p)); return mapPresence(db.prepare('SELECT * FROM presences WHERE id=?').get(p.id)); });
  ipcMain.handle('db-delete-presence', (_, id) => { if (!db) return false; db.prepare('DELETE FROM presences WHERE id=?').run(id); return true; });

  // School Events
  ipcMain.handle('db-get-school-events', (_, filters) => { if (!db) return []; let q='SELECT * FROM school_events',p=[]; if(filters?.categorie){q+=' WHERE categorie=?';p.push(filters.categorie);} q+=' ORDER BY date_debut'; return db.prepare(q).all(...p).map(mapSchoolEvent); });
  ipcMain.handle('db-add-school-event', (_, ev) => { if (!db) return null; db.prepare('INSERT OR REPLACE INTO school_events (id,titre,subtitre,date_debut,date_fin,categorie,public_cible,highlight,data_json) VALUES (?,?,?,?,?,?,?,?,?)').run(ev.id,ev.titre,ev.subtitre||null,ev.dateDebut,ev.dateFin||null,ev.categorie||'AUTRE',ev.publicCible||'TOUS',ev.highlight?1:0,JSON.stringify(ev)); return mapSchoolEvent(db.prepare('SELECT * FROM school_events WHERE id=?').get(ev.id)); });
  ipcMain.handle('db-delete-school-event', (_, id) => { if (!db) return false; db.prepare('DELETE FROM school_events WHERE id=?').run(id); return true; });

  // Documents scolaires (insertion, compression, ouverture)
  ipcMain.handle('documents-get-by-student', (_, studentId) => {
    if (!db) return [];
    return db.prepare('SELECT * FROM student_documents WHERE eleve_id=? ORDER BY created_at DESC').all(studentId).map(mapStudentDocument);
  });

  ipcMain.handle('documents-delete', (_, id) => {
    if (!db) return false;
    const r = db.prepare('SELECT * FROM student_documents WHERE id=?').get(id);
    if (!r) return false;
    if (r.storage_path) {
      try {
        const p = path.join(getDocumentsBase(), r.storage_path);
        if (fs.existsSync(p)) fs.rmSync(p, { force: true, recursive: true });
        const dir = path.dirname(p);
        try { fs.rmdirSync(dir); } catch (e) {}
      } catch (e) { console.warn('[Documents] Impossible de supprimer le fichier:', e.message); }
    }
    db.prepare('DELETE FROM student_documents WHERE id=?').run(id);
    return true;
  });

  ipcMain.handle('documents-open', async (_, id) => {
    if (!db) return false;
    const r = db.prepare('SELECT * FROM student_documents WHERE id=?').get(id);
    if (!r || !r.storage_path) return false;
    const p = path.join(getDocumentsBase(), r.storage_path);
    if (!fs.existsSync(p)) return false;
    const err = await shell.openPath(p);
    return !err;
  });

  ipcMain.handle('documents-import-files', async (_, studentId) => {
    if (!db) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Joindre des documents scolaires',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Documents scolaires (PDF, images)', extensions: Array.from(ALLOWED_DOC_EXTENSIONS) }]
    });
    if (result.canceled) return [];
    const allowedPaths = result.filePaths.filter(isAllowedDocumentFile);
    if (allowedPaths.length === 0) return [];
    const base = getDocumentsBase();
    const stmt = db.prepare('INSERT INTO student_documents (id,eleve_id,file_name,original_name,mime_type,category,size_bytes,storage_path,is_archive,archive_count,created_at,data_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
    const docs = [];
    for (const filePath of allowedPaths) {
      const originalName = path.basename(filePath);
      const safe = sanitizeFileName(originalName);
      const id = randomUUID();
      const ext = path.extname(safe);
      const fileName = `${id}${ext ? ext : ''}`;
      const rel = path.join(studentId, fileName);
      const dest = path.join(base, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const data = fs.readFileSync(filePath);
      fs.writeFileSync(dest, data);
      const mime = getMimeFromName(safe);
      stmt.run(id, studentId, fileName, originalName, mime, 'Document', data.length, rel, 0, 0, new Date().toISOString(), '{}');
      docs.push(mapStudentDocument(db.prepare('SELECT * FROM student_documents WHERE id=?').get(id)));
    }
    return docs;
  });

  ipcMain.handle('documents-import-folder', async (_, studentId) => {
    if (!db) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Joindre un dossier scolaire (archive)',
      properties: ['openDirectory']
    });
    if (result.canceled) return null;
    const folderPath = result.filePaths[0];
    const originalName = path.basename(folderPath);
    const allEntries = listFilesRecursive(folderPath);
    const entries = allEntries.filter(e => isAllowedDocumentFile(e.fullPath));
    if (entries.length === 0) return null;
    const base = getDocumentsBase();
    const id = randomUUID();
    const archiveFileName = `${id}.zip`;
    const rel = path.join(studentId, archiveFileName);
    const dest = path.join(base, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const zipEntries = entries.map(e => ({ name: e.relPath, data: fs.readFileSync(e.fullPath) }));
    const zip = buildZip(zipEntries);
    fs.writeFileSync(dest, zip);
    db.prepare('INSERT INTO student_documents (id,eleve_id,file_name,original_name,mime_type,category,size_bytes,storage_path,is_archive,archive_count,created_at,data_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(
      id, studentId, archiveFileName, originalName, 'application/zip', 'Dossier', zip.length, rel, 1, entries.length, new Date().toISOString(), '{}'
    );
    return mapStudentDocument(db.prepare('SELECT * FROM student_documents WHERE id=?').get(id));
  });

  ipcMain.handle('documents-compress', (_, studentId, ids) => {
    if (!db || !ids || !ids.length) return null;
    const base = getDocumentsBase();
    const records = ids.map(id => db.prepare('SELECT * FROM student_documents WHERE id=? AND eleve_id=?').get(id, studentId)).filter(Boolean);
    if (records.length === 0) return null;
    const zipEntries = records.map(r => {
      const p = path.join(base, r.storage_path);
      return { name: r.original_name, data: fs.readFileSync(p) };
    });
    const id = randomUUID();
    const archiveFileName = `${id}.zip`;
    const rel = path.join(studentId, archiveFileName);
    const dest = path.join(base, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const zip = buildZip(zipEntries);
    fs.writeFileSync(dest, zip);
    db.prepare('INSERT INTO student_documents (id,eleve_id,file_name,original_name,mime_type,category,size_bytes,storage_path,is_archive,archive_count,created_at,data_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(
      id, studentId, archiveFileName, `Archive_${records.length}_documents.zip`, 'application/zip', 'Archive', zip.length, rel, 1, records.length, new Date().toISOString(), '{}'
    );
    return mapStudentDocument(db.prepare('SELECT * FROM student_documents WHERE id=?').get(id));
  });

  ipcMain.handle('documents-rename', (_, id, newName) => {
    if (!db || !newName) return null;
    const r = db.prepare('SELECT * FROM student_documents WHERE id=?').get(id);
    if (!r) return null;
    const safeName = sanitizeFileName(newName).trim() || r.original_name;
    db.prepare('UPDATE student_documents SET original_name=? WHERE id=?').run(safeName, id);
    return mapStudentDocument(db.prepare('SELECT * FROM student_documents WHERE id=?').get(id));
  });

  ipcMain.handle('documents-import-image', (_, studentId, originalName, base64) => {
    if (!db || !studentId || !base64) return null;
    const match = typeof base64 === 'string' ? base64.match(/^data:image\/([^;]+);base64,(.*)$/) : null;
    let ext = (match ? match[1] : 'png').toLowerCase();
    if (ext === 'jpeg') ext = 'jpg';
    if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) ext = 'png';
    const b64 = match ? match[2] : base64;
    const data = Buffer.from(b64, 'base64');
    if (data.length === 0) return null;
    const id = randomUUID();
    const safe = sanitizeFileName(originalName || 'scan').replace(/\.[^.]*$/, '').trim() || 'scan';
    const fileName = `${id}.${ext}`;
    const rel = path.join(studentId, fileName);
    const dest = path.join(getDocumentsBase(), rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, data);
    const mime = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    db.prepare('INSERT INTO student_documents (id,eleve_id,file_name,original_name,mime_type,category,size_bytes,storage_path,is_archive,archive_count,created_at,data_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(
      id, studentId, fileName, `${safe}.${ext}`, mime, 'Scan', data.length, rel, 0, 0, new Date().toISOString(), '{}'
    );
    return mapStudentDocument(db.prepare('SELECT * FROM student_documents WHERE id=?').get(id));
  });

  ipcMain.handle('documents-read-file', (_, id) => {
    if (!db) return null;
    const r = db.prepare('SELECT * FROM student_documents WHERE id=?').get(id);
    if (!r || !r.storage_path) return null;
    const p = path.join(getDocumentsBase(), r.storage_path);
    if (!fs.existsSync(p)) return null;
    const data = fs.readFileSync(p);
    const mime = getMimeFromName(r.original_name || r.storage_path);
    return { data: data.toString('base64'), mimeType: mime, originalName: r.original_name, isArchive: !!r.is_archive };
  });

  // WIA (Windows Image Acquisition) — scanners / imprimantes multifonctions
  const { execFile } = require('child_process');
  const tmpDir = app.getPath('temp');

  function runPowerShell(script) {
    return new Promise((resolve, reject) => {
      const tmpFile = path.join(tmpDir, `ecolisa_wia_${Date.now()}.ps1`);
      fs.writeFileSync(tmpFile, script, { encoding: 'utf8' });
      execFile('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', tmpFile], { windowsHide: true }, (err, stdout, stderr) => {
        try { fs.unlinkSync(tmpFile); } catch (e) {}
        if (err) return reject(err);
        if (stderr) console.error('[WIA] stderr:', stderr);
        resolve(stdout.trim());
      });
    });
  }

  ipcMain.handle('wia-list-devices', async () => {
    try {
      const script = `
        try {
          $dm = New-Object -ComObject WIA.DeviceManager
          $list = @()
          for ($i = 1; $i -le $dm.DeviceInfos.Count; $i++) {
            $info = $dm.DeviceInfos.Item($i)
            $list += @{ id = $i; deviceId = $info.DeviceID; name = $info.Description; type = [int]$info.Type }
          }
          if ($list.Count -eq 0) { Write-Output '[]'; exit 0 }
          $list | ConvertTo-Json
        } catch {
          Write-Output '[]'
        }
      `;
      const raw = await runPowerShell(script);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [list];
    } catch (err) {
      console.error('[WIA] Erreur liste périphériques :', err);
      return [];
    }
  });

  ipcMain.handle('wia-scan', async () => {
    try {
      const tmpImage = path.join(tmpDir, `ecolisa_wia_scan_${Date.now()}.jpg`);
      const script = `
        try {
          $dlg = New-Object -ComObject WIA.CommonDialog
          $image = $dlg.ShowAcquireImage(0, 1, 2, '{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}', $true, $true, $false)
          if ($image -eq $null) {
            Write-Output 'CANCEL'
            exit 0
          }
          $image.SaveFile('${tmpImage.replace(/\\/g, '\\\\')}')
          Write-Output 'OK'
        } catch {
          Write-Output 'ERROR:' + $_.Exception.Message
        }
      `;
      const result = await runPowerShell(script);
      if (result.startsWith('ERROR:')) throw new Error(result.slice(6));
      if (result === 'CANCEL' || !fs.existsSync(tmpImage)) return { canceled: true };
      const data = fs.readFileSync(tmpImage);
      fs.unlinkSync(tmpImage);
      return { success: true, base64: data.toString('base64'), mimeType: 'image/jpeg' };
    } catch (err) {
      console.error('[WIA] Erreur scan :', err);
      return { canceled: true, error: err.message };
    }
  });

  // ── IMPRIMANTES & IMPRESSION SILENCIEUSE ─────────────────────────
  // ── IMPRIMANTES & IMPRESSION SILENCIEUSE ─────────────────────────
  ipcMain.handle('get-printers', async (event) => {
    try {
      const sender = event?.sender || (mainWindow ? mainWindow.webContents : null);
      if (sender && typeof sender.getPrintersAsync === 'function') {
        const list = await sender.getPrintersAsync();
        if (Array.isArray(list) && list.length > 0) {
          console.log(`[ECOLISA IPC] ${list.length} imprimantes trouvées via getPrintersAsync.`);
          return list.map(p => ({
            name: p.name,
            displayName: p.displayName || p.name,
            isDefault: p.isDefault,
            status: p.status,
          }));
        }
      }
    } catch (e) {
      console.warn('[ECOLISA IPC] Avertissement getPrintersAsync :', e?.message || e);
    }

    // Fallback Windows PowerShell Get-Printer si getPrintersAsync échoue ou est vide
    if (process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        const cmd = `powershell -NoProfile -Command "Get-Printer | Select-Object Name, Local, Type, Default | ConvertTo-Json"`;
        const out = execSync(cmd, { encoding: 'utf8', timeout: 5000 });
        if (out && out.trim()) {
          const parsed = JSON.parse(out);
          const arr = Array.isArray(parsed) ? parsed : [parsed];
          const list = arr.filter(p => p && p.Name).map(p => ({
            name: p.Name,
            displayName: p.Name,
            isDefault: !!p.Default,
          }));
          if (list.length > 0) {
            console.log(`[ECOLISA IPC] ${list.length} imprimantes trouvées via fallback PowerShell.`);
            return list;
          }
        }
      } catch (err) {
        console.warn('[ECOLISA IPC] Fallback Get-Printer PowerShell echec :', err?.message || err);
      }
    }

    return [];
  });

  ipcMain.handle('print:silent', async (event, { deviceName, silent, html } = {}) => {
    try {
      const isSilent = silent !== false;
      const targetDevice = (deviceName && typeof deviceName === 'string') ? deviceName.trim() : '';
      console.log(`[ECOLISA IPC] Demande d'impression -> Imprimante: "${targetDevice || 'Par défaut'}", Mode silencieux: ${isSilent}`);

      if (html && typeof html === 'string') {
        const { BrowserWindow: BW } = require('electron');
        const printWin = new BW({
          show: false,
          width: 450,
          height: 750,
          webPreferences: { nodeIntegration: false, contextIsolation: true },
        });

        const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { margin: 0 !important; padding: 0 !important; font-family: "Courier New", Courier, monospace, Arial, sans-serif; width: 80mm; color: #000; background: #fff; }
  @page { margin: 0mm !important; size: 80mm auto; }
</style></head><body>${html}</body></html>`;

        await printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(fullHtml));

        return new Promise((resolve) => {
          const printOptions = {
            silent: isSilent,
            printBackground: true,
          };
          if (targetDevice) {
            printOptions.deviceName = targetDevice;
          }

          printWin.webContents.print(printOptions, (success, failureReason) => {
            try { printWin.close(); } catch {}
            if (success) {
              console.log('[ECOLISA IPC] Impression silencieuse réussie.');
              resolve({ success: true });
            } else {
              console.warn('[ECOLISA IPC] Erreur webContents.print :', failureReason);
              resolve({ success: false, error: failureReason || 'Échec de l\'impression silencieuse' });
            }
          });
        });
      }

      // Si pas d'HTML fourni, impression directe de la fenêtre principale
      return new Promise((resolve) => {
        const printOptions = {
          silent: isSilent,
          printBackground: true,
        };
        if (targetDevice) {
          printOptions.deviceName = targetDevice;
        }

        const targetContents = (event && event.sender) || (mainWindow ? mainWindow.webContents : null);
        if (!targetContents) return resolve({ success: false, error: 'Fenêtre introuvable' });

        targetContents.print(printOptions, (success, failureReason) => {
          if (success) {
            console.log('[ECOLISA IPC] Impression de la fenêtre réussie.');
            resolve({ success: true });
          } else {
            console.warn('[ECOLISA IPC] Erreur impression fenêtre :', failureReason);
            resolve({ success: false, error: failureReason || 'Échec de l\'impression' });
          }
        });
      });
    } catch (err) {
      console.error('[ECOLISA IPC] Erreur print:silent :', err);
      return { success: false, error: err.message };
    }
  });

  // Nettoyage de la base de données (Suppression des données de test)
  ipcMain.handle('db:clean-mock-data', () => {
    try {
      const cleanTx = db.transaction(() => {
        db.prepare('DELETE FROM eleves').run();
        db.prepare('DELETE FROM staff').run();
        db.prepare('DELETE FROM invoices').run();
        db.prepare('DELETE FROM payments').run();
        db.prepare('DELETE FROM cotes').run();
        db.prepare('DELETE FROM presences').run();
        db.prepare('DELETE FROM cash_operations').run();
        db.prepare('UPDATE classes SET nombre_eleves = 0').run();
        db.prepare('UPDATE school_years SET nombre_eleves_total = 0').run();
      });
      cleanTx();
      return { success: true, message: 'Base de données nettoyée avec succès. 0 élève et 0 membre du personnel.' };
    } catch (err) {
      console.error('[ECOLISA IPC] Erreur db:clean-mock-data :', err);
      return { success: false, error: err.message };
    }
  });

  // Seeding de données de test massives (Désactivé pour garder la base propre)
  ipcMain.handle('db:seed-data', () => {
    return { success: true, count: 0, message: 'Seeding désactivé. Application en mode propre.' };
  });

  // Fallbacks pour retrocompatibilite IPC (ex: db-load, db-save)
  ipcMain.handle('db-load', () => null);
  ipcMain.handle('db-save', () => ({ success: true }));
}

// ─────────────────────────────────────────────────────────────────────────────
//  FENETRES
// ─────────────────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width:1440, height:900, minWidth:1024, minHeight:700,
    show:false, frame:false, titleBarStyle:'hidden',
    title:'ECOLISA - ERP Scolaire Enterprise (Offline-First)',
    icon: path.join(__dirname,'../public/favicon.svg'),
    webPreferences:{ preload:path.join(__dirname,'preload.cjs'), nodeIntegration:false, contextIsolation:true, sandbox:false },
    backgroundColor:'#0b0f19'
  });
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const url = webContents.getURL();
    const isLocal = url.startsWith('http://localhost:') || url.startsWith('http://127.0.0.1:') || url.startsWith('file://');
    if (isLocal && ['media','mediaKeySystem','camera','microphone'].includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });
  mainWindow.maximize();
  mainWindow.once('ready-to-show', () => { mainWindow.show(); mainWindow.focus(); });
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev || process.env.VITE_DEV_SERVER_URL) mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL||'http://localhost:3000');
  else mainWindow.loadFile(path.join(__dirname,'../dist/index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  initDatabase();
  registerIpcHandlers();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length===0) createWindow(); });
});

app.on('window-all-closed', () => {
  if (db) { try{db.close();}catch(e){} }
  if (process.platform!=='darwin') app.quit();
});
