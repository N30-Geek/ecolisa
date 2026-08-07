/**
 * seedData.cjs - Script de génération de données de test massives (1 125+ élèves, staff, classes, matières)
 * Conforme au Référentiel EPST RDC pour Ecolisa
 */

const NOMS_CONGOLAIS = [
  'KABAMBA', 'MBUYI', 'MUKENDI', 'TSHISEKEDI', 'LUKUSA', 'NTUMBA', 'ILUNGA', 'KASONGO',
  'MUTEBA', 'KAPINGA', 'BAMBA', 'KALALA', 'NGANDU', 'KANYINDA', 'MUHINDO', 'PALUKU',
  'KAMBALE', 'KATEMBO', 'KAVIRA', 'MASIKA', 'MBOKANI', 'LOKONDA', 'BOKETSHU', 'BOLINGA',
  'MOPAO', 'NZUZI', 'KIKWETA', 'LUMUMBA', 'MOBUTU', 'MAYELE', 'KIBUNDI', 'MWAMBA',
  'KABEYA', 'TSHIBANGU', 'MULUMBA', 'MPOYI', 'BADIBANGA', 'NKOYI', 'MAWETE', 'LUZOLO'
];

const PRENOMS_MASCULINS = [
  'Jean-Paul', 'Emmanuel', 'Daniel', 'Samuel', 'David', 'Jonathan', 'Nathan', 'Gédéon',
  'Christian', 'Patrick', 'Serge', 'Olivier', 'Hervé', 'Franck', 'Cedric', 'Junior',
  'Aristote', 'Dieudonné', 'Exaucé', 'Béni', 'Jordy', 'Glody', 'Ephraïm', 'Plamedi',
  'Gradie', 'Mercia', 'Israel', 'Prince', 'Kevin', 'Joel', 'Prosper', 'Fiston'
];

const PRENOMS_FEMININS = [
  'Sarah', 'Grace', 'Esther', 'Ruth', 'Rachel', 'Naomie', 'Deborah', 'Dorcas',
  'Syntyche', 'Priscille', 'Divine', 'Gervais', 'Bénédicte', 'Patience', 'Chantal', 'Hélène',
  'Vanessa', 'Syntia', 'Lydie', 'Clarisse', 'Jemima', 'KETSIA', 'Kerene', 'Eunice',
  'Plamedie', 'Graciella', 'Milca', 'Penielle', 'Miradi', 'Precilia', 'Victoire', 'Eliane'
];

const LIEUX_NAISSANCE = [
  'Kinshasa', 'Lubumbashi', 'Goma', 'Bukavu', 'Matadi', 'Mbuji-Mayi',
  'Kananga', 'Kisangani', 'Kikwit', 'Likasi', 'Kolwezi', 'Kindu'
];

const COMMUNES_KINSHASA = [
  'Gombe', 'Ngaliema', 'Kintambo', 'Lingwala', 'Barumbu', 'Kinshasa',
  'Kasa-Vubu', 'Bandalungwa', 'Selembao', 'Bumbu', 'Makala', 'Ngaba',
  'Lemba', 'Limete', 'Matete', 'Kisenso', 'Masina', 'Ndjili', 'Kimbanseke'
];

const MATIERES_EPST = [
  { code: 'MATH', nom: 'Mathématiques Générales', coef: 4, max: 100, cat: 'SCIENCES' },
  { code: 'PHYS', nom: 'Physique Appliquée', coef: 3, max: 100, cat: 'SCIENCES' },
  { code: 'CHIM', nom: 'Chimie Générale & Organique', coef: 3, max: 100, cat: 'SCIENCES' },
  { code: 'BIO', nom: 'Biologie & Écologie', coef: 2, max: 100, cat: 'SCIENCES' },
  { code: 'FRAN', nom: 'Langue Française & Littérature', coef: 4, max: 100, cat: 'LANGUES' },
  { code: 'ANGL', nom: 'Langue Anglaise (English)', coef: 2, max: 100, cat: 'LANGUES' },
  { code: 'HIST', nom: 'Histoire de la RDC & du Monde', coef: 2, max: 100, cat: 'CULTURE_GENERALE' },
  { code: 'GEO', nom: 'Géographie Physique & Humaine', coef: 2, max: 100, cat: 'CULTURE_GENERALE' },
  { code: 'INFO', nom: 'Informatique & Technologies', coef: 2, max: 100, cat: 'PRATIQUE' },
  { code: 'PED', nom: 'Pédagogie Générale', coef: 4, max: 100, cat: 'OPTION' },
  { code: 'COMPT', nom: 'Comptabilité Générale', coef: 4, max: 100, cat: 'OPTION' },
  { code: 'ECMO', nom: 'Économie & Organisation', coef: 3, max: 100, cat: 'OPTION' },
  { code: 'PHIL', nom: 'Philosophie & Éthique', coef: 2, max: 100, cat: 'CULTURE_GENERALE' },
  { code: 'EDCIV', nom: 'Éducation Civique & Morale', coef: 1, max: 50, cat: 'CULTURE_GENERALE' },
  { code: 'EPS', nom: 'Éducation Physique & Sportive', coef: 1, max: 50, cat: 'PRATIQUE' },
];

