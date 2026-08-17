import React from 'react';
import { QrCode, ShieldCheck, School, Droplet, Phone, User } from 'lucide-react';
import { MembrePersonnel } from '../../types';
import { SchoolConfig } from '../onboarding/OnboardingWizard';

interface TeacherIdCardRendererProps {
  teacher: MembrePersonnel;
  schoolConfig?: Partial<SchoolConfig> | null;
  activeSchoolYear?: string;
  face?: 'front' | 'back' | 'both';
}

const roleLabel: Record<string, string> = {
  ENSEIGNANT: 'ENSEIGNANT / PROFESSEUR',
  COMPTABLE: 'COMPTABLE / INTENDANT',
  PREFET: 'PRÉFET DES ÉTUDES',
  SURVEILLANT: 'DIRECTEUR DE DISCIPLINE',
  DE: 'DIRECTEUR DES ÉTUDES',
  ADMIN: 'PERSONNEL ADMINISTRATIF',
};

const gradeLabel: Record<string, string> = {
  DOCTEUR: 'Docteur (PhD)', DES: 'DES / Master', LICENCIE: 'Licencié (L2)',
  AGREGE: 'Agrégé EPST', GRADUAT: 'Gradué (L1)', AUTRE: 'Autre',
};

const statutMeta: Record<string, { label: string; bg: string; text: string; border: string }> = {
  ACTIF: {
    label: 'ACTIF EN SERVICE',
    bg: 'rgba(16,185,129,0.16)',
    text: '#34d399',
    border: 'rgba(16,185,129,0.45)',
  },
  EN_CONGE: {
    label: 'EN CONGÉ',
    bg: 'rgba(245,158,11,0.16)',
    text: '#fbbf24',
    border: 'rgba(245,158,11,0.45)',
  },
  SUSPENDU: {
    label: 'SUSPENDU',
    bg: 'rgba(239,68,68,0.16)',
    text: '#f87171',
    border: 'rgba(239,68,68,0.45)',
  },
};

