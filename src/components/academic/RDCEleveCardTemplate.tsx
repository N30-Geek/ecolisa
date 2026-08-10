import React from 'react';
import { QRCode } from 'react-qr-code';
import { School } from 'lucide-react';
import { Eleve } from '../../types';
import { SchoolConfig } from '../onboarding/OnboardingWizard';
import { LOGO_EPST_RDC_BASE64 } from '../../assets/logoEPSTData';
import { FLAG_RDC_BASE64 } from '../../assets/flagRDCData';

interface RDCEleveCardProps {
  student: Eleve;
  schoolConfig?: Partial<SchoolConfig> | null;
  face?: 'front' | 'back' | 'both';
  className?: string;
}

export const RDCEleveCardTemplate: React.FC<RDCEleveCardProps> = ({
  student,
  schoolConfig,
  face = 'both',
  className = '',
}) => {
  const schoolName = schoolConfig?.schoolName || 'COMPLEXE SCOLAIRE LUMUMBA (CS LUMUMBA)';
  const schoolAddress = schoolConfig?.address || 'N° 1234, AV. DE LA RÉVOLUTION, GOMBE, KINSHASA';
  const activeYear = schoolConfig?.activeSchoolYear || '2025–2026';
  const cardCustom = schoolConfig?.cardCustomization;
  const cardBgColor = cardCustom?.cardBgColor || '#F0F4F8';
  const filigreeOpacity = cardCustom?.filigreeOpacity ?? 0.08;

  const qrPayload = JSON.stringify({
    app: 'ECOLISA_EPST',
    id: student.id,
    registrationNumber: student.registrationNumber,
    nom: `${student.nom} ${student.postnom || ''} ${student.prenom}`,
    classe: student.nomClasse,
  });

  const renderFront = () => (
    <div
      className="relative overflow-hidden rounded-[14px] border border-slate-300 shadow-xl flex flex-col justify-between p-3 select-none"
      style={{
        width: '324px',
        height: '204px', // Ratio carte de crédit 85.6mm x 54mm
        backgroundColor: cardBgColor,
        boxSizing: 'border-box',
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      {/* MOTIF DE FOND GUILLOCHE / FILIGRANE ONDULÉ AVEC OPACITÉ CONFIGURABLE */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: filigreeOpacity }} viewBox="0 0 324 204" fill="none">
        <path d="M-20 40 Q80 120 180 40 T380 40" stroke="#0056b3" strokeWidth="3" fill="none" />
        <path d="M-20 80 Q80 160 180 80 T380 80" stroke="#0056b3" strokeWidth="2" fill="none" />
        <path d="M-20 120 Q80 200 180 120 T380 120" stroke="#0056b3" strokeWidth="3" fill="none" />
        <circle cx="162" cy="102" r="80" stroke="#0056b3" strokeWidth="1" fill="none" />
        <circle cx="162" cy="102" r="60" stroke="#0056b3" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
      </svg>

      {/* LOGO DE L'ÉCOLE EN FILIGRANE EN FOND (UN PEU FLOU ET TRANSLUCIDE) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        {schoolConfig?.logoUrl ? (
          <img
            src={schoolConfig.logoUrl}
            alt="School Watermark"
            className="w-36 h-36 object-contain opacity-15 blur-[0.6px] select-none"
          />
        ) : (
          <div className="w-32 h-32 rounded-full border-4 border-indigo-900/10 flex items-center justify-center opacity-10 blur-[0.5px]">
            <School className="w-20 h-20 text-indigo-900" />
          </div>
        )}
      </div>

      {/* BANDEAU HAUT EN-TÊTE HARMONISÉ : LOGO EPST À GAUCHE, TEXTE AU CENTRE, LOGO ÉCOLE À DROITE */}
      <div className="relative z-10 space-y-1">
        <div className="flex items-center justify-between gap-1 border-b pb-1 border-slate-300/60">
          {/* LOGO GAUCHE : SCEAU OFFICIEL EPST RDC (input_file_1.png) */}
          <div className="w-7 h-7 rounded-full bg-white p-0.5 border border-slate-300 shrink-0 shadow-2xs flex items-center justify-center">
            <img src={LOGO_EPST_RDC_BASE64} alt="EPST Logo" className="w-full h-full object-contain" />
          </div>

          {/* CENTRE : TITRES HARMONISÉS CENTRÉS */}
          <div className="flex-1 text-center min-w-0 leading-tight">
            <p className="text-[7.5px] font-black uppercase text-slate-900 tracking-tight truncate">
              RÉPUBLIQUE DÉMOCRATIQUE DU CONGO
            </p>
            <p className="text-[5.5px] font-bold uppercase text-slate-600 tracking-tight truncate">
              MINISTÈRE DE L'ENSEIGNEMENT PRIMAIRE, SECONDAIRE ET TECHNIQUE (EPST)
            </p>
            <h3 className="text-[8.5px] font-black uppercase text-indigo-950 tracking-tight truncate mt-0.5">
              {schoolName}
            </h3>
          </div>

          {/* LOGO DROITE : LOGO DE L'ÉCOLE */}
          <div className="w-7 h-7 rounded-md bg-white p-0.5 border border-slate-300 shrink-0 shadow-2xs flex items-center justify-center">
            {schoolConfig?.logoUrl ? (
              <img src={schoolConfig.logoUrl} alt="School Logo" className="w-full h-full object-contain rounded" />
            ) : (
              <School className="w-4 h-4 text-indigo-700" />
            )}
          </div>
        </div>

        {/* LIGNE TRICOLORE ACCENT */}
        <div className="h-[2.5px] w-full flex rounded-full overflow-hidden">
          <div className="flex-1 bg-[#007fff]" />
          <div className="flex-1 bg-[#ffcd00]" />
          <div className="flex-1 bg-[#ce1126]" />
        </div>
      </div>

      {/* TITRE CARTE */}
      <div className="relative z-10 text-center my-0.5">
        <h2 className="text-[11px] font-black uppercase text-[#03396c] tracking-wider leading-none">
          CARTE D'ÉLÈVE
        </h2>
      </div>

      {/* BLOC PRINCIPAL DE CONTENU RECTO (PHOTO + FORMULAIRE STRUCTURÉ) */}
      <div className="relative z-10 flex items-start gap-2 flex-1">
        {/* PHOTO ÉLÈVE AVEC BADGE HOLOGRAMME EPST */}
        <div className="relative shrink-0 flex flex-col items-center">
          <div className="w-[66px] h-[82px] rounded-lg border-2 border-slate-400 bg-white overflow-hidden shadow-sm relative">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt={student.prenom} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400">
                <span className="text-[8px] font-bold uppercase">PHOTO</span>
              </div>
            )}
            {/* TAMPON HOLOGRAMME EPST */}
            <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-gradient-to-br from-yellow-300 via-amber-500 to-indigo-600 border border-white flex items-center justify-center text-[5px] font-black text-white shadow-xs">
              EPST
            </div>
          </div>
        </div>

        {/* INFORMATIONS MATRICULE & DÉTAILS EN GRILLE CADRÉE */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* CADRE INFORMATIONS RECTANGULAIRE */}
          <div className="border border-slate-300 rounded-md bg-white/80 p-1 space-y-0.5 text-[7px] text-slate-900 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
              <span className="font-bold text-slate-500">N° ID ÉLÈVE:</span>
              <span className="font-mono font-black text-indigo-700">{student.registrationNumber}</span>
            </div>
            <div className="grid grid-cols-2 gap-1 border-b border-slate-200 pb-0.5">
              <div><span className="text-slate-500">NÉ(E) LE:</span> <b>{student.dateNaissance || '12/05/2012'}</b></div>
              <div><span className="text-slate-500">SEXE:</span> <b>{student.sexe || 'F'}</b></div>
            </div>
            <div className="grid grid-cols-2 gap-1 border-b border-slate-200 pb-0.5">
              <div className="truncate"><span className="text-slate-500">LIEU:</span> <b>{student.lieuNaissance || 'KINSHASA'}</b></div>
              <div><span className="text-slate-500">ANNÉE:</span> <b>{activeYear}</b></div>
            </div>
            <div className="truncate pt-0.5">
              <span className="text-slate-500 block text-[6px]">ÉCOLE:</span>
              <strong className="text-indigo-900 text-[7px] uppercase block truncate">{schoolName}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* PIED DU RECTO : IDENTITÉ NOM, PRÉNOM, GROUPE SANGUIN, DRAPEAU RDC & QR CODE */}
      <div className="relative z-10 flex items-end justify-between gap-1 pt-1 border-t border-slate-300/80">
        <div className="space-y-0.5 min-w-0 flex-1 text-[7.5px] leading-tight">
          <div className="truncate">
            <span className="text-slate-500 font-bold uppercase text-[6.5px]">NOM: </span>
            <strong className="font-black text-slate-950 uppercase">{student.nom} {student.postnom || ''}</strong>
          </div>
          <div className="truncate">
            <span className="text-slate-500 font-bold uppercase text-[6.5px]">PRÉNOMS: </span>
            <strong className="font-bold text-indigo-800 uppercase">{student.prenom}</strong>
          </div>
          <div className="text-[6.5px] text-slate-700 pt-0.5 truncate">
            <strong>GROUPE SANGUIN:</strong> <span className="text-rose-700 font-black">{student.groupeSanguin || 'B+ | RH: POSITIF'}</span>
          </div>
          <div className="text-[6.5px] text-slate-700 truncate">
            <strong>SECTION:</strong> {student.nomClasse}
          </div>
        </div>

        {/* BLOC DRAPEAU RDC & QR CODE RECTO */}
        <div className="flex items-center gap-1 shrink-0">
          {/* DRAPEAU OFFICIEL RDC (input_file_1.png) */}
          <div className="w-6 h-4 rounded-xs overflow-hidden border border-slate-300 shadow-2xs shrink-0">
            <img src={FLAG_RDC_BASE64} alt="Drapeau RDC" className="w-full h-full object-cover" />
          </div>
          {/* QR CODE */}
          <div className="bg-white p-0.5 rounded border border-slate-300 shadow-2xs shrink-0">
            <QRCode value={qrPayload} size={34} level="M" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderBack = () => (
    <div
      className="relative overflow-hidden rounded-[14px] border border-slate-300 shadow-xl flex flex-col justify-between p-3 select-none"
      style={{
        width: '324px',
        height: '204px', // Ratio carte de crédit 85.6mm x 54mm
        backgroundColor: '#F0F4F8',
        boxSizing: 'border-box',
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      {/* MOTIF DE FOND GUILLOCHE VERSO */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.06]" viewBox="0 0 324 204" fill="none">
        <path d="M-20 160 Q80 80 180 160 T380 160" stroke="#0056b3" strokeWidth="3" fill="none" />
        <circle cx="162" cy="102" r="75" stroke="#0056b3" strokeWidth="1" fill="none" />
      </svg>

      {/* LOGO DE L'ÉCOLE EN FILIGRANE EN FOND VERSO */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        {schoolConfig?.logoUrl ? (
          <img
            src={schoolConfig.logoUrl}
            alt="School Watermark"
            className="w-36 h-36 object-contain opacity-15 blur-[0.6px] select-none"
          />
        ) : (
          <div className="w-32 h-32 rounded-full border-4 border-indigo-900/10 flex items-center justify-center opacity-10 blur-[0.5px]">
            <School className="w-20 h-20 text-indigo-900" />
          </div>
        )}
      </div>

      {/* EN-TÊTE VERSO */}
      <div className="relative z-10 space-y-0.5">
        <div className="text-[8px] font-black uppercase text-[#03396c] tracking-wider text-center">
          INFORMATIONS COMPLÉMENTAIRES
        </div>
        <div className="text-[6.5px] font-bold uppercase text-slate-600 tracking-tight leading-none text-center">
          MINISTÈRE DE L'ENSEIGNEMENT PRIMAIRE, SECONDAIRE ET TECHNIQUE (EPST)
        </div>

        {/* LIGNE TRICOLORE ACCENT */}
        <div className="h-[2.5px] w-full flex rounded-full overflow-hidden mt-0.5">
          <div className="flex-1 bg-[#007fff]" />
          <div className="flex-1 bg-[#ffcd00]" />
          <div className="flex-1 bg-[#ce1126]" />
        </div>
      </div>

      {/* BLOC ADRESSE ET CONTACTS CADRÉ */}
      <div className="relative z-10 border border-slate-300 rounded-md bg-white/80 p-1.5 space-y-0.5 text-[7px] text-slate-800 shadow-2xs my-1">
        <div className="text-[8px] font-black uppercase text-[#03396c] border-b border-slate-200 pb-0.5">
          ADRESSE ET CONTACTS
        </div>
        <div className="pt-0.5">
          <span className="font-bold text-slate-500">ADRESSE DOMICILE:</span>{' '}
          <strong>{student.adressePhysique || schoolAddress}</strong>
        </div>
        <div>
          <span className="font-bold text-slate-500">CONTACT URGENCE:</span>{' '}
          <strong className="text-indigo-700">{student.telephoneParent || student.telephonePere || '(+243) 812-345-678'}</strong> (Tuteur: {student.nomParent || student.nomPere || 'Jean-Pierre MUTEBA'})
        </div>
        <div>
          <span className="font-bold text-slate-500">ALLERGIES:</span> <strong>{student.allergies || 'Aucune Connue'}</strong>
        </div>
        <div>
          <span className="font-bold text-slate-500">SECTION:</span> <strong>{student.nomClasse}</strong>
        </div>
      </div>

      {/* BLOC SIGNATURES (ESPACE OUVERT POUR TAMPON PHYSIQUE DU DIRECTEUR) */}
      <div className="relative z-10 flex items-center justify-between px-2 text-[7px]">
        <div className="text-center space-y-2">
          <span className="font-bold text-slate-600 uppercase text-[6px] block">SIGNATURE PARENT/TUTEUR</span>
          <div className="h-5 flex items-center justify-center italic text-slate-400 text-[8px] font-serif">
            J.P. Muteba
          </div>
        </div>

        {/* ESPACE POUR TAMPON PHYSIQUE */}
        <div className="w-16 h-8 border border-dashed border-slate-300 rounded flex items-center justify-center text-[5.5px] text-slate-400 font-bold uppercase tracking-tight text-center px-1">
          Emplacement Sceau Physique
        </div>

        <div className="text-center space-y-2">
          <span className="font-bold text-slate-600 uppercase text-[6px] block">CHEF D'ÉTABLISSEMENT</span>
          <div className="h-5 flex items-center justify-center italic text-indigo-900 text-[8px] font-serif font-bold">
            Le Directeur
          </div>
        </div>
      </div>

      {/* BANDE FONT CODE MRZ (MACHINE READABLE ZONE) */}
      <div className="relative z-10 bg-slate-200/90 border border-slate-300 rounded px-1 py-0.5 text-[5.5px] font-mono text-slate-800 tracking-tighter leading-tight text-center overflow-hidden">
        IDRDC{student.nom.toUpperCase()}&lt;&lt;&lt;&lt;{student.prenom.toUpperCase()}&lt;&lt;&lt;&lt;{student.registrationNumber.replace(/-/g, '')}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;<br />
        EKINSHASIDE&lt;&lt;&lt;&lt;&lt;&lt;C0&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 ${className}`}>
      {(face === 'front' || face === 'both') && renderFront()}
      {(face === 'back' || face === 'both') && renderBack()}
    </div>
  );
};

/**
 * Générateur de code HTML pure autonome compatible Puppeteer & wkhtmltopdf (85.6mm x 54mm)
 */
export function generateRDCCardHTML(student: Eleve, schoolConfig?: Partial<SchoolConfig> | null): string {
  const schoolName = schoolConfig?.schoolName || 'COMPLEXE SCOLAIRE LUMUMBA (CS LUMUMBA)';
  const schoolAddress = schoolConfig?.address || 'N° 1234, AV. DE LA RÉVOLUTION, GOMBE, KINSHASA';
  const activeYear = schoolConfig?.activeSchoolYear || '2025–2026';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Carte Élève EPST RDC - ${student.prenom} ${student.nom}</title>
  <style>
    @page {
      size: 85.6mm 54mm;
      margin: 0;
    }
    *, *:before, *:after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 85.6mm;
      height: 54mm;
      background-color: #F0F4F8;
      font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color: #0f172a;
    }
    .card-container {
      width: 85.6mm;
      height: 54mm;
      padding: 3mm;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-radius: 4mm;
      border: 0.3mm solid #cbd5e1;
      background: #F0F4F8;
      page-break-after: always;
    }
    .tricolor-bar {
      height: 1mm;
      width: 100%;
      display: flex;
      border-radius: 1mm;
      overflow: hidden;
      margin-top: 1mm;
    }
    .tricolor-bar .c-blue { flex: 1; background: #007fff; }
    .tricolor-bar .c-yellow { flex: 1; background: #ffcd00; }
    .tricolor-bar .c-red { flex: 1; background: #ce1126; }
    
    .header-title { font-size: 7pt; font-weight: 900; text-transform: uppercase; text-align: center; color: #0f172a; }
    .header-sub { font-size: 5.5pt; font-weight: 700; text-transform: uppercase; text-align: center; color: #475569; }
    .card-label { font-size: 9pt; font-weight: 900; text-transform: uppercase; text-align: center; color: #03396c; margin: 1mm 0; }
    
    .main-body { display: flex; gap: 2mm; flex: 1; }
    .photo-box {
      width: 18mm;
      height: 22mm;
      border-radius: 2mm;
      border: 0.4mm solid #64748b;
      background: #ffffff;
      overflow: hidden;
      position: relative;
      flex-shrink: 0;
    }
    .photo-box img { width: 100%; height: 100%; object-fit: cover; }
    .stamp-hologram {
      position: absolute;
      bottom: 0.5mm;
      right: 0.5mm;
      width: 4mm;
      height: 4mm;
      border-radius: 50%;
      background: linear-gradient(135deg, #fde047, #f59e0b, #4f46e5);
      color: #fff;
      font-size: 3pt;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .info-grid {
      flex: 1;
      border: 0.3mm solid #cbd5e1;
      border-radius: 1.5mm;
      background: rgba(255,255,255,0.85);
      padding: 1mm;
      font-size: 5.5pt;
    }
    .info-row { display: flex; justify-content: space-between; border-bottom: 0.2mm solid #e2e8f0; padding-bottom: 0.5mm; margin-bottom: 0.5mm; }
    .info-label { color: #64748b; font-weight: 700; }
    .info-val { font-weight: 900; color: #0f172a; }
    .info-val-blue { font-weight: 900; color: #1d4ed8; }
    
    .footer-recto { display: flex; justify-content: space-between; align-items: flex-end; border-top: 0.3mm solid #cbd5e1; pt: 1mm; }
    .mrz-band {
      background: #e2e8f0;
      border: 0.2mm solid #cbd5e1;
      border-radius: 1mm;
      font-family: 'Courier New', Courier, monospace;
      font-size: 4.5pt;
      text-align: center;
      padding: 0.5mm;
      letter-spacing: -0.2pt;
    }
  </style>
</head>
<body>
  <!-- RECTO -->
  <div class="card-container">
    <div>
      <div style="display:flex; align-items:center; justify-space-between; gap:2mm; border-bottom:0.2mm solid #cbd5e1; padding-bottom:1mm;">
        <div style="width:7mm; height:7mm; border-radius:50%; background:#fff; border:0.2mm solid #cbd5e1; padding:0.3mm; flex-shrink:0; display:flex; align-items:center; justify-content:center;">
          <img src="${LOGO_EPST_RDC_BASE64}" alt="EPST" style="width:100%; height:100%; object-fit:contain;" />
        </div>
        <div style="flex:1; text-align:center;">
          <div class="header-title">RÉPUBLIQUE DÉMOCRATIQUE DU CONGO</div>
          <div class="header-sub">MINISTÈRE DE L'ENSEIGNEMENT PRIMAIRE, SECONDAIRE ET TECHNIQUE (EPST)</div>
          <div style="font-size:6pt; font-weight:900; color:#1e3a8a; text-transform:uppercase; margin-top:0.3mm;">${schoolName}</div>
        </div>
        <div style="width:7mm; height:7mm; border-radius:1mm; background:#fff; border:0.2mm solid #cbd5e1; padding:0.3mm; flex-shrink:0; display:flex; align-items:center; justify-content:center;">
          ${schoolConfig?.logoUrl ? `<img src="${schoolConfig.logoUrl}" alt="School" style="width:100%; height:100%; object-fit:contain;" />` : '<div style="font-size:4.5pt; font-weight:900; color:#1e3a8a;">ETS</div>'}
        </div>
      </div>
      <div class="tricolor-bar"><div class="c-blue"></div><div class="c-yellow"></div><div class="c-red"></div></div>
    </div>
    
    <div class="card-label">CARTE D'ÉLÈVE</div>
    
    <div class="main-body">
      <div class="photo-box">
        ${student.photoUrl ? `<img src="${student.photoUrl}" alt="Photo" />` : '<div style="text-align:center; padding-top:6mm; font-size:5pt; color:#94a3b8;">PHOTO</div>'}
        <div class="stamp-hologram">EPST</div>
      </div>
      
      <div class="info-grid">
        <div class="info-row"><span class="info-label">N° ID ÉLÈVE:</span><span class="info-val-blue">${student.registrationNumber}</span></div>
        <div class="info-row"><span><span class="info-label">NÉ(E) LE:</span> <b>${student.dateNaissance || '12/05/2012'}</b></span><span><span class="info-label">SEXE:</span> <b>${student.sexe || 'F'}</b></span></div>
        <div class="info-row"><span><span class="info-label">LIEU:</span> <b>${student.lieuNaissance || 'KINSHASA'}</b></span><span><span class="info-label">ANNÉE:</span> <b>${activeYear}</b></span></div>
        <div><span class="info-label">ÉCOLE:</span> <b style="color:#1e3a8a;">${schoolName}</b></div>
      </div>
    </div>
    
    <div class="footer-recto">
      <div style="font-size: 5.5pt; line-height: 1.2;">
        <div><span style="color:#64748b;">NOM:</span> <b>${student.nom} ${student.postnom || ''}</b></div>
        <div><span style="color:#64748b;">PRÉNOMS:</span> <b style="color:#1d4ed8;">${student.prenom}</b></div>
        <div><span style="color:#64748b;">GROUPE SANGUIN:</span> <b style="color:#b91c1c;">${student.groupeSanguin || 'B+ | RH: POSITIF'}</b></div>
        <div><span style="color:#64748b;">SECTION:</span> <b>${student.nomClasse}</b></div>
      </div>
      <div style="display:flex; align-items:center; gap:1.5mm;">
        <div style="width:6mm; height:4.2mm; border-radius:0.5mm; overflow:hidden; border:0.2mm solid #cbd5e1;">
          <img src="${FLAG_RDC_BASE64}" alt="Drapeau RDC" style="width:100%; height:100%; object-fit:cover;" />
        </div>
      </div>
    </div>
  </div>

  <!-- VERSO -->
  <div class="card-container">
    <div>
      <div class="header-title" style="color:#03396c;">INFORMATIONS COMPLÉMENTAIRES</div>
      <div class="header-sub">MINISTÈRE DE L'ENSEIGNEMENT PRIMAIRE, SECONDAIRE ET TECHNIQUE (EPST)</div>
      <div class="tricolor-bar"><div class="c-blue"></div><div class="c-yellow"></div><div class="c-red"></div></div>
    </div>
    
    <div class="info-grid" style="margin: 1mm 0;">
      <div style="font-weight:900; color:#03396c; border-bottom:0.2mm solid #e2e8f0; margin-bottom:0.5mm;">ADRESSE ET CONTACTS</div>
      <div><span class="info-label">ADRESSE DOMICILE:</span> <b>${student.adressePhysique || schoolAddress}</b></div>
      <div><span class="info-label">CONTACT URGENCE:</span> <b style="color:#1d4ed8;">${student.telephoneParent || student.telephonePere || '(+243) 812-345-678'}</b> (Tuteur: ${student.nomParent || student.nomPere || 'Jean-Pierre MUTEBA'})</div>
      <div><span class="info-label">ALLERGIES:</span> <b>${student.allergies || 'Aucune Connue'}</b></div>
      <div><span class="info-label">SECTION:</span> <b>${student.nomClasse}</b></div>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; font-size:5pt;">
      <div style="text-align:center;">
        <span style="color:#64748b; font-weight:700;">SIGNATURE PARENT/TUTEUR</span>
        <div style="font-family:serif; font-style:italic; margin-top:2mm; color:#64748b;">J.P. Muteba</div>
      </div>
      <div style="text-align:center;">
        <span style="color:#64748b; font-weight:700;">CHEF D'ÉTABLISSEMENT</span>
        <div style="font-family:serif; font-style:italic; font-weight:700; margin-top:2mm; color:#1e3a8a;">Le Directeur</div>
      </div>
    </div>

    <div class="mrz-band">
      IDRDC${student.nom.toUpperCase()}<<<<${student.prenom.toUpperCase()}<<<<${student.registrationNumber.replace(/-/g, '')}<<<<<<<<<<br>
      EKINSHASIDE<<<<<<C0<<<<<<<<<<<<<<
    </div>
  </div>
</body>
</html>`;
}