const CLASSES_DEFINITIONS = [
  // Maternelle
  { id: 'cls_mat_ps', nom: 'Petite Section Maternelle', cycle: 'MATERNELLE', option: '', salle: 'Salle A-01', ageBase: 3 },
  { id: 'cls_mat_ms', nom: 'Moyenne Section Maternelle', cycle: 'MATERNELLE', option: '', salle: 'Salle A-02', ageBase: 4 },
  { id: 'cls_mat_gs', nom: 'Grande Section Maternelle', cycle: 'MATERNELLE', option: '', salle: 'Salle A-03', ageBase: 5 },

  // Primaire
  { id: 'cls_prim_1p', nom: '1ère Année Primaire', cycle: 'PRIMAIRE', option: '', salle: 'Salle B-01', ageBase: 6 },
  { id: 'cls_prim_2p', nom: '2ème Année Primaire', cycle: 'PRIMAIRE', option: '', salle: 'Salle B-02', ageBase: 7 },
  { id: 'cls_prim_3p', nom: '3ème Année Primaire', cycle: 'PRIMAIRE', option: '', salle: 'Salle B-03', ageBase: 8 },
  { id: 'cls_prim_4p', nom: '4ème Année Primaire', cycle: 'PRIMAIRE', option: '', salle: 'Salle B-04', ageBase: 9 },
  { id: 'cls_prim_5p', nom: '5ème Année Primaire', cycle: 'PRIMAIRE', option: '', salle: 'Salle B-05', ageBase: 10 },
  { id: 'cls_prim_6p', nom: '6ème Année Primaire', cycle: 'PRIMAIRE', option: '', salle: 'Salle B-06', ageBase: 11 },

  // Secondaire CTEB
  { id: 'cls_cteb_7c', nom: '7ème Année CTEB (Tronc Commun)', cycle: 'SECONDAIRE_CTEB', option: '', salle: 'Salle C-01', ageBase: 12 },
  { id: 'cls_cteb_8c', nom: '8ème Année CTEB (Tronc Commun)', cycle: 'SECONDAIRE_CTEB', option: '', salle: 'Salle C-02', ageBase: 13 },

  // Humanités Math-Physique
  { id: 'cls_mp_3h', nom: '1ère Math-Physique (3e Humanités)', cycle: 'HUMANITES', option: 'Math-Physique', salle: 'Salle D-01', ageBase: 14 },
  { id: 'cls_mp_4h', nom: '2ème Math-Physique (4e Humanités)', cycle: 'HUMANITES', option: 'Math-Physique', salle: 'Salle D-02', ageBase: 15 },
  { id: 'cls_mp_5h', nom: '3ème Math-Physique (5e Humanités)', cycle: 'HUMANITES', option: 'Math-Physique', salle: 'Salle D-03', ageBase: 16 },
  { id: 'cls_mp_6h', nom: '4ème Math-Physique (6e Humanités EXETAT)', cycle: 'HUMANITES', option: 'Math-Physique', salle: 'Salle D-04', ageBase: 17 },

  // Humanités Biologie-Chimie
  { id: 'cls_bc_3h', nom: '1ère Biologie-Chimie (3e Humanités)', cycle: 'HUMANITES', option: 'Biologie-Chimie', salle: 'Salle E-01', ageBase: 14 },
  { id: 'cls_bc_4h', nom: '2ème Biologie-Chimie (4e Humanités)', cycle: 'HUMANITES', option: 'Biologie-Chimie', salle: 'Salle E-02', ageBase: 15 },
  { id: 'cls_bc_5h', nom: '3ème Biologie-Chimie (5e Humanités)', cycle: 'HUMANITES', option: 'Biologie-Chimie', salle: 'Salle E-03', ageBase: 16 },
  { id: 'cls_bc_6h', nom: '4ème Biologie-Chimie (6e Humanités EXETAT)', cycle: 'HUMANITES', option: 'Biologie-Chimie', salle: 'Salle E-04', ageBase: 17 },

  // Humanités Commerciale & Gestion
  { id: 'cls_cg_3h', nom: '1ère Commerciale & Gestion (3e Hum)', cycle: 'HUMANITES', option: 'Commerciale', salle: 'Salle F-01', ageBase: 14 },
  { id: 'cls_cg_4h', nom: '2ème Commerciale & Gestion (4e Hum)', cycle: 'HUMANITES', option: 'Commerciale', salle: 'Salle F-02', ageBase: 15 },
  { id: 'cls_cg_5h', nom: '3ème Commerciale & Gestion (5e Hum)', cycle: 'HUMANITES', option: 'Commerciale', salle: 'Salle F-03', ageBase: 16 },
  { id: 'cls_cg_6h', nom: '4ème Commerciale & Gestion (6e Hum EXETAT)', cycle: 'HUMANITES', option: 'Commerciale', salle: 'Salle F-04', ageBase: 17 },

  // Humanités Pédagogie Générale
  { id: 'cls_ped_3h', nom: '1ère Pédagogie Générale (3e Hum)', cycle: 'HUMANITES', option: 'Pédagogie', salle: 'Salle G-01', ageBase: 14 },
  { id: 'cls_ped_4h', nom: '2ème Pédagogie Générale (4e Hum)', cycle: 'HUMANITES', option: 'Pédagogie', salle: 'Salle G-02', ageBase: 15 },
  { id: 'cls_ped_5h', nom: '3ème Pédagogie Générale (5e Hum)', cycle: 'HUMANITES', option: 'Pédagogie', salle: 'Salle G-03', ageBase: 16 },
  { id: 'cls_ped_6h', nom: '4ème Pédagogie Générale (6e Hum EXETAT)', cycle: 'HUMANITES', option: 'Pédagogie', salle: 'Salle G-04', ageBase: 17 },
];

