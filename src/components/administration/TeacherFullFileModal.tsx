import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, FileText, ShieldCheck } from 'lucide-react';
import { MembrePersonnel, UserAccount } from '../../types';
import { LocalDatabaseService } from '../../services/localDatabase';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { formatCurrency } from '../../utils/currency';
import { getRoleInfo } from './UsersManager';

interface TeacherFullFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: MembrePersonnel;
}

export const TeacherFullFileModal: React.FC<TeacherFullFileModalProps> = ({
  isOpen,
  onClose,
  teacher
}) => {
  const { config, currency, exchangeRate } = useSchoolConfig();
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);

  useEffect(() => {
    if (isOpen && teacher) {
      LocalDatabaseService.getUserByStaff(teacher)
        .then(acc => setUserAccount(acc))
        .catch(() => setUserAccount(null));
    }
  }, [isOpen, teacher]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const gradeLabel: Record<string, string> = {
    DOCTEUR: 'Docteur (PhD)', DES: 'DES / Master 2', LICENCIE: 'Licencié (L2 / Bac +5)',
    AGREGE: 'Agrégé EPST', GRADUAT: 'Gradué (L1 / Bac +3)', AUTRE: 'Autre Qualification',
  };

  const roleLabel: Record<string, string> = {
    ENSEIGNANT: 'Enseignant / Professeur de Cours',
    COMPTABLE: 'Comptable Intendant Général',
    PREFET: 'Préfet des Études / Directeur d’Établissement',
    SURVEILLANT: 'Directeur de Discipline / Surveillant',
    DE: 'Directeur des Études (DE)',
    ADMIN: 'Administrateur Général / Secrétariat',
    PROMOTEUR_ADMIN: 'Promoteur & Administrateur Général',
  };

  const formattedSalary = formatCurrency(
    teacher.salaireBase || 0,
    teacher.devise || currency,
    teacher.devise || 'USD',
    exchangeRate
  );

  const titularsList = Array.from(new Set([
    ...(teacher.classesTitularisees || []),
    teacher.classeTitulaireId,
    teacher.salleUniqueId,
    teacher.optionTitulaireCode
  ].filter(Boolean)));

  const assignedClassesList = teacher.classesAssignees && teacher.classesAssignees.length > 0
    ? teacher.classesAssignees.join(', ')
    : 'Ensemble de l’établissement';

  const coursesList = teacher.coursAttribues && teacher.coursAttribues.length > 0
    ? teacher.coursAttribues.join(', ')
    : (teacher.disciplines && teacher.disciplines.length > 0 ? teacher.disciplines.join(', ') : 'Toutes les disciplines de la promotion');

  return createPortal(
    <div className="fixed inset-0 w-full h-full z-[9999] bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable-teacher-file, #printable-teacher-file * { visibility: visible !important; }
          #printable-teacher-file {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 25px !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-in">
        {/* BARRE D'ACTIONS TOP (NO PRINT) */}
        <div className="px-6 py-4 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between no-print shrink-0 font-sans">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Fiche Officielle du Personnel & Enseignant
              </h3>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Document d'archivage administratif · {teacher.prenom} {teacher.nom}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimer la Fiche
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* DOCUMENT ADMINISTRATIF CLASSIQUE (POLICE SANS-SERIF Haute Lisibilité, DISTINCTION CLAIRE LABELS/VALEURS) */}
        <div id="printable-teacher-file" className="p-8 sm:p-10 overflow-y-auto space-y-6 text-slate-900 font-sans leading-normal bg-white">
          
          {/* EN-TÊTE OFFICIEL EPST RDC */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              {config?.logoUrl && (
                <div className="w-20 h-20 overflow-hidden shrink-0 border border-slate-300 rounded-lg p-1 bg-slate-50">
                  <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                </div>
              )}
              <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  RÉPUBLIQUE DÉMOCRATIQUE DU CONGO
                </p>
                <p className="text-[10.5px] font-extrabold uppercase text-slate-700">
                  MINISTÈRE DE L'ÉDUCATION NATIONALE ET INITIATION À LA NOUVELLE CITOYENNETÉ (EPST)
                </p>
                <h1 className="text-base font-black uppercase text-indigo-950 tracking-tight">
                  {config?.schoolName || 'ÉCOLISA ENTERPRISE RDC'}
                </h1>
                <p className="text-xs font-semibold text-slate-600">
                  Province Éducative : {config?.province || 'Kinshasa'} {config?.subDivision ? `• ${config.subDivision}` : ''}
                </p>
                {config?.secopeCode && (
                  <p className="text-xs font-black text-indigo-700">Code SECOPE / Agrément : {config.secopeCode}</p>
                )}
              </div>
            </div>

            <div className="text-right flex flex-col items-end shrink-0">
              <div className="w-24 h-28 border-2 border-slate-800 rounded-lg overflow-hidden bg-slate-100 mb-1.5 shadow-xs">
                {teacher.avatarUrl || teacher.photoUrl ? (
                  <img src={teacher.avatarUrl || teacher.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-lg bg-slate-100">
                    {teacher.prenom?.[0]}{teacher.nom?.[0]}
                  </div>
                )}
              </div>
              <span className="text-[11px] font-mono font-black text-slate-900 px-2 py-0.5 rounded bg-slate-100 border border-slate-300">
                MATRICULE : {teacher.numeroMatriculeEPST || teacher.matricule || 'ADM-001'}
              </span>
            </div>
          </div>

          {/* BANNIÈRE TITRE DOCUMENT */}
          <div className="text-center py-2.5 bg-slate-900 text-white rounded-xl shadow-xs border border-slate-900">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-widest">
              DOSSIER INDIVIDUEL & FICHE SIGNALÉTIQUE OFFICIELLE DU PERSONNEL
            </h2>
            <p className="text-[11px] font-bold text-indigo-300 mt-0.5">
              Année Scolaire {(config as any)?.currentSchoolYear || (config as any)?.anneeScolaireActive || '2025-2026'} · Statut du dossier : {teacher.statut === 'ACTIF' ? 'ACTIF / EN SERVICE' : teacher.statut}
            </p>
          </div>

          {/* SECTION I : IDENTITÉ CIVILE & ÉTAT CIVIL */}
          <div className="space-y-3">
            <div className="bg-slate-100/90 border-l-4 border-indigo-600 px-3.5 py-1.5 rounded-r-md">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                SECTION I : IDENTITÉ CIVILE & COORDONNÉES PERSONNELLES
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3.5 gap-x-4 pt-1">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Nom de famille</span>
                <span className="text-xs sm:text-sm font-black text-slate-900 uppercase">{teacher.nom || '—'}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Post-nom</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">{teacher.postnom || '—'}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Prénom</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">{teacher.prenom || '—'}</span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Genre / Sexe</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {teacher.sexe === 'F' || teacher.genre === 'F' ? 'Féminin (F)' : 'Masculin (M)'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Date & Lieu de Naissance</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {teacher.dateNaissance || '—'} {teacher.lieuNaissance ? `à ${teacher.lieuNaissance}` : ''}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Nationalité & État Civil</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {teacher.nationalite || 'Congolaise (RDC)'} · {teacher.etatCivil || 'Célibataire'}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Téléphone Joignable</span>
                <span className="text-xs sm:text-sm font-mono font-black text-indigo-700">{teacher.telephone || '—'}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Adresse E-mail Officielle</span>
                <span className="text-xs sm:text-sm font-mono font-extrabold text-slate-900 truncate block">{teacher.email || '—'}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Résidence Physique</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate block">{teacher.adresse || 'Kinshasa, RDC'}</span>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200"></div>

          {/* SECTION II : QUALIFICATIONS ACADÉMIQUES & STATUT RH */}
          <div className="space-y-3">
            <div className="bg-slate-100/90 border-l-4 border-indigo-600 px-3.5 py-1.5 rounded-r-md">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                SECTION II : QUALIFICATIONS ACADÉMIQUES, FONCTION & GRADE EPST
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3.5 gap-x-4 pt-1">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Fonction / Rôle Attribué</span>
                <span className="text-xs sm:text-sm font-black text-indigo-900">{roleLabel[teacher.role] || teacher.role}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Matricule SECOPE / EPST</span>
                <span className="text-xs sm:text-sm font-mono font-black text-slate-900">{teacher.numeroMatriculeEPST || teacher.matricule || '—'}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Grade EPST</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">{gradeLabel[teacher.grade || ''] || teacher.grade || 'Licencié'}</span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Diplôme Principal</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">{teacher.diplome || teacher.qualification || 'Diplôme d’État / Licence'}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Spécialité & Domaine</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">{teacher.specialite || 'Pédagogie & Didactique'}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Type de Contrat & Engagement</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {teacher.typeContrat || 'CDI Permanent'} {teacher.dateEmbauche ? `(depuis ${teacher.dateEmbauche})` : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200"></div>

          {/* SECTION III : CHARGES PÉDAGOGIQUES & AFFECTATIONS */}
          <div className="space-y-3">
            <div className="bg-slate-100/90 border-l-4 border-indigo-600 px-3.5 py-1.5 rounded-r-md">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                SECTION III : CHARGE PÉDAGOGIQUE, TITULARISATION & AFFECTATIONS
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 pt-1">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Cycle d'Enseignement Principal</span>
                <span className="text-xs sm:text-sm font-black text-indigo-900">{teacher.cyclePrincipal || 'SECONDAIRE'}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Titularisation de Classe / Promotion</span>
                <span className="text-xs sm:text-sm font-black text-amber-800">
                  {titularsList.length > 0 ? titularsList.join(', ') : 'Aucune titularisation de classe'}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Promotions d'Intervention Assignées</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">{assignedClassesList}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Matières / Cours Attribués</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">{coursesList}</span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Volume Horaire Hebdomadaire</span>
                <span className="text-xs sm:text-sm font-black text-slate-900">{teacher.volumeHoraireHebdo || 18} Heures / semaine</span>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200"></div>

          {/* SECTION IV : RÉMUNÉRATION & COORDONNÉES BANCAIRES */}
          <div className="space-y-3">
            <div className="bg-slate-100/90 border-l-4 border-indigo-600 px-3.5 py-1.5 rounded-r-md">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                SECTION IV : RÉMUNÉRATION, SALAIRE & COORDONNÉES BANCAIRES
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3.5 gap-x-4 pt-1">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Salaire Mensuel de Base</span>
                <span className="text-xs sm:text-sm font-black text-emerald-800">{formattedSalary}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Mode de Rémunération</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {teacher.modeRemuneration === 'TAUX_HORAIRE' ? 'Taux Horaire Presté' : teacher.modeRemuneration === 'MIXTE' ? 'Mixte (Fixe + Heures)' : 'Salaire Mensuel Fixe'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Canal de Versement</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {teacher.modeVersementSalaire === 'MOBILE_MONEY' ? 'Mobile Money' : teacher.modeVersementSalaire === 'BANQUE' ? 'Virement Bancaire' : 'Caisse Établissement'}
                </span>
              </div>

              {teacher.modeVersementSalaire === 'MOBILE_MONEY' ? (
                <>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Opérateur Mobile</span>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900">{teacher.mobileMoneyOperateur || 'M-Pesa'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Numéro Compte Mobile</span>
                    <span className="text-xs sm:text-sm font-mono font-black text-indigo-700">{teacher.mobileMoneyNumero || teacher.telephone}</span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Banque d'Affectation</span>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900">{teacher.banqueNom || 'Equity BCDC'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Numéro Compte RIB</span>
                    <span className="text-xs sm:text-sm font-mono font-black text-indigo-700">{teacher.numeroCompteBancaire || 'Non renseigné'}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="border-b border-slate-200"></div>

          {/* SECTION V : CONTACT D'URGENCE */}
          <div className="space-y-3">
            <div className="bg-slate-100/90 border-l-4 border-indigo-600 px-3.5 py-1.5 rounded-r-md">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                SECTION V : PERSONNE DE RÉFÉRENCE & CONTACT D'URGENCE
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 pt-1">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Nom de la Personne à Contacter</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">{teacher.contactUrgenceNom || 'Non renseigné'}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Téléphone & Lien de Parenté</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {teacher.contactUrgenceTelephone || '—'} {teacher.contactUrgenceLien ? `(${teacher.contactUrgenceLien})` : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200"></div>

          {/* SECTION VI : COMPTE D'ACCÈS SYSTÈME & HABILITATIONS NUMÉRIQUES */}
          <div className="space-y-3">
            <div className="bg-slate-100/90 border-l-4 border-indigo-600 px-3.5 py-1.5 rounded-r-md">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                SECTION VI : COMPTE D'ACCÈS SYSTÈME & HABILITATIONS NUMÉRIQUES
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3.5 gap-x-4 pt-1">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Statut du Compte</span>
                <span className="text-xs sm:text-sm font-black">
                  {userAccount ? (
                    <span className={userAccount.statut === 'ACTIF' ? 'text-emerald-700' : 'text-amber-700'}>
                      {userAccount.statut === 'ACTIF' ? 'Compte Actif' : 'Compte Suspendu'}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Non configuré</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Identifiant / E-mail de Connexion</span>
                <span className="text-xs sm:text-sm font-mono font-black text-indigo-900">
                  {userAccount?.email || '—'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Rôle Système Attribué</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {userAccount ? getRoleInfo(userAccount.role).label : (roleLabel[teacher.role] || teacher.role)}
                </span>
              </div>
            </div>
          </div>

          {/* SIGNATURES OFFICIELLES */}
          <div className="pt-8 grid grid-cols-2 gap-10 text-center">
            <div>
              <p className="text-xs font-black text-slate-900">Le Membre du Personnel / Enseignant,</p>
              <p className="text-[10px] text-slate-500 italic mt-0.5">(Signature précédée de la mention "Lu et Approuvé")</p>
              <div className="h-16 mt-2 border-b border-slate-400"></div>
            </div>
            <div>
              <p className="text-xs font-black text-slate-900">Pour le Chef d'Établissement / La Direction,</p>
              <p className="text-[10px] text-slate-500 italic mt-0.5">Sceau Officiel et Signature</p>
              <div className="h-16 mt-2 border-b border-slate-400 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                [SCEAU ÉCOLISA EPST RDC]
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
};
