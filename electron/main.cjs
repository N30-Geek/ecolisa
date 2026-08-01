const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const { scryptSync, randomBytes, timingSafeEqual } = require('crypto');

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
        salles_json         TEXT DEFAULT '[]',
        semestres_json      TEXT DEFAULT '[]',
        periodes_json       TEXT DEFAULT '[]'
      );
      CREATE TABLE IF NOT EXISTS classes (
        id                   TEXT PRIMARY KEY,
        cycle_id             TEXT,
        school_year_id       TEXT,
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
      CREATE TABLE IF NOT EXISTS current_session (
        id        INTEGER PRIMARY KEY CHECK (id = 1),
        user_json TEXT
      );
    `);

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

    // 4. Seed annee scolaire par defaut si vide
    const yc = db.prepare('SELECT COUNT(*) as c FROM school_years').get();
    if (yc.c === 0) {
      db.prepare(`INSERT INTO school_years (id,nom,statut,debut,fin,cycles_json,salles_json,periodes_json) VALUES (?,?,?,?,?,?,?,?)`).run(
        'ay-default','2025-2026','EN_COURS','2025-09-08','2026-07-04',
        '[{"id":"cy-1","code":"PRIMAIRE","nom":"Cycle Primaire","actif":true,"classesCount":0,"sallesCount":0}]',
        '[{"id":"sa-1","codeSalle":"A01","nomSalle":"Salle A01","capacite":40,"cycleCode":"PRIMAIRE"}]',
        '[{"id":"pe-1","nom":"1ere Periode","debut":"2025-09-08","fin":"2025-10-31","type":"PERIOD"}]'
      );
    }

    console.log('✅ [ECOLISA] SQLite relationnel pret :', dbPath);
    return true;
  } catch (err) {
    console.error('❌ [ECOLISA] Erreur SQLite :', err.message);
    db = null;
    return false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  MAPPERS SQLite -> camelCase JS
// ─────────────────────────────────────────────────────────────────────────────
const jp = (v, fb='[]') => { try { return JSON.parse(v||fb); } catch { return JSON.parse(fb); } };

function mapUser(r) { return { id:r.id, email:r.email, nom:r.nom, prenom:r.prenom, role:r.role, pinCode:r.pin_code, avatarUrl:r.avatar_url, statut:r.statut, telephone:r.telephone, creeLe:r.cree_le, derniereConnexion:r.derniere_connexion }; }
function mapYear(r) { return { id:r.id, nom:r.nom, statut:r.statut, debut:r.debut, fin:r.fin, nombreElevesTotal:r.nombre_eleves_total||0, fraisInscription:r.frais_inscription||0, fraisConnexion:r.frais_connexion||0, fraisReinscription:r.frais_reinscription||0, fraisCarte:r.frais_carte||0, fraisAnnexes:jp(r.frais_annexes_json), cycles:jp(r.cycles_json), salles:jp(r.salles_json), semestres:jp(r.semestres_json), periodes:jp(r.periodes_json) }; }
function mapClass(r) { return { id:r.id, cycleId:r.cycle_id, schoolYearId:r.school_year_id, nom:r.nom, salle:r.salle, nombreEleves:r.nombre_eleves||0, professeurTitulaire:r.professeur_titulaire }; }
function mapEleve(r) { const b={id:r.id,registrationNumber:r.registration_number,prenom:r.prenom,nom:r.nom,postnom:r.postnom,sexe:r.sexe,dateNaissance:r.date_naissance,lieuNaissance:r.lieu_naissance,classId:r.class_id,schoolYearId:r.school_year_id,statut:r.statut,photoUrl:r.photo_url,nomParent:r.nom_parent,contactParent:r.contact_parent,adresse:r.adresse}; try{return{...JSON.parse(r.data_json||'{}'),...b};}catch{return b;} }
function mapInvoice(r) { const b={id:r.id,eleveId:r.eleve_id,schoolYearId:r.school_year_id,montantTotal:r.montant_total,montantPaye:r.montant_paye,statut:r.statut,dateEcheance:r.date_echeance}; try{return{...JSON.parse(r.data_json||'{}'),...b};}catch{return b;} }
function mapPayment(r) { const b={id:r.id,invoiceId:r.invoice_id,eleveId:r.eleve_id,montant:r.montant,methode:r.methode,datePaiement:r.date_paiement,recuNumero:r.recu_numero,encaissePar:r.encaisse_par}; try{return{...JSON.parse(r.data_json||'{}'),...b};}catch{return b;} }
function mapExpense(r) { return {id:r.id,motif:r.motif,montant:r.montant,categorie:r.categorie,validePar:r.valide_par,date:r.date_depense,modePaiement:r.mode_paiement,pieceJustificative:r.piece_justificative}; }
function mapStaff(r) { const b={id:r.id,nom:r.nom,prenom:r.prenom,role:r.role,telephone:r.telephone,email:r.email,salaireBase:r.salaire_base,devise:r.devise,statut:r.statut}; try{return{...JSON.parse(r.data_json||'{}'),...b};}catch{return b;} }

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
  ipcMain.handle('db-set-current-session', (_, sess) => { if (!db) return false; if(sess){db.prepare('INSERT OR REPLACE INTO current_session (id,user_json) VALUES (1,?)').run(JSON.stringify(sess)); if(sess.id) db.prepare('UPDATE users SET derniere_connexion=datetime("now") WHERE id=?').run(sess.id);} else {db.prepare('DELETE FROM current_session WHERE id=1').run();} return true; });

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

  // Verification des identifiants — toujours en temps constant (prévient les timing attacks)
  ipcMain.handle('db-verify-credentials', (_, email, password) => {
    if (!db) return null;
    const r = db.prepare("SELECT * FROM users WHERE LOWER(email)=LOWER(?) AND statut='ACTIF'").get(email);
    if (!r) {
      // Faire un travail fictif pour égaliser le temps de réponse (anti-enumeration)
      scryptSync(password + 'fake_work', randomBytes(32).toString('hex'), 64);
      return null;
    }
    if (!r.password_hash) {
      // Compte sans mot de passe (migration) — refusé sauf si aucun compte n'a de mot de passe
      return null;
    }
    if (!verifyPassword(password, r.password_hash)) return null;
    // Mise à jour de la dernière connexion
    db.prepare("UPDATE users SET derniere_connexion=datetime('now') WHERE id=?").run(r.id);
    return mapUser(r);
  });

  // School Years
  ipcMain.handle('db-get-school-years', () => { if (!db) return []; return db.prepare('SELECT * FROM school_years ORDER BY debut DESC').all().map(mapYear); });
  ipcMain.handle('db-get-school-year', (_, id) => { if (!db) return null; const r=db.prepare('SELECT * FROM school_years WHERE id=?').get(id); return r?mapYear(r):null; });
  ipcMain.handle('db-add-school-year', (_, y) => { if (!db) return null; db.prepare('INSERT OR REPLACE INTO school_years (id,nom,statut,debut,fin,nombre_eleves_total,frais_inscription,frais_connexion,frais_reinscription,frais_carte,frais_annexes_json,cycles_json,salles_json,semestres_json,periodes_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(y.id,y.nom,y.statut||'EN_COURS',y.debut||'',y.fin||'',y.nombreElevesTotal||0,y.fraisInscription||0,y.fraisConnexion||0,y.fraisReinscription||0,y.fraisCarte||0,JSON.stringify(y.fraisAnnexes||[]),JSON.stringify(y.cycles||[]),JSON.stringify(y.salles||[]),JSON.stringify(y.semestres||[]),JSON.stringify(y.periodes||[])); return mapYear(db.prepare('SELECT * FROM school_years WHERE id=?').get(y.id)); });
  ipcMain.handle('db-update-school-year', (_, id, upd) => { if (!db) return null; const r=db.prepare('SELECT * FROM school_years WHERE id=?').get(id); if(!r) return null; const m={...mapYear(r),...upd}; db.prepare('UPDATE school_years SET nom=?,statut=?,debut=?,fin=?,nombre_eleves_total=?,frais_inscription=?,frais_connexion=?,frais_reinscription=?,frais_carte=?,frais_annexes_json=?,cycles_json=?,salles_json=?,semestres_json=?,periodes_json=? WHERE id=?').run(m.nom,m.statut,m.debut,m.fin,m.nombreElevesTotal||0,m.fraisInscription||0,m.fraisConnexion||0,m.fraisReinscription||0,m.fraisCarte||0,JSON.stringify(m.fraisAnnexes||[]),JSON.stringify(m.cycles||[]),JSON.stringify(m.salles||[]),JSON.stringify(m.semestres||[]),JSON.stringify(m.periodes||[]),id); return mapYear(db.prepare('SELECT * FROM school_years WHERE id=?').get(id)); });
  ipcMain.handle('db-delete-school-year', (_, id) => { if (!db) return false; db.prepare('DELETE FROM school_years WHERE id=?').run(id); return true; });

  // Classes
  ipcMain.handle('db-get-classes', (_, yearId) => { if (!db) return []; if (yearId) return db.prepare('SELECT * FROM classes WHERE school_year_id=? ORDER BY nom').all(yearId).map(mapClass); return db.prepare('SELECT * FROM classes ORDER BY nom').all().map(mapClass); });
  ipcMain.handle('db-add-class', (_, c) => { if (!db) return null; db.prepare('INSERT OR REPLACE INTO classes (id,cycle_id,school_year_id,nom,salle,nombre_eleves,professeur_titulaire) VALUES (?,?,?,?,?,?,?)').run(c.id,c.cycleId||null,c.schoolYearId||null,c.nom,c.salle||null,c.nombreEleves||0,c.professeurTitulaire||null); return mapClass(db.prepare('SELECT * FROM classes WHERE id=?').get(c.id)); });
  ipcMain.handle('db-update-class', (_, id, upd) => { if (!db) return null; const f=[],v=[]; if(upd.nom!==undefined){f.push('nom=?');v.push(upd.nom);} if(upd.salle!==undefined){f.push('salle=?');v.push(upd.salle);} if(upd.cycleId!==undefined){f.push('cycle_id=?');v.push(upd.cycleId);} if(upd.nombreEleves!==undefined){f.push('nombre_eleves=?');v.push(upd.nombreEleves);} if(upd.professeurTitulaire!==undefined){f.push('professeur_titulaire=?');v.push(upd.professeurTitulaire);} if(!f.length) return null; v.push(id); db.prepare(`UPDATE classes SET ${f.join(',')} WHERE id=?`).run(...v); return mapClass(db.prepare('SELECT * FROM classes WHERE id=?').get(id)); });
  ipcMain.handle('db-delete-class', (_, id) => { if (!db) return false; db.prepare('DELETE FROM classes WHERE id=?').run(id); return true; });

  // Subjects
  ipcMain.handle('db-get-subjects', () => { if (!db) return []; return db.prepare('SELECT * FROM subjects ORDER BY nom').all(); });
  ipcMain.handle('db-add-subject', (_, s) => { if (!db) return null; db.prepare('INSERT OR REPLACE INTO subjects (id,code,nom,coefficient,max_score,categorie) VALUES (?,?,?,?,?,?)').run(s.id,s.code,s.nom,s.coefficient||1,s.maxScore||100,s.categorie||'GENERAL'); return db.prepare('SELECT * FROM subjects WHERE id=?').get(s.id); });
  ipcMain.handle('db-delete-subject', (_, id) => { if (!db) return false; db.prepare('DELETE FROM subjects WHERE id=?').run(id); return true; });

  // Eleves
  ipcMain.handle('db-get-eleves', (_, filters) => { if (!db) return []; let q='SELECT * FROM eleves',p=[]; if(filters?.classId){q+=' WHERE class_id=?';p.push(filters.classId);} else if(filters?.schoolYearId){q+=' WHERE school_year_id=?';p.push(filters.schoolYearId);} q+=' ORDER BY nom,prenom'; return db.prepare(q).all(...p).map(mapEleve); });
  ipcMain.handle('db-add-eleve', (_, e) => { if (!db) return null; db.prepare('INSERT OR REPLACE INTO eleves (id,registration_number,prenom,nom,postnom,sexe,date_naissance,lieu_naissance,class_id,school_year_id,statut,photo_url,nom_parent,contact_parent,adresse,data_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(e.id,e.registrationNumber||null,e.prenom,e.nom,e.postnom||null,e.sexe||'M',e.dateNaissance||null,e.lieuNaissance||null,e.classId||null,e.schoolYearId||null,e.statut||'ACTIF',e.photoUrl||null,e.nomParent||null,e.contactParent||null,e.adresse||null,JSON.stringify(e)); if(e.classId) db.prepare('UPDATE classes SET nombre_eleves=nombre_eleves+1 WHERE id=?').run(e.classId); return mapEleve(db.prepare('SELECT * FROM eleves WHERE id=?').get(e.id)); });
  ipcMain.handle('db-update-eleve', (_, id, upd) => { if (!db) return null; const r=db.prepare('SELECT * FROM eleves WHERE id=?').get(id); if(!r) return null; const m={...mapEleve(r),...upd}; db.prepare('UPDATE eleves SET prenom=?,nom=?,postnom=?,sexe=?,date_naissance=?,class_id=?,school_year_id=?,statut=?,nom_parent=?,contact_parent=?,adresse=?,data_json=? WHERE id=?').run(m.prenom,m.nom,m.postnom||null,m.sexe||'M',m.dateNaissance||null,m.classId||null,m.schoolYearId||null,m.statut||'ACTIF',m.nomParent||null,m.contactParent||null,m.adresse||null,JSON.stringify(m),id); return mapEleve(db.prepare('SELECT * FROM eleves WHERE id=?').get(id)); });
  ipcMain.handle('db-delete-eleve', (_, id) => { if (!db) return false; const r=db.prepare('SELECT class_id FROM eleves WHERE id=?').get(id); db.prepare('DELETE FROM eleves WHERE id=?').run(id); if(r?.class_id) db.prepare('UPDATE classes SET nombre_eleves=MAX(0,nombre_eleves-1) WHERE id=?').run(r.class_id); return true; });

  // Finances
  ipcMain.handle('db-get-invoices', (_, yearId) => { if (!db) return []; if(yearId) return db.prepare('SELECT * FROM invoices WHERE school_year_id=? ORDER BY date_echeance DESC').all(yearId).map(mapInvoice); return db.prepare('SELECT * FROM invoices ORDER BY date_echeance DESC').all().map(mapInvoice); });
  ipcMain.handle('db-add-invoice', (_, inv) => { if (!db) return null; db.prepare('INSERT OR REPLACE INTO invoices (id,eleve_id,school_year_id,montant_total,montant_paye,statut,date_echeance,data_json) VALUES (?,?,?,?,?,?,?,?)').run(inv.id,inv.eleveId||null,inv.schoolYearId||null,inv.montantTotal||0,inv.montantPaye||0,inv.statut||'EN_ATTENTE',inv.dateEcheance||null,JSON.stringify(inv)); return mapInvoice(db.prepare('SELECT * FROM invoices WHERE id=?').get(inv.id)); });
  ipcMain.handle('db-update-invoice', (_, id, upd) => { if (!db) return null; const f=[],v=[]; if(upd.montantPaye!==undefined){f.push('montant_paye=?');v.push(upd.montantPaye);} if(upd.statut!==undefined){f.push('statut=?');v.push(upd.statut);} if(!f.length) return null; v.push(id); db.prepare(`UPDATE invoices SET ${f.join(',')} WHERE id=?`).run(...v); return mapInvoice(db.prepare('SELECT * FROM invoices WHERE id=?').get(id)); });
  ipcMain.handle('db-get-payments', (_, invoiceId) => { if (!db) return []; if(invoiceId) return db.prepare('SELECT * FROM payments WHERE invoice_id=? ORDER BY date_paiement DESC').all(invoiceId).map(mapPayment); return db.prepare('SELECT * FROM payments ORDER BY date_paiement DESC').all().map(mapPayment); });
  ipcMain.handle('db-add-payment', (_, p) => { if (!db) return null; db.prepare('INSERT OR REPLACE INTO payments (id,invoice_id,eleve_id,montant,methode,date_paiement,recu_numero,encaisse_par,data_json) VALUES (?,?,?,?,?,?,?,?,?)').run(p.id,p.invoiceId||null,p.eleveId||null,p.montant,p.methode||'CASH',p.datePaiement||null,p.recuNumero||null,p.encaissePar||null,JSON.stringify(p)); return mapPayment(db.prepare('SELECT * FROM payments WHERE id=?').get(p.id)); });
  ipcMain.handle('db-get-expenses', () => { if (!db) return []; return db.prepare('SELECT * FROM expenses ORDER BY date_depense DESC').all().map(mapExpense); });
  ipcMain.handle('db-add-expense', (_, e) => { if (!db) return null; db.prepare('INSERT OR REPLACE INTO expenses (id,motif,montant,categorie,valide_par,date_depense,mode_paiement,piece_justificative) VALUES (?,?,?,?,?,?,?,?)').run(e.id,e.motif,e.montant,e.categorie||'GENERAL',e.validePar||null,e.date||null,e.modePaiement||'CASH',e.pieceJustificative||null); return mapExpense(db.prepare('SELECT * FROM expenses WHERE id=?').get(e.id)); });
  ipcMain.handle('db-delete-expense', (_, id) => { if (!db) return false; db.prepare('DELETE FROM expenses WHERE id=?').run(id); return true; });

  // Staff
  ipcMain.handle('db-get-staff', () => { if (!db) return []; return db.prepare('SELECT * FROM staff ORDER BY nom').all().map(mapStaff); });
  ipcMain.handle('db-add-staff', (_, m) => { if (!db) return null; db.prepare('INSERT OR REPLACE INTO staff (id,nom,prenom,role,telephone,email,salaire_base,devise,statut,data_json) VALUES (?,?,?,?,?,?,?,?,?,?)').run(m.id,m.nom,m.prenom||null,m.role||null,m.telephone||null,m.email||null,m.salaireBase||0,m.devise||'USD',m.statut||'ACTIF',JSON.stringify(m)); return mapStaff(db.prepare('SELECT * FROM staff WHERE id=?').get(m.id)); });
  ipcMain.handle('db-delete-staff', (_, id) => { if (!db) return false; db.prepare('DELETE FROM staff WHERE id=?').run(id); return true; });

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