const STAFF_ADMINISTRATIF = [
  { prenom: 'Joseph', nom: 'MUKADI', role: 'PREFET', spec: 'Doctorat en Gestion Éducative', tel: '+243 81 555 01 01', email: 'prefet.mukadi@ecolisa.edu', sal: 1200 },
  { prenom: 'Antoine', nom: 'KABILA', role: 'DE', spec: 'Master en Pédagogie Appliquée', tel: '+243 81 555 01 02', email: 'de.kabila@ecolisa.edu', sal: 950 },
  { prenom: 'Robert', nom: 'NGANDU', role: 'SURVEILLANT', spec: 'Licence en Criminologie & Discipline', tel: '+243 81 555 01 03', email: 'discipline.ngandu@ecolisa.edu', sal: 750 },
  { prenom: 'Hélène', nom: 'KASONGO', role: 'COMPTABLE', spec: 'Licence en Sciences Financières', tel: '+243 81 555 01 04', email: 'compta.kasongo@ecolisa.edu', sal: 850 },
  { prenom: 'Patrick', nom: 'BAMBA', role: 'COMPTABLE', spec: 'Graduat en Gestion d’Entreprise', tel: '+243 81 555 01 05', email: 'intendant.bamba@ecolisa.edu', sal: 700 },
  { prenom: 'Chantal', nom: 'TSHIBOLA', role: 'ADMIN', spec: 'Secrétariat de Direction EPST', tel: '+243 81 555 01 06', email: 'secretariat.tshibola@ecolisa.edu', sal: 600 },
];

