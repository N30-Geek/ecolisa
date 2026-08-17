import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, FileText } from 'lucide-react';
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
  teacher,
}) => {
  const { config, currency, exchangeRate } = useSchoolConfig();
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);

  useEffect(() => {
    if (isOpen && teacher) {
      LocalDatabaseService.getUserByStaff(teacher)
        .then((acc) => setUserAccount(acc))
        .catch(() => setUserAccount(null));
    }
  }, [isOpen, teacher]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const gradeLabel: Record<string, string> = {
    DOCTEUR: 'Docteur (PhD)',
    DES: 'DES / Master 2 (Bac +5)',
    LICENCIE: 'Licencié (L2 / Bac +5)',
    AGREGE: 'Agrégé EPST',
    GRADUAT: 'Gradué (L1 / Bac +3)',
    AUTRE: 'Autre Qualification Reconnue',
  };

  const roleLabel: Record<string, string> = {
    ENSEIGNANT: 'Enseignant / Professeur de Cours',
    COMPTABLE: 'Comptable Intendant Général',
    PREFET: 'Préfet des Études / Directeur d’Établissement',
    SURVEILLANT: 'Directeur de Discipline / Surveillant',
    DE: 'Directeur des Études (DE)',
    ADMIN: 'Administrateur Général / Secrétariat',
    PROMOTEUR_ADMIN: 'Promoteur & Administrateur Général',
    PREFET_DIRECTEUR: 'Préfet des Études / Directeur d’Établissement',
    DIRECTEUR_ETUDES: 'Directeur des Études (DE)',
    DIRECTEUR_DISCIPLINE: 'Directeur de Discipline / Surveillant Général',
    SECRETAIRE: 'Secrétaire Général / Administratif',
    INTENDANT: 'Intendant & Gestionnaire du Patrimoine',
  };

  const formattedSalary = formatCurrency(
    teacher.salaireBase || 0,
    teacher.devise || currency,
    teacher.devise || 'USD',
    exchangeRate
  );

  const titularsList = Array.from(
    new Set(
      [
        ...(teacher.classesTitularisees || []),
        teacher.classeTitulaireId,
        teacher.salleUniqueId,
        teacher.optionTitulaireCode,
      ].filter(Boolean)
    )
  );

  const assignedClassesList =
    teacher.classesAssignees && teacher.classesAssignees.length > 0
      ? teacher.classesAssignees.join(', ')
      : 'Ensemble des promotions de l’établissement';

  const coursesList =
    teacher.coursAttribues && teacher.coursAttribues.length > 0
      ? teacher.coursAttribues.join(', ')
      : teacher.disciplines && teacher.disciplines.length > 0
      ? teacher.disciplines.join(', ')
      : 'Toutes les disciplines prévues au programme';

  const isAdminRole = [
    'PREFET',
    'DE',
    'SURVEILLANT',
    'COMPTABLE',
    'ADMIN',
    'PROMOTEUR_ADMIN',
    'PREFET_DIRECTEUR',
    'DIRECTEUR_ETUDES',
    'DIRECTEUR_DISCIPLINE',
    'SECRETAIRE',
    'INTENDANT',
  ].includes(teacher.role || '');

  const isPrimMat =
    teacher.cyclePrincipal === 'MATERNELLE' ||
    teacher.cyclePrincipal === 'PRIMAIRE';

  return createPortal(
    <div className="fixed inset-0 w-full h-full z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-fade-in">
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
            padding: 15mm !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            font-size: 11px !important;
            line-height: 1.3 !important;
          }
          .no-print { display: none !important; }
          table {
            page-break-inside: avoid !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="w-full max-w-5xl max-h-[94vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-in">
        {/* BARRE D'ACTIONS DU HAUT (NO PRINT) */}
        <div className="px-6 py-3.5 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between no-print shrink-0 font-sans">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Fiche Signalétique Individuelle & Dossier Personnel
              </h3>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Format d'impression officiel conforme aux normes administratives EPST RDC · {teacher.prenom} {teacher.nom}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer flex items-center gap-2"
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

        {/* DOCUMENT ADMINISTRATIF OFFICIEL AVEC TABLEAUX CLASSIQUES */}
        <div
          id="printable-teacher-file"
          className="p-8 sm:p-10 overflow-y-auto space-y-6 text-slate-900 font-sans leading-normal bg-white"
        >
          {/* EN-TÊTE OFFICIEL DE LA RÉPUBLIQUE & DE L'ÉTABLISSEMENT */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              {config?.logoUrl ? (
                <div className="w-20 h-20 overflow-hidden shrink-0 border border-slate-400 rounded-md p-1 bg-white">
                  <img
                    src={config.logoUrl}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-md bg-slate-900 text-white flex items-center justify-center font-black text-xl shrink-0">
                  {config?.schoolName?.[0] || 'E'}
                </div>
              )}
              <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                  RÉPUBLIQUE DÉMOCRATIQUE DU CONGO
                </p>
                <p className="text-[10.5px] font-extrabold uppercase text-slate-800">
                  MINISTÈRE DE L'ÉDUCATION NATIONALE ET NOUVELLE CITOYENNETÉ (EPST)
                </p>
                <h1 className="text-base sm:text-lg font-black uppercase text-indigo-950 tracking-tight">
                  {config?.schoolName || 'ÉCOLISA ENTERPRISE RDC'}
                </h1>
                <p className="text-xs font-semibold text-slate-700">
                  Province Éducative : {config?.province || 'Kinshasa'} {config?.subDivision ? `• ${config.subDivision}` : ''}
                </p>
                {config?.secopeCode && (
                  <p className="text-xs font-black text-indigo-900">
                    Code SECOPE / Agrément Officiel : {config.secopeCode}
                  </p>
                )}
              </div>
            </div>

            {/* Photo & Matricule */}
            <div className="text-right flex flex-col items-end shrink-0">
              <div className="w-24 h-28 border-2 border-slate-900 rounded-sm overflow-hidden bg-slate-100 mb-1 shadow-xs">
                {teacher.avatarUrl || teacher.photoUrl ? (
                  <img
                    src={teacher.avatarUrl || teacher.photoUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-lg bg-slate-100">
                    {teacher.prenom?.[0]}{teacher.nom?.[0]}
                  </div>
                )}
              </div>
              <span className="text-[10.5px] font-mono font-black text-slate-900 px-2 py-0.5 border border-slate-900 bg-slate-50 uppercase">
                MATRICULE : {teacher.numeroMatriculeEPST || teacher.matricule || 'ADM-001'}
              </span>
            </div>
          </div>

          {/* BANNIÈRE TITRE DU DOCUMENT */}
          <div className="text-center py-2 bg-slate-900 text-white rounded-none border border-slate-900">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-widest">
              DOSSIER INDIVIDUEL & FICHE SIGNALÉTIQUE DU PERSONNEL
            </h2>
            <p className="text-[10.5px] font-bold text-slate-200 mt-0.5">
              Année Scolaire {(config as any)?.currentSchoolYear || (config as any)?.anneeScolaireActive || '2025-2026'} · Statut Administratif : {teacher.statut === 'ACTIF' ? 'ACTIF / EN SERVICE' : teacher.statut || 'EN SERVICE'}
            </p>
          </div>

          {/* TABLEAU 1 : IDENTITÉ CIVILE & COORDONNÉES */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 bg-slate-200 px-3 py-1 border border-slate-400">
              TABLEAU I : IDENTITÉ CIVILE, SITUATION FAMILIALE & COORDONNÉES
            </h3>
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <tbody>
                <tr>
                  <td className="w-1/4 bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Nom de Famille :</td>
                  <td className="w-1/4 font-black p-2 border border-slate-300 text-slate-900 uppercase">{teacher.nom || '—'}</td>
                  <td className="w-1/4 bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Post-nom :</td>
                  <td className="w-1/4 font-bold p-2 border border-slate-300 text-slate-900 uppercase">{teacher.postnom || '—'}</td>
                </tr>
                <tr>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Prénom :</td>
                  <td className="font-bold p-2 border border-slate-300 text-slate-900 uppercase">{teacher.prenom || '—'}</td>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Genre / Sexe :</td>
                  <td className="font-semibold p-2 border border-slate-300 text-slate-900">
                    {teacher.sexe === 'F' || teacher.genre === 'F' ? 'Féminin (F)' : 'Masculin (M)'}
                  </td>
                </tr>
                <tr>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Date & Lieu de Naissance :</td>
                  <td className="font-semibold p-2 border border-slate-300 text-slate-900">
                    {teacher.dateNaissance || '—'} {teacher.lieuNaissance ? `à ${teacher.lieuNaissance}` : ''}
                  </td>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Nationalité :</td>
                  <td className="font-semibold p-2 border border-slate-300 text-slate-900">{teacher.nationalite || 'Congolaise (RDC)'}</td>
                </tr>
                <tr>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">État Civil :</td>
                  <td className="font-semibold p-2 border border-slate-300 text-slate-900">
                    {teacher.etatCivil || 'Célibataire'} {teacher.nomConjoint ? `(Conjoint(e): ${teacher.nomConjoint})` : ''}
                  </td>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Enfants à Charge :</td>
                  <td className="font-semibold p-2 border border-slate-300 text-slate-900">
                    {teacher.nombreEnfantsACharge ?? 0} enfant(s) {teacher.nombreEnfantsEtablissement ? `(${teacher.nombreEnfantsEtablissement} scolarisé(s) dans l'école)` : ''}
                  </td>
                </tr>
                <tr>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Téléphone Principal :</td>
                  <td className="font-mono font-black p-2 border border-slate-300 text-indigo-900">{teacher.telephone || '—'}</td>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Téléphone Secondaire :</td>
                  <td className="font-mono font-bold p-2 border border-slate-300 text-slate-800">{teacher.telephoneSecondaire || '—'}</td>
                </tr>
                <tr>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Adresse E-mail :</td>
                  <td className="font-mono font-bold p-2 border border-slate-300 text-slate-900">{teacher.email || '—'}</td>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Résidence Physique :</td>
                  <td className="font-medium p-2 border border-slate-300 text-slate-900">{teacher.adresse || 'Kinshasa, RDC'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TABLEAU 2 : QUALIFICATIONS ACADÉMIQUES & SITUATION ADMINISTRATIVE */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 bg-slate-200 px-3 py-1 border border-slate-400">
              TABLEAU II : QUALIFICATIONS ACADÉMIQUES, FONCTION & STATUT RH EPST
            </h3>
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <tbody>
                <tr>
                  <td className="w-1/4 bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Fonction / Rôle Officiel :</td>
                  <td className="w-1/4 font-black p-2 border border-slate-300 text-slate-900">{roleLabel[teacher.role] || teacher.role}</td>
                  <td className="w-1/4 bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Titre / Responsabilité :</td>
                  <td className="w-1/4 font-bold p-2 border border-slate-300 text-slate-900">{teacher.titreOfficiel || roleLabel[teacher.role] || '—'}</td>
                </tr>
                <tr>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Matricule SECOPE / EPST :</td>
                  <td className="font-mono font-black p-2 border border-slate-300 text-slate-900">{teacher.numeroMatriculeEPST || teacher.matricule || '—'}</td>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Numéro INSS / CNSS :</td>
                  <td className="font-mono font-bold p-2 border border-slate-300 text-slate-800">{teacher.numeroINSS || '—'}</td>
                </tr>
                <tr>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Grade EPST :</td>
                  <td className="font-bold p-2 border border-slate-300 text-slate-900">{gradeLabel[teacher.grade || ''] || teacher.grade || 'Licencié EPST'}</td>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Diplôme le plus élevé :</td>
                  <td className="font-bold p-2 border border-slate-300 text-slate-900">{teacher.diplome || teacher.qualification || 'Diplôme d’État / Licence'}</td>
                </tr>
                <tr>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Spécialité & Domaine :</td>
                  <td className="font-semibold p-2 border border-slate-300 text-slate-900">{teacher.specialite || 'Pédagogie & Didactique'}</td>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Type de Contrat :</td>
                  <td className="font-black p-2 border border-slate-300 text-slate-900">{teacher.typeContrat || 'PERMANENT (CDI)'}</td>
                </tr>
                <tr>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Date d'Embauche / Service :</td>
                  <td className="font-bold p-2 border border-slate-300 text-slate-900">{teacher.dateEmbauche || '—'}</td>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Fin Contrat / Échéance :</td>
                  <td className="font-medium p-2 border border-slate-300 text-slate-800">{teacher.dateFinContrat || 'Indéterminée (CDI)'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TABLEAU 3 : CHARGES PÉDAGOGIQUES OU RESPONSABILITÉS ADMINISTRATIVES */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 bg-slate-200 px-3 py-1 border border-slate-400">
              {isAdminRole
                ? 'TABLEAU III : DÉPARTEMENT, ATTRIBUTIONS & MISSIONS ADMINISTRATIVES'
                : 'TABLEAU III : CHARGE HORAIRE, AFFECTATIONS & TITULARISATION DE CLASSE'}
            </h3>
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <tbody>
                {isAdminRole ? (
                  <>
                    <tr>
                      <td className="w-1/3 bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Corps & Service Rattaché :</td>
                      <td className="w-2/3 font-black p-2 border border-slate-300 text-slate-900">Personnel Administratif & Direction Établissement</td>
                    </tr>
                    <tr>
                      <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Département / Équipe sous Responsabilité :</td>
                      <td className="font-bold p-2 border border-slate-300 text-slate-900">{teacher.personnelEnCharge || 'Direction Générale / Secrétariat'}</td>
                    </tr>
                    <tr>
                      <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Missions & Attributions Principales :</td>
                      <td className="p-2 border border-slate-300 text-slate-800 leading-relaxed font-medium">
                        {teacher.notesBiographiques || 'Supervision administrative, conformité institutionnelle, gestion des opérations scolaires et représentation.'}
                      </td>
                    </tr>
                  </>
                ) : isPrimMat ? (
                  <>
                    <tr>
                      <td className="w-1/3 bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Cycle d'Enseignement :</td>
                      <td className="w-2/3 font-black p-2 border border-slate-300 text-slate-900">
                        {teacher.cyclePrincipal === 'MATERNELLE' ? 'Cycle Maternelle (Éveil & Petite Enfance)' : 'Cycle Primaire (Éducation de Base)'}
                      </td>
                    </tr>
                    <tr>
                      <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Salle Titularisée (Titulaire Exclusif) :</td>
                      <td className="font-black p-2 border border-slate-300 text-indigo-900">{teacher.salleUniqueId || teacher.classeTitulaireId || 'Salle de classe assignée'}</td>
                    </tr>
                    <tr>
                      <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Régime Pédagogique :</td>
                      <td className="font-bold p-2 border border-slate-300 text-slate-900">Enseignant Titulaire Polyvalent (Prise en charge de toutes les disciplines)</td>
                    </tr>
                    <tr>
                      <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Volume Horaire Hebdomadaire :</td>
                      <td className="font-black p-2 border border-slate-300 text-slate-900">{teacher.volumeHoraireHebdo || 25} Heures / semaine</td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr>
                      <td className="w-1/3 bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Cycle d'Enseignement :</td>
                      <td className="w-2/3 font-black p-2 border border-slate-300 text-slate-900">Secondaire Général & Humanités (7è CTEB à 4è Humanités)</td>
                    </tr>
                    <tr>
                      <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Titularisation de Promotion :</td>
                      <td className="font-black p-2 border border-slate-300 text-amber-900">
                        {titularsList.length > 0 ? titularsList.join(', ') : 'Enseignant Intervenant Non Titulaire'}
                      </td>
                    </tr>
                    <tr>
                      <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Promotions d'Intervention :</td>
                      <td className="font-bold p-2 border border-slate-300 text-slate-900">{assignedClassesList}</td>
                    </tr>
                    <tr>
                      <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Matières & Cours Attribués :</td>
                      <td className="font-bold p-2 border border-slate-300 text-indigo-950">{coursesList}</td>
                    </tr>
                    <tr>
                      <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Volume Horaire Hebdomadaire :</td>
                      <td className="font-black p-2 border border-slate-300 text-slate-900">{teacher.volumeHoraireHebdo || 18} Heures de cours / semaine</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* TABLEAU 4 : SANTÉ & CONTACTS D'URGENCE */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 bg-slate-200 px-3 py-1 border border-slate-400">
              TABLEAU IV : SANTÉ, APTITUDE PHYSIQUE & PERSONNES DE RÉFÉRENCE / URGENCE
            </h3>
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <tbody>
                <tr>
                  <td className="w-1/4 bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Groupe Sanguin :</td>
                  <td className="w-1/4 font-black p-2 border border-slate-300 text-red-700">{teacher.groupeSanguin || 'Non renseigné'}</td>
                  <td className="w-1/4 bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Allergies Connues :</td>
                  <td className="w-1/4 font-semibold p-2 border border-slate-300 text-slate-900">{teacher.allergies || 'Aucune allergie signalée'}</td>
                </tr>
                <tr>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Antécédents Médicaux :</td>
                  <td className="font-medium p-2 border border-slate-300 text-slate-900">{teacher.antecedentsMedicaux || 'Néant'}</td>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Médecin Traitant / Centre :</td>
                  <td className="font-medium p-2 border border-slate-300 text-slate-900">{teacher.medecinTraitant || teacher.centreSanteRef || 'Non renseigné'}</td>
                </tr>
                <tr>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Contact d'Urgence :</td>
                  <td className="font-bold p-2 border border-slate-300 text-slate-900">
                    {teacher.contactUrgenceNom || 'Non renseigné'} {teacher.contactUrgenceLien ? `(${teacher.contactUrgenceLien})` : ''}
                  </td>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Téléphone d'Urgence :</td>
                  <td className="font-mono font-black p-2 border border-slate-300 text-indigo-900">{teacher.contactUrgenceTelephone || '—'}</td>
                </tr>
                <tr>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Référence Professionnelle :</td>
                  <td className="font-medium p-2 border border-slate-300 text-slate-900" colSpan={3}>
                    {teacher.referenceProfessionnelle ? `${teacher.referenceProfessionnelle} (${teacher.referenceOrganisme || 'Organisme'}, Tél: ${teacher.referenceContact || '—'})` : 'Dossier certifié conforme par la direction de l’établissement'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TABLEAU 5 : CONDITIONS FINANCIÈRES & COORDONNÉES DE PAIEMENT */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 bg-slate-200 px-3 py-1 border border-slate-400">
              TABLEAU V : RÉMUNÉRATION, TAUX HORAIRE & COORDONNÉES BANCAIRES / MOBILES
            </h3>
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <tbody>
                <tr>
                  <td className="w-1/4 bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Mode de Rémunération :</td>
                  <td className="w-1/4 font-black p-2 border border-slate-300 text-slate-900">
                    {teacher.modeRemuneration === 'TAUX_HORAIRE' ? '⏱️ Au Taux Horaire Presté' : teacher.modeRemuneration === 'MIXTE' ? 'Mixte (Fixe + Taux)' : '💼 Salaire Fixe Mensuel CDI'}
                  </td>
                  <td className="w-1/4 bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">
                    {teacher.modeRemuneration === 'TAUX_HORAIRE' ? 'Taux de Base / Heure :' : 'Salaire Mensuel de Base :'}
                  </td>
                  <td className="w-1/4 font-mono font-black p-2 border border-slate-300 text-emerald-800">
                    {teacher.modeRemuneration === 'TAUX_HORAIRE'
                      ? `${formatCurrency(teacher.tauxHoraireBase || 6.5, currency, teacher.devise)} / h`
                      : formattedSalary}
                  </td>
                </tr>
                <tr>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Canal de Versement :</td>
                  <td className="font-bold p-2 border border-slate-300 text-slate-900">
                    {teacher.modeVersementSalaire === 'MOBILE_MONEY' ? '📱 Mobile Money' : teacher.modeVersementSalaire === 'BANQUE' ? '🏦 Virement Bancaire' : '💵 Caisse Établissement'}
                  </td>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">
                    {teacher.modeVersementSalaire === 'MOBILE_MONEY' ? 'Opérateur & N° Mobile :' : 'Banque & N° Compte (RIB) :'}
                  </td>
                  <td className="font-mono font-bold p-2 border border-slate-300 text-slate-900">
                    {teacher.modeVersementSalaire === 'MOBILE_MONEY'
                      ? `${teacher.mobileMoneyOperateur || 'M-Pesa'} - ${teacher.mobileMoneyNumero || teacher.telephone}`
                      : `${teacher.banqueNom || 'Rawbank RDC'} - ${teacher.numeroCompteBancaire || 'Non renseigné'}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TABLEAU 6 : COMPTE NUMÉRIQUE & HABILITATIONS SYSTÈME */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 bg-slate-200 px-3 py-1 border border-slate-400">
              TABLEAU VI : COMPTE NUMÉRIQUE & HABILITATIONS SYSTÈME ÉCOLISA
            </h3>
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <tbody>
                <tr>
                  <td className="w-1/4 bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Statut Compte Logiciel :</td>
                  <td className="w-1/4 font-black p-2 border border-slate-300 text-slate-900">
                    {userAccount ? (userAccount.statut === 'ACTIF' ? '✅ Compte Actif' : '⚠️ Compte Suspendu') : 'Compte Automatique Écolisa'}
                  </td>
                  <td className="w-1/4 bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Identifiant / E-mail de Connexion :</td>
                  <td className="w-1/4 font-mono font-black p-2 border border-slate-300 text-indigo-900">{userAccount?.email || teacher.email || '—'}</td>
                </tr>
                <tr>
                  <td className="bg-slate-100 font-bold p-2 border border-slate-300 text-slate-800">Rôle d'Accès Attribué :</td>
                  <td className="font-bold p-2 border border-slate-300 text-slate-900" colSpan={3}>
                    {userAccount ? getRoleInfo(userAccount.role).label : (roleLabel[teacher.role] || teacher.role)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* CADRE OFFICIEL DE VALIDATION, VISAS & SIGNATURES */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-center">
            <div className="border border-slate-400 p-4 rounded-none bg-slate-50/50">
              <p className="text-xs font-black text-slate-900 uppercase">Le Membre du Personnel / Enseignant</p>
              <p className="text-[10px] text-slate-500 italic mt-0.5">(Signature précédée de la mention manuscrite "Lu et approuvé")</p>
              <div className="h-20 mt-3 border-b border-dashed border-slate-400 flex items-end justify-center pb-1 text-[11px] font-bold text-slate-700">
                {teacher.prenom} {teacher.nom}
              </div>
            </div>

            <div className="border border-slate-400 p-4 rounded-none bg-slate-50/50">
              <p className="text-xs font-black text-slate-900 uppercase">Pour la Direction de l'Établissement</p>
              <p className="text-[10px] text-slate-500 italic mt-0.5">Sceau Officiel et Signature d'Approbation</p>
              <div className="h-20 mt-3 border-b border-dashed border-slate-400 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                [SCEAU OFFICIEL DE L'ÉTABLISSEMENT]
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
