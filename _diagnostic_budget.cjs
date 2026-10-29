const Database = require('better-sqlite3');
const db = new Database('C:\\Users\\n30g3\\AppData\\Roaming\\ecolisa\\ecolisa_database.db');

function jp(v, fb = '{}') {
  try { return JSON.parse(v || fb); } catch { return {}; }
}

function columns(t) {
  return db.pragma(`table_info(${t})`).map(c => c.name);
}

const budgets = db.prepare("SELECT id, school_year_id, periode, date_debut, date_fin, categorie, type, montant, devise, data_json FROM budgets ORDER BY type, categorie").all()
  .map(r => ({ ...r, ...jp(r.data_json) }));

const feeTypes = db.prepare("SELECT id, nom, categorie, montant, devise, school_year_id FROM fee_types ORDER BY categorie").all();

const payments = db.prepare("SELECT id, montant, date_paiement, data_json FROM payments ORDER BY date_paiement DESC").all()
  .map(r => ({ ...r, ...jp(r.data_json) }));

const cashOps = db.prepare("SELECT id, date_operation, libelle, montant, devise, type, categorie, origine, origine_id FROM cash_operations WHERE type='ENTREE' ORDER BY date_operation DESC").all();

console.log('=== BUDGETS ===');
console.table(budgets.map(b => ({ id: b.id.slice(0, 8), annee: b.school_year_id, periode: b.periode, debut: b.date_debut, fin: b.date_fin, cat: b.categorie, nature: b.nature || b.type, montant: b.montant, devise: b.devise })));

console.log('\n=== TYPES DE FRAIS (catégories) ===');
console.table(feeTypes.map(f => ({ id: f.id.slice(0, 8), annee: f.school_year_id, nom: f.nom, cat: f.categorie, montant: f.montant, devise: f.devise })));

console.log('\n=== PAIEMENTS ===');
payments.forEach(p => {
  console.log(p.id.slice(0, 8), p.date_paiement?.split('T')[0], p.montant, p.devise, p.nomEleve || p.studentId || p.eleveId, 'allocs:', JSON.stringify(p.allocations || []));
});

console.log('\n=== OPÉRATIONS CAISSE ENTRÉE ===');
cashOps.forEach(o => {
  console.log(o.id.slice(0, 8), o.date_operation?.split('T')[0], o.montant, o.devise, o.categorie, '->', o.libelle);
});