const PROFESSEURS_SPEC = [
  { prenom: 'Alain', nom: 'KABEYA', spec: 'Mathématiques & Physique', sal: 650 },
  { prenom: 'Benoit', nom: 'MUTOMBO', spec: 'Chimie & Biologie', sal: 620 },
  { prenom: 'Christine', nom: 'MUKENDI', spec: 'Langue Française', sal: 600 },
  { prenom: 'David', nom: 'KANYINDA', spec: 'Langue Anglaise', sal: 580 },
  { prenom: 'Eric', nom: 'LUKUSA', spec: 'Informatique & Technologies', sal: 650 },
  { prenom: 'Florence', nom: 'NTUMBA', spec: 'Pédagogie & Psychologie', sal: 600 },
  { prenom: 'Gabriel', nom: 'MBUYI', spec: 'Comptabilité & Économie', sal: 640 },
  { prenom: 'Henriette', nom: 'ILUNGA', spec: 'Histoire & Géographie', sal: 580 },
  { prenom: 'Ignace', nom: 'KALALA', spec: 'Physique & Électricité', sal: 630 },
  { prenom: 'Jeanne', nom: 'BADIBANGA', spec: 'Biologie & Écologie', sal: 590 },
  { prenom: 'Lucien', nom: 'MAWETE', spec: 'Philosophie', sal: 600 },
  { prenom: 'Marcel', nom: 'NZUZI', spec: 'Éducation Physique', sal: 550 },
  { prenom: 'Nathalie', nom: 'KAPINGA', spec: 'Enseignante Maternelle', sal: 500 },
  { prenom: 'Pascaline', nom: 'KAVIRA', spec: 'Enseignante Primaire 1P/2P', sal: 520 },
  { prenom: 'Romain', nom: 'PALUKU', spec: 'Enseignant Primaire 3P/4P', sal: 530 },
  { prenom: 'Solange', nom: 'KAMBALE', spec: 'Enseignante Primaire 5P/6P', sal: 540 },
];

