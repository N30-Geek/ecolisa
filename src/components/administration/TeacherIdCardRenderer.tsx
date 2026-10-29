import React, { useMemo } from 'react';
import { ShieldCheck, School, Droplet, Phone, User } from 'lucide-react';
import { QRCode } from 'react-qr-code';
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
  TITULAIRE: 'ENSEIGNANT TITULAIRE',
  COMPTABLE: 'COMPTABLE / INTENDANT',
  INTENDANT: 'ÉCONOME / INTENDANT',
  SECRETAIRE: 'SECRÉTAIRE ADMINISTRATIF',
  PREFET: 'PRÉFET DES ÉTUDES',
  PREFET_DIRECTEUR: 'PRÉFET DES ÉTUDES',
  DIRECTEUR_ECOLE: "DIRECTEUR D'ÉCOLE",
  SURVEILLANT: 'DIRECTEUR DE DISCIPLINE',
  DIRECTEUR_DISCIPLINE: 'DIRECTEUR DE DISCIPLINE',
  CENSEUR: 'CENSEUR DES ÉTUDES',
  DE: 'DIRECTEUR DES ÉTUDES',
  DIRECTEUR_ETUDES: 'DIRECTEUR DES ÉTUDES',
  PROMOTEUR_ADMIN: 'PROMOTEUR / ADMINISTRATEUR',
  ADMIN: 'PERSONNEL ADMINISTRATIF',
};

const CYCLE_LABELS: Record<string, string> = {
  MATERNELLE: 'Maternelle',
  PRIMAIRE: 'Primaire',
  SECONDAIRE: 'Secondaire',
  SECONDAIRE_CTEB: 'CTEB',
  CTEB: 'CTEB',
  HUMANITES: 'Humanités',
};

const gradeLabel: Record<string, string> = {
  DOCTEUR: 'Docteur (PhD)', DES: 'DES / Master', LICENCIE: 'Licencié (L2)',
  AGREGE: 'Agrégé EPST', GRADUAT: 'Gradué (L1)', AUTRE: 'Autre',
};

const statutMeta: Record<string, { label: string; bg: string; text: string; border: string }> = {
  ACTIF: {
    label: 'ACTIF EN SERVICE',
    bg: 'rgba(16,185,129,0.10)',
    text: '#059669',
    border: 'rgba(16,185,129,0.35)',
  },
  EN_CONGE: {
    label: 'EN CONGÉ',
    bg: 'rgba(245,158,11,0.10)',
    text: '#d97706',
    border: 'rgba(245,158,11,0.35)',
  },
  SUSPENDU: {
    label: 'SUSPENDU',
    bg: 'rgba(239,68,68,0.10)',
    text: '#dc2626',
    border: 'rgba(239,68,68,0.35)',
  },
};

/**
 * Couleurs officielles RDC : bleu #007fff, jaune #f7d618, rouge #ce1021.
 * Thème clair, professionnel, lisible et imprimable.
 */
const RDC = {
  blue: '#0066cc',
  sky: '#38bdf8',
  yellow: '#f7d618',
  red: '#ce1021',
  paper: '#ffffff',
  ink: '#0f172a',
  muted: '#64748b',
  border: 'rgba(0,102,204,0.18)',
  surface: '#f8fafc',
};

/**
 * Filigrane léger : trame de points + hachures très fines + icône école
 * en arrière-plan, le tout à très faible opacité pour rester lisible.
 */