export const TeacherIdCardRenderer: React.FC<TeacherIdCardRendererProps> = ({
  teacher,
  schoolConfig,
  activeSchoolYear = '2026–2027',
  face = 'both',
}) => {
  const schoolName = schoolConfig?.schoolName || (schoolConfig as any)?.nomOfficiel || 'ÉTABLISSEMENT SCOLAIRE EPST';
  const schoolCode = schoolConfig?.secopeCode || (schoolConfig as any)?.codeEPST || 'EPST-KIN-94021';
  const schoolProvince = schoolConfig?.province || 'KINSHASA';
  const logoUrl = schoolConfig?.logoUrl;

  const status = statutMeta[teacher.statut] || statutMeta.ACTIF;

  const isTeacherRole = teacher.role === 'ENSEIGNANT';

  const renderFront = () => {
    const cardBg = isTeacherRole
      ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)'
      : 'linear-gradient(135deg, #022c22 0%, #064e3b 45%, #0f172a 100%)';
    const cardBorder = isTeacherRole ? 'rgba(99,102,241,0.40)' : 'rgba(16,185,129,0.40)';
    const headerTitle = isTeacherRole ? 'CARTE ENSEIGNANT' : 'CARTE DE SERVICE ADMIN';

    return (
      <div
        className="w-[85.6mm] h-[53.98mm] rounded-2xl overflow-hidden relative border shadow-xl flex flex-col justify-between p-3 text-white select-none shrink-0"
        style={{
          background: cardBg,
          borderColor: cardBorder,
        }}
      >
        {/* Filigrane d'arrière plan */}
        <div className="absolute right-0 bottom-0 opacity-8 pointer-events-none translate-x-5 translate-y-6">
          <School className={`w-44 h-44 ${isTeacherRole ? 'text-indigo-400' : 'text-emerald-400'}`} />
        </div>

        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-1.5 z-10 ${isTeacherRole ? 'border-indigo-500/30' : 'border-emerald-500/30'}`}>
          <div className="flex items-center gap-2 min-w-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-6 h-6 object-contain rounded-md bg-white/10 p-0.5 shrink-0" />
            ) : (
              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-white text-[9px] font-black shrink-0 ${isTeacherRole ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                E
              </div>
            )}
            <div className="min-w-0">
              <h4 className={`text-[8px] font-black uppercase tracking-wider leading-tight truncate max-w-[150px] ${isTeacherRole ? 'text-indigo-200' : 'text-emerald-200'}`}>
                {schoolName}
              </h4>
              <p className="text-[6.5px] font-semibold text-slate-300">
                MIN. ÉDUCATION NATIONALE • RDC
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={`px-1.5 py-0.5 rounded text-[6.5px] font-black uppercase ${isTeacherRole ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-500/40' : 'bg-emerald-500/25 text-emerald-200 border border-emerald-500/40'}`}>
              {headerTitle}
            </span>
            <span
              className="px-1.5 py-0.5 rounded text-[6.5px] font-black uppercase"
              style={{ background: status.bg, color: status.text, border: `1px solid ${status.border}` }}
            >
              {status.label}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex items-center gap-2.5 z-10 my-auto">
          {teacher.avatarUrl ? (
            <img
              src={teacher.avatarUrl}
              alt={`${teacher.prenom} ${teacher.nom}`}
              className={`w-[16mm] h-[20mm] rounded-lg object-cover border-2 shadow-md shrink-0 bg-slate-800 ${isTeacherRole ? 'border-indigo-400/60' : 'border-emerald-400/60'}`}
            />
          ) : (
            <div className={`w-[16mm] h-[20mm] rounded-lg border-2 flex items-center justify-center text-base font-black text-white shrink-0 shadow-md ${isTeacherRole ? 'bg-indigo-600 border-indigo-400/60' : 'bg-emerald-700 border-emerald-400/60'}`}>
              {teacher.prenom?.[0]}{teacher.nom?.[0]}
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-[10px] font-black tracking-tight text-white leading-tight truncate">
              {teacher.prenom} {teacher.postnom ? `${teacher.postnom} ` : ''}{teacher.nom}
            </p>
            <p className={`text-[7.5px] font-extrabold tracking-wide uppercase ${isTeacherRole ? 'text-indigo-300' : 'text-emerald-300'}`}>
              {roleLabel[teacher.role] || teacher.titreOfficiel || teacher.role}
            </p>
            {isTeacherRole ? (
              <>
                <p className="text-[7px] text-slate-300 truncate">
                  Grade : <span className="font-bold text-white">{gradeLabel[teacher.grade || ''] || teacher.grade || 'Licencié'}</span>
                </p>
                <p className="text-[7px] text-slate-300 truncate">
                  Spécialité : <span className="font-bold text-indigo-200">{teacher.specialite || teacher.diplome || '—'}</span>
                </p>
              </>
            ) : (
              <>
                <p className="text-[7px] text-slate-300 truncate">
                  Service : <span className="font-bold text-white">{teacher.qualification || 'Administration Centralisée'}</span>
                </p>
                <p className="text-[7px] text-slate-300 truncate">
                  Matricule CNSS : <span className="font-bold text-emerald-200">{teacher.numeroINSS || 'CNSS-RDC-OK'}</span>
                </p>
              </>
            )}

            <div className="flex items-center gap-1.5 pt-0.5">
              <span
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[6.5px] font-black uppercase"
                style={{ background: 'rgba(244,63,94,0.15)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.35)' }}
              >
                <Droplet className="w-2 h-2" />
                GS {teacher.groupeSanguin || 'O+'}
              </span>
              {teacher.contactUrgenceTelephone && (
                <span
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[6.5px] font-black uppercase"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.35)' }}
                >
                  <Phone className="w-2 h-2" />
                  Urgence
                </span>
              )}
            </div>

            <div className={`pt-1 flex items-center justify-between text-[6.5px] text-slate-400 border-t ${isTeacherRole ? 'border-indigo-500/20' : 'border-emerald-500/20'}`}>
              <span>Matricule : <strong className="text-white">{teacher.numeroMatriculeEPST || teacher.matricule || '—'}</strong></span>
              <span>Année : <strong className="text-emerald-400">{activeSchoolYear}</strong></span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between text-[6.5px] pt-1 border-t z-10 ${isTeacherRole ? 'text-indigo-300 border-indigo-500/30' : 'text-emerald-300 border-emerald-500/30'}`}>
          <span className="font-bold truncate max-w-[120px]">PROVINCE : {schoolProvince.toUpperCase()}</span>
          <span className="flex items-center gap-1 text-emerald-400 font-extrabold shrink-0">
            <ShieldCheck className="w-2.5 h-2.5" /> {isTeacherRole ? 'CORPS ENSEIGNANT RDC' : 'PERSONNEL DIRECTION RDC'}
          </span>
        </div>
      </div>
    );
  };

  const renderBack = () => {
    const backBg = isTeacherRole
      ? 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)'
      : 'linear-gradient(135deg, #022c22 0%, #0f172a 50%, #064e3b 100%)';
    const borderCol = isTeacherRole ? 'rgba(99,102,241,0.35)' : 'rgba(16,185,129,0.35)';

    return (
      <div
        className="w-[85.6mm] h-[53.98mm] rounded-2xl overflow-hidden relative border shadow-xl flex flex-col justify-between p-3 text-slate-200 select-none shrink-0"
        style={{
          background: backBg,
          borderColor: borderCol,
        }}
      >
        <div className={`text-center border-b pb-1 z-10 ${isTeacherRole ? 'border-indigo-500/30' : 'border-emerald-500/30'}`}>
          <p className={`text-[7.5px] font-black uppercase tracking-wider ${isTeacherRole ? 'text-indigo-300' : 'text-emerald-300'}`}>
            RÉPUBLIQUE DÉMOCRATIQUE DU CONGO
          </p>
          <p className="text-[6.5px] font-semibold text-slate-400">
            Ministère de l'Éducation Nationale et Nouvelle Citoyenneté
          </p>
        </div>

        <div className="flex items-start justify-between gap-3 my-auto z-10">
          <div className="space-y-0.5 text-[7px] text-slate-300 flex-1 min-w-0">
            <p className="truncate"><strong className="text-white">Nationalité :</strong> {teacher.nationalite || 'Congolaise'}</p>
            <p className="truncate"><strong className="text-white">Téléphone :</strong> {teacher.telephone}</p>
            {teacher.contactUrgenceTelephone && (
              <p className="truncate">
                <strong className="text-white">Urgence :</strong> {teacher.contactUrgenceNom || '—'} ({teacher.contactUrgenceTelephone})
              </p>
            )}
            <p className="truncate"><strong className="text-white">Groupe sanguin :</strong> {teacher.groupeSanguin || 'O+'}</p>
            <p className="truncate"><strong className="text-white">INSS / CNSS :</strong> {teacher.numeroINSS || '—'}</p>
            <p className="truncate"><strong className="text-white">Matricule EPST :</strong> {teacher.numeroMatriculeEPST || teacher.matricule || '—'}</p>
            <p className="truncate"><strong className="text-white">Prise de service :</strong> {teacher.dateEmbauche || '—'}</p>
            <p className="text-[6px] text-slate-400 pt-1 leading-tight">
              Cette carte de service est strictement personnelle. En cas de perte, aviser la Direction.
            </p>
          </div>

          <div className="shrink-0 text-center">
            <div className="bg-white p-1 rounded-lg shadow-md">
              <QrCode className="w-10 h-10 text-slate-900" />
            </div>
            <p className="text-[5.5px] font-black text-slate-300 mt-0.5">VÉRIFIÉ EPST</p>
            <p className="text-[5px] text-slate-500 mt-0.5">{schoolCode}</p>
          </div>
        </div>

        <div className={`flex items-center justify-between text-[6.5px] border-t pt-1 z-10 ${isTeacherRole ? 'text-indigo-300 border-indigo-500/30' : 'text-emerald-300 border-emerald-500/30'}`}>
          <span className="flex items-center gap-1">
            <User className="w-2 h-2" /> Signature de l'Autorité
          </span>
          <span className="font-bold text-white">ECOLISA ERP RDC</span>
        </div>
      </div>
    );
  };

  if (face === 'front') return renderFront();
  if (face === 'back') return renderBack();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
      {renderFront()}
      {renderBack()}
    </div>
  );
};