function seedDatabase(db) {
  console.log('[ECOLISA Seeder] Début de la génération de plus de 1 116 élèves, staff et matières...');

  const syId = 'sy_2026_2027';

  // 1. Transaction de peuplement rapide
  const transaction = db.transaction(() => {
    // A. Année Scolaire 2026-2027
    db.prepare(`
      INSERT OR REPLACE INTO school_years (
        id, nom, statut, debut, fin, nombre_eleves_total,
        frais_inscription, frais_connexion, frais_reinscription, frais_carte
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(syId, '2026–2027', 'EN_COURS', '2026-09-01', '2027-07-02', 1125, 50, 10, 35, 10);

    // Activer l'année scolaire dans app_config
    db.prepare(`INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)`).run('active_school_year_id', syId);

    // B. Matières / Disciplines
    const insertSubject = db.prepare(`
      INSERT OR REPLACE INTO subjects (id, code, nom, coefficient, max_score, categorie)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    MATIERES_EPST.forEach((m) => {
      insertSubject.run(`sub_${m.code.toLowerCase()}`, m.code, m.nom, m.coef, m.max, m.cat);
    });

    // C. Classes
    const insertClass = db.prepare(`
      INSERT OR REPLACE INTO classes (id, cycle_id, school_year_id, option_code, salle_code, nom, salle, nombre_eleves, professeur_titulaire)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    CLASSES_DEFINITIONS.forEach((c) => {
      insertClass.run(c.id, c.cycle, syId, c.option, c.salle, c.nom, c.salle, 45, 'Prof. ' + c.nom);
    });

    // D. Staff & Personnel Administratif
    const insertStaff = db.prepare(`
      INSERT OR REPLACE INTO staff (id, nom, prenom, role, telephone, email, salaire_base, devise, statut, data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Staff Administratif
    STAFF_ADMINISTRATIF.forEach((s, idx) => {
      const staffId = `stf_admin_${idx + 1}`;
      const dataJson = JSON.stringify({
        numeroMatriculeEPST: `EPST-STF-${100 + idx}`,
        matricule: `STF-${100 + idx}`,
        genre: idx % 2 === 0 ? 'M' : 'F',
        sexe: idx % 2 === 0 ? 'M' : 'F',
        qualification: s.spec,
        dateEmbauche: '2020-09-01',
        modeVersementSalaire: 'BANQUE',
        banqueNom: 'Rawbank RDC',
        numeroCompteBancaire: `00010-${2000 + idx}-100`,
      });
      insertStaff.run(staffId, s.nom, s.prenom, s.role, s.tel, s.email, s.sal, 'USD', 'ACTIF', dataJson);
    });

    // Professeurs Enseignants
    PROFESSEURS_SPEC.forEach((p, idx) => {
      const staffId = `stf_prof_${idx + 1}`;
      const dataJson = JSON.stringify({
        numeroMatriculeEPST: `EPST-PROF-${200 + idx}`,
        matricule: `PROF-${200 + idx}`,
        genre: idx % 2 === 0 ? 'M' : 'F',
        sexe: idx % 2 === 0 ? 'M' : 'F',
        qualification: p.spec,
        specialite: p.spec,
        dateEmbauche: '2021-09-01',
        modeVersementSalaire: 'MOBILE_MONEY',
        mobileMoneyOperateur: 'M-Pesa',
        mobileMoneyNumero: `+243 81 777 ${10 + idx} ${10 + idx}`,
      });
      insertStaff.run(staffId, p.nom, p.prenom, 'ENSEIGNANT', `+243 81 777 00 ${idx}`, `prof.${p.nom.toLowerCase()}@ecolisa.edu`, p.sal, 'USD', 'ACTIF', dataJson);
    });

    // E. 1 125 Élèves Répartis dans les 24 classes
    const insertEleve = db.prepare(`
      INSERT OR REPLACE INTO eleves (
        id, registration_number, prenom, nom, postnom, sexe,
        date_naissance, lieu_naissance, class_id, school_year_id,
        statut, photo_url, nom_parent, contact_parent, adresse, data_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let studentCounter = 1;
    CLASSES_DEFINITIONS.forEach((cls) => {
      const targetCountPerClass = 47; // 24 classes * 47 = 1 128 élèves
      for (let i = 0; i < targetCountPerClass; i++) {
        const id = `eleve_${studentCounter}`;
        const regNum = `2026-EPST-${String(studentCounter).padStart(4, '0')}`;
        const isBoy = (studentCounter % 2 === 0);
        const nom = NOMS_CONGOLAIS[studentCounter % NOMS_CONGOLAIS.length];
        const postnom = NOMS_CONGOLAIS[(studentCounter + 3) % NOMS_CONGOLAIS.length];
        const prenomList = isBoy ? PRENOMS_MASCULINS : PRENOMS_FEMININS;
        const prenom = prenomList[studentCounter % prenomList.length];
        const sexe = isBoy ? 'M' : 'F';

        const birthYear = 2026 - cls.ageBase - Math.floor(Math.random() * 2);
        const birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
        const dateNaissance = `${birthYear}-${birthMonth}-${birthDay}`;
        const lieuNaissance = LIEUX_NAISSANCE[studentCounter % LIEUX_NAISSANCE.length];

        const parentNom = `Parent ${nom} ${postnom}`;
        const commune = COMMUNES_KINSHASA[studentCounter % COMMUNES_KINSHASA.length];
        const contactParent = `+243 81 ${100 + (studentCounter % 900)} ${10 + (studentCounter % 89)} ${10 + (studentCounter % 89)}`;
        const adresse = `N° ${1 + (studentCounter % 150)}, Av. ${nom}, Q/ ${commune}, Kinshasa`;

        const dataJson = JSON.stringify({
          nationalite: 'Congolaise (RDC)',
          groupeSanguin: ['O+', 'A+', 'B+', 'AB+'][studentCounter % 4],
          cycle: cls.cycle,
          option: cls.option,
          nomClasse: cls.nom,
          professionParent: ['Médecin', 'Enseignant', 'Commerçant', 'Ingénieur', 'Avocat', 'Fonctionnaire'][studentCounter % 6],
          emailParent: `parent.${nom.toLowerCase()}${studentCounter}@gmail.com`,
          notesPsychopedagogiques: 'Élève discipliné, assidu et appliqué.',
        });

        insertEleve.run(
          id, regNum, prenom, nom, postnom, sexe,
          dateNaissance, lieuNaissance, cls.id, syId,
          'ACTIF', '', parentNom, contactParent, adresse, dataJson
        );

        studentCounter++;
      }
    });

    console.log(`[ECOLISA Seeder] Succès ! ${studentCounter - 1} élèves insérés dans 24 classes.`);
  });

  transaction();
}

module.exports = { seedDatabase };