const LightSecurityTexture: React.FC = () => (
  <>
    {/* Trame de micro-points */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        opacity: 0.08,
        backgroundImage: `radial-gradient(${RDC.blue} 0.4px, transparent 0.5px)`,
        backgroundSize: '4px 4px',
      }}
    />
    {/* Hachures fines */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        opacity: 0.05,
        backgroundImage: `repeating-linear-gradient(-55deg, transparent, transparent 9px, ${RDC.blue} 9px, ${RDC.blue} 9.5px)`,
      }}
    />
    {/* Icône école en filigrane (très légère) */}
    <div
      className="absolute right-2 bottom-2 pointer-events-none"
      style={{ opacity: 0.04 }}
    >
      <School className="w-28 h-28" style={{ color: RDC.blue }} />
    </div>
    {/* Ruban tricolore RDC vertical */}
    <div className="absolute left-0 top-0 bottom-0 w-[1.4mm] pointer-events-none flex flex-col">
      <div className="flex-1" style={{ background: RDC.blue }} />
      <div style={{ height: '16%', background: RDC.yellow }} />
      <div className="flex-1" style={{ background: RDC.red }} />
    </div>
  </>
);

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

  const isTeacherRole = teacher.role === 'ENSEIGNANT' || teacher.role === 'TITULAIRE';
  const badgeColor = isTeacherRole ? RDC.blue : '#7c3aed';

  // QR code authentique avec les données du personnel
  const qrValue = useMemo(() => {
    return JSON.stringify({
      app: 'ECOLISA',
      type: 'STAFF_CARD',
      id: teacher.id,
      matricule: teacher.numeroMatriculeEPST || teacher.matricule,
      nom: `${teacher.prenom || ''} ${teacher.postnom || ''} ${teacher.nom || ''}`.trim(),
      role: teacher.role,
      ecole: schoolName,
      code: schoolCode,
      timestamp: new Date().toISOString(),
    });
  }, [teacher, schoolName, schoolCode]);

  // Périmètre de cycle affecté
  const cycleScope = React.useMemo(() => {
    const raw = (teacher.cyclesAssignes?.length ? teacher.cyclesAssignes : [teacher.cyclePrincipal])
      .filter(Boolean)
      .map(c => String(c).toUpperCase());
    const labels = Array.from(new Set(raw.map(c => CYCLE_LABELS[c] || c)));
    return labels.length ? labels.join(' · ') : null;
  }, [teacher.cyclesAssignes, teacher.cyclePrincipal]);

  const cardClass =
    'w-[85.6mm] h-[53.98mm] rounded-2xl overflow-hidden relative border shadow-xl flex flex-col justify-between p-3 select-none shrink-0 pl-[4mm]';

  const renderFront = () => (
    <div
      className={cardClass}
      style={{
        background: RDC.paper,
        borderColor: RDC.border,
        color: RDC.ink,
      }}
    >
      <LightSecurityTexture />

      {/* Header */}
      <div className="flex items-center justify-between border-b pb-1.5 z-10" style={{ borderColor: RDC.border }}>
        <div className="flex items-center gap-2 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-6 h-6 object-contain rounded-md p-0.5 shrink-0" style={{ border: `1px solid ${RDC.border}` }} />
          ) : (
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-black shrink-0"
              style={{ background: RDC.blue, color: '#fff' }}
            >
              E
            </div>
          )}
          <div className="min-w-0">
            <h4 className="text-[8px] font-black uppercase tracking-wider leading-tight truncate max-w-[150px]" style={{ color: RDC.blue }}>
              {schoolName}
            </h4>
            <p className="text-[6.5px] font-semibold" style={{ color: RDC.muted }}>
              MIN. ÉDUCATION NATIONALE • RDC
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className="px-1.5 py-0.5 rounded text-[6.5px] font-black uppercase"
            style={{ background: 'rgba(0,102,204,0.08)', color: RDC.blue, border: `1px solid ${RDC.border}` }}
          >
            {isTeacherRole ? 'CARTE ENSEIGNANT' : 'CARTE DE SERVICE'}
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
      <div className="flex items-center gap-2.5 z-10 flex-1 min-h-0 py-1">
        {teacher.avatarUrl ? (
          <img
            src={teacher.avatarUrl}
            alt={`${teacher.prenom} ${teacher.nom}`}
            className="w-[16mm] h-[20mm] rounded-lg object-cover border shadow-md shrink-0"
            style={{ borderColor: RDC.border }}
          />
        ) : (
          <div
            className="w-[16mm] h-[20mm] rounded-lg border flex items-center justify-center text-base font-black shrink-0 shadow-md"
            style={{ background: RDC.surface, color: RDC.blue, borderColor: RDC.border }}
          >
            {teacher.prenom?.[0]}{teacher.nom?.[0]}
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-[3px]">
          <p className="text-[10.5px] font-black tracking-tight leading-tight truncate" style={{ color: RDC.ink }}>
            {teacher.prenom} {teacher.postnom ? `${teacher.postnom} ` : ''}{teacher.nom}
          </p>
          <p className="text-[7.5px] font-extrabold tracking-wide uppercase truncate" style={{ color: badgeColor }}>
            {roleLabel[teacher.role] || teacher.titreOfficiel || teacher.role}
          </p>

          {/* Ligne 1 : qualification / service */}
          <p className="text-[7px] truncate" style={{ color: RDC.muted }}>
            {isTeacherRole ? 'Grade' : 'Service'} :{' '}
            <span className="font-bold" style={{ color: RDC.ink }}>
              {isTeacherRole
                ? (gradeLabel[teacher.grade || ''] || teacher.grade || 'Licencié')
                : (teacher.qualification || 'Administration centralisée')}
            </span>
          </p>

          {/* Ligne 2 : spécialité / CNSS */}
          <p className="text-[7px] truncate" style={{ color: RDC.muted }}>
            {isTeacherRole ? 'Spécialité' : 'CNSS'} :{' '}
            <span className="font-bold" style={{ color: RDC.blue }}>
              {isTeacherRole
                ? (teacher.specialite || teacher.diplome || '—')
                : (teacher.numeroINSS || '—')}
            </span>
          </p>

          {/* Ligne 3 : périmètre de cycle affecté */}
          {cycleScope && (
            <p className="text-[7px] truncate" style={{ color: RDC.muted }}>
              Cycle : <span className="font-bold" style={{ color: '#7c3aed' }}>{cycleScope}</span>
            </p>
          )}

          {/* Pastilles santé / urgence */}
          <div className="flex items-center gap-1.5 pt-[2px]">
            <span
              className="flex items-center gap-0.5 px-1.5 py-[1px] rounded text-[6.5px] font-black uppercase"
              style={{ background: 'rgba(244,63,94,0.08)', color: '#e11d48', border: '1px solid rgba(244,63,94,0.25)' }}
            >
              <Droplet className="w-2 h-2" />
              GS {teacher.groupeSanguin || 'O+'}
            </span>
            {teacher.contactUrgenceTelephone && (
              <span
                className="flex items-center gap-0.5 px-1.5 py-[1px] rounded text-[6.5px] font-black uppercase"
                style={{ background: 'rgba(16,185,129,0.08)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)' }}
              >
                <Phone className="w-2 h-2" />
                Urgence
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bandeau matricule / année */}
      <div
        className="flex items-center justify-between gap-2 px-2 py-[3px] rounded-md z-10 text-[6.5px]"
        style={{ background: RDC.surface, border: `1px solid ${RDC.border}` }}
      >
        <span className="truncate" style={{ color: RDC.muted }}>
          Matricule : <strong className="font-mono tracking-tight" style={{ color: RDC.ink }}>{teacher.numeroMatriculeEPST || teacher.matricule || '—'}</strong>
        </span>
        <span className="shrink-0" style={{ color: RDC.muted }}>
          Année : <strong style={{ color: RDC.blue }}>{activeSchoolYear}</strong>
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 text-[6.5px] pt-1 border-t z-10" style={{ color: RDC.muted, borderColor: RDC.border }}>
        <span className="font-bold truncate">PROVINCE : {schoolProvince.toUpperCase()}</span>
        <span className="flex items-center gap-1 font-extrabold shrink-0 whitespace-nowrap" style={{ color: RDC.blue }}>
          <ShieldCheck className="w-2.5 h-2.5" /> {isTeacherRole ? 'CORPS ENSEIGNANT RDC' : 'PERSONNEL ADMINISTRATIF RDC'}
        </span>
      </div>
    </div>
  );

  const renderBack = () => (
    <div
      className={cardClass}
      style={{
        background: RDC.paper,
        borderColor: RDC.border,
        color: RDC.ink,
      }}
    >
      <LightSecurityTexture />

      <div className="text-center border-b pb-1 z-10" style={{ borderColor: RDC.border }}>
        <p className="text-[7.5px] font-black uppercase tracking-wider" style={{ color: RDC.blue }}>
          RÉPUBLIQUE DÉMOCRATIQUE DU CONGO
        </p>
        <p className="text-[6.5px] font-semibold" style={{ color: RDC.muted }}>
          Ministère de l'Éducation Nationale et Nouvelle Citoyenneté
        </p>
      </div>

      <div className="flex items-start justify-between gap-3 my-auto z-10">
        <div className="space-y-0.5 text-[7px] flex-1 min-w-0" style={{ color: RDC.muted }}>
          <p className="truncate"><strong style={{ color: RDC.blue }}>Nationalité :</strong> {teacher.nationalite || 'Congolaise'}</p>
          <p className="truncate"><strong style={{ color: RDC.blue }}>Téléphone :</strong> {teacher.telephone}</p>
          {teacher.contactUrgenceTelephone && (
            <p className="truncate">
              <strong style={{ color: RDC.blue }}>Urgence :</strong> {teacher.contactUrgenceNom || '—'} ({teacher.contactUrgenceTelephone})
            </p>
          )}
          <p className="truncate"><strong style={{ color: RDC.blue }}>Groupe sanguin :</strong> {teacher.groupeSanguin || 'O+'}</p>
          <p className="truncate"><strong style={{ color: RDC.blue }}>INSS / CNSS :</strong> {teacher.numeroINSS || '—'}</p>
          <p className="truncate"><strong style={{ color: RDC.blue }}>Matricule EPST :</strong> {teacher.numeroMatriculeEPST || teacher.matricule || '—'}</p>
          <p className="truncate"><strong style={{ color: RDC.blue }}>Prise de service :</strong> {teacher.dateEmbauche || '—'}</p>
          <p className="truncate"><strong style={{ color: RDC.blue }}>Cycle affecté :</strong> {cycleScope || 'Non défini'}</p>
          <p className="text-[6px] pt-1 leading-tight" style={{ color: RDC.muted }}>
            Cette carte de service est strictement personnelle. En cas de perte, aviser la Direction.
          </p>
        </div>

        <div className="shrink-0 text-center">
          <div className="p-1 rounded-lg shadow-md" style={{ background: '#ffffff', border: `1px solid ${RDC.border}` }}>
            <QRCode value={qrValue} size={44} level="M" bgColor="#ffffff" fgColor={RDC.blue} />
          </div>
          <p className="text-[5.5px] font-black mt-0.5" style={{ color: RDC.blue }}>VÉRIFIÉ EPST</p>
          <p className="text-[5px] mt-0.5" style={{ color: RDC.muted }}>{schoolCode}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-[6.5px] border-t pt-1 z-10" style={{ color: RDC.muted, borderColor: RDC.border }}>
        <span className="flex items-center gap-1">
          <User className="w-2 h-2" /> Signature de l'Autorité
        </span>
        <span className="font-bold" style={{ color: RDC.blue }}>ECOLISA ERP RDC</span>
      </div>
    </div>
  );

  if (face === 'front') return renderFront();
  if (face === 'back') return renderBack();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
      {renderFront()}
      {renderBack()}
    </div>
  );
};
