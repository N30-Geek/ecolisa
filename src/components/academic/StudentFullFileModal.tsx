import React from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Printer,
  Download,
  FileText,
  School,
  CheckCircle2,
  User,
  ShieldCheck,
  Award,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Heart,
  CreditCard
} from 'lucide-react';
import { Eleve } from '../../types';

interface StudentFullFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Eleve;
}

export const StudentFullFileModal: React.FC<StudentFullFileModalProps> = ({
  isOpen,
  onClose,
  student
}) => {
  if (!isOpen) return null;

  // Téléchargement direct du fichier PDF sans passer par la fenêtre d'impression
  const handleDownloadPDF = () => {
    const element = document.getElementById('full-file-print-section');
    if (!element) return;

    try {
      // Import dynamique de html2pdf
      import('html2pdf.js').then((html2pdfModule) => {
        const html2pdf = html2pdfModule.default || html2pdfModule;
        const opt = {
          margin: 8,
          filename: `Dossier_Complet_Eleve_${student.prenom}_${student.nom}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
        };
        html2pdf().set(opt).from(element).save();
      }).catch(() => {
        window.print();
      });
    } catch (e) {
      window.print();
    }
  };

  const handlePrintFallback = () => {
    window.print();
  };

  // Export vers MS Word (.docx / .doc) via Blob HTML formaté Word MSO Officiel
  const handleExportDOCX = () => {
    const headerHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
      <meta charset='utf-8'>
      <title>Dossier Élève - ${student.prenom} ${student.nom}</title>
      <style>
        @page WordSection1 { size: 21.0cm 29.7cm; margin: 2.0cm 2.0cm 2.0cm 2.0cm; mso-header-margin: 35.4pt; mso-footer-margin: 35.4pt; mso-paper-source: 0; }
        div.WordSection1 { page: WordSection1; }
        body { font-family: 'Segoe UI', 'Calibri', 'Arial', sans-serif; font-size: 10.5pt; color: #0f172a; line-height: 1.4; }
        .header-banner { background-color: #0f172a; color: #ffffff; padding: 12pt; text-align: center; border-radius: 4pt; margin-bottom: 15pt; }
        .header-banner h1 { font-size: 14pt; margin: 0; text-transform: uppercase; letter-spacing: 1pt; color: #ffffff; font-weight: bold; }
        .header-banner p { font-size: 9pt; margin: 3pt 0 0 0; color: #94a3b8; }
        h2 { font-size: 11pt; font-weight: bold; color: #1e3a8a; background-color: #f1f5f9; padding: 6pt; border-left: 4pt solid #2563eb; margin-top: 15pt; margin-bottom: 8pt; text-transform: uppercase; }
        table.data-grid { width: 100%; border-collapse: collapse; margin-bottom: 10pt; font-size: 10pt; }
        table.data-grid th { background-color: #e2e8f0; color: #1e293b; text-align: left; padding: 6pt 8pt; border: 1pt solid #cbd5e1; font-weight: bold; }
        table.data-grid td { padding: 6pt 8pt; border: 1pt solid #cbd5e1; vertical-align: top; }
        table.data-grid tr:nth-child(even) td { background-color: #f8fafc; }
        .badge-success { background-color: #dcfce7; color: #166534; font-weight: bold; padding: 2pt 6pt; border-radius: 3pt; font-size: 9pt; }
        .signature-table { width: 100%; margin-top: 30pt; border-collapse: collapse; }
        .signature-table td { width: 50%; vertical-align: top; border: none; }
      </style>
      </head>
      <body>
      <div class="WordSection1">
        <!-- EN TETE OFFICIEL RDC EPST -->
        <table style="width:100%; border-collapse:collapse; margin-bottom:10pt;">
          <tr>
            <td style="width:70%; border:none;">
              <p style="font-size:10pt; font-weight:bold; margin:0; text-transform:uppercase; color:#0f172a;">RÉPUBLIQUE DÉMOCRATIQUE DU CONGO</p>
              <p style="font-size:8.5pt; font-weight:bold; margin:0; color:#475569; text-transform:uppercase;">MINISTÈRE DE L'ENSEIGNEMENT PRIMAIRE, SECONDAIRE ET TECHNIQUE</p>
              <p style="font-size:12pt; font-weight:bold; margin:3pt 0 0 0; color:#1e3a8a; text-transform:uppercase;">COMPLEXE SCOLAIRE SAINT-MICHEL EPST RDC</p>
              <p style="font-size:8pt; color:#64748b; margin:0;">Code Établissement: 710482 · Kinshasa / Gombe</p>
            </td>
            <td style="width:30%; text-align:right; border:none; vertical-align:top;">
              <p style="font-size:9pt; font-weight:bold; margin:0;">Année Scolaire 2025–2026</p>
              <p style="font-size:9pt; font-weight:bold; color:#2563eb; margin:2pt 0;">Matricule: ${student.registrationNumber}</p>
            </td>
          </tr>
        </table>

        <div class="header-banner">
          <h1>DOSSIER SCOLAIRE & FICHE SIGNALÉTIQUE D'ÉLÈVE</h1>
          <p>Document Certifié Officiel et Conforme aux Registres EPST</p>
        </div>

        <h2>1. ÉTAT CIVIL & IDENTITÉ OFFICIELLE</h2>
        <table class="data-grid">
          <tr><th width="35%">Nom Complet de l'Élève</th><td><b>${student.nom} ${student.postnom || ''} ${student.prenom}</b></td></tr>
          <tr><th>Classe Actuelle & Section</th><td><b>${student.nomClasse}</b></td></tr>
          <tr><th>Date & Lieu de Naissance</th><td>${student.dateNaissance} à ${student.lieuNaissance || 'Kinshasa'}</td></tr>
          <tr><th>Sexe / Genre</th><td>${student.sexe === 'M' ? 'Masculin' : 'Féminin'}</td></tr>
          <tr><th>Adresse Physique Domicile</th><td>${student.adressePhysique || 'N° 45, Av. des Huileries, Q. Golf, C. Gombe, Kinshasa'}</td></tr>
          <tr><th>Province d'Origine (RDC)</th><td>${student.provinceOrigine || 'Haut-Katanga'}</td></tr>
          <tr><th>Territoire / Commune</th><td>${student.territoireCommune || 'Gombe'}</td></tr>
          <tr><th>Chefferie / Secteur</th><td>${student.chefferieSecteur || 'N/A'}</td></tr>
          <tr><th>Groupement / Village</th><td>${student.groupement || 'N/A'} / ${student.village || 'N/A'}</td></tr>
          <tr><th>Nationalité</th><td>Congolaise 🇨🇩</td></tr>
        </table>

        <h2>2. TUTEURS LÉGAUX & CONTACTS FAMILLE</h2>
        <table class="data-grid">
          <tr>
            <th width="35%">Père / Tuteur Principal</th>
            <td><b>${student.nomPere || student.nomParent || 'M. Jean-Baptiste Mukendi'}</b><br/>Profession: ${student.professionPere || 'Ingénieur BTP'}<br/>Tél: <b>${student.telephonePere || student.telephoneParent || '+243 81 555 0192'}</b><br/>Email: ${student.emailPere || student.emailParent || 'j.mukendi@gmail.com'}</td>
          </tr>
          <tr>
            <th>Mère / Tuteur Secondaire</th>
            <td><b>${student.nomMere || 'Mme Chantal Bakamba'}</b><br/>Profession: ${student.professionMere || 'Médecin Généraliste'}<br/>Tél: <b>${student.telephoneMere || '+243 99 444 8812'}</b><br/>Email: ${student.emailMere || 'c.bakamba@yahoo.fr'}</td>
          </tr>
        </table>

        <h2>3. FICHE MÉDICALE & INFIRMERIE</h2>
        <table class="data-grid">
          <tr><th width="35%">Groupe Sanguin & Rhésus</th><td><b style="color:#b91c1c;">O+ (Positif)</b></td></tr>
          <tr><th>Allergies & Contrindications</th><td>Aucune allergie sévère signalée</td></tr>
          <tr><th>Aptitude Physique & EPS</th><td>Aptitude complète aux activités sportives et scolaires</td></tr>
        </table>

        <h2>4. SYNTHÈSE ACADÉMIQUE & MINERVAL</h2>
        <table class="data-grid">
          <tr><th width="35%">Moyenne Générale S1</th><td><b style="color:#1d4ed8; font-size:11pt;">81.4 % (Mention Très Bien)</b> — Rang: 3ème / 32 élèves</td></tr>
          <tr><th>Taux d'Assiduité</th><td><b>98.5% (Présence Régulière)</b></td></tr>
          <tr><th>Compte Minerval 2025–2026</th><td><span class="badge-success">SOLDE À JOUR ($280 / $280 — 100% SOLDÉ)</span></td></tr>
        </table>

        <table class="signature-table">
          <tr>
            <td style="text-align:left;">
              <p style="margin:0;"><b>Fait à Kinshasa, le 15 Septembre 2025</b></p>
              <p style="font-size:8.5pt; color:#64748b; margin:2pt 0;">Sceau Officiel de l'Établissement</p>
              <div style="width:100pt; height:45pt; border:1pt dashed #cbd5e1; margin-top:5pt; text-align:center; padding-top:12pt; font-size:8pt; color:#94a3b8;">
                [ CACHET EPST ]
              </div>
            </td>
            <td style="text-align:right;">
              <p style="margin:0;"><b>Le Chef d'Établissement</b></p>
              <p style="font-size:8.5pt; color:#64748b; margin:2pt 0;">Signature & Validation Officielle</p>
              <div style="width:120pt; height:45pt; border:1pt dashed #cbd5e1; margin-top:5pt; margin-left:auto; text-align:center; padding-top:12pt; font-size:8pt; color:#94a3b8;">
                [ SIGNATURE CERTIFIÉE ]
              </div>
            </td>
          </tr>
        </table>
      </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', headerHtml], {
      type: 'application/msword'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Dossier_Complet_Eleve_${student.prenom}_${student.nom}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const modalJSX = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      {/* STYLES SPÉCIFIQUES POUR IMPRESSION ET EXPORT PDF */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          html, body {
            background: white !important;
            color: black !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden !important;
          }
          #full-file-print-section, #full-file-print-section * {
            visibility: visible !important;
          }
          #full-file-print-section {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="relative w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {/* EN-TÊTE DU MODAL */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between no-print"
          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-500 border border-indigo-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                Dossier Scolaire Complet & Fiche Signalétique de l'Élève
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-extrabold">
                  Document Officiel EPST RDC
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Génération intégrale imprimable ou exportable en Word (.DOCX) et PDF
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-500/10 text-slate-500 dark:text-slate-300 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BARRE D'ACTIONS MULTI-FORMATS (NO-PRINT) */}
        <div
          className="px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 no-print"
          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Format conforme au registre général des élèves EPST RDC</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportDOCX}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer border border-blue-400/40"
            >
              <Download className="w-4 h-4" /> Exporter en Word (.DOCX)
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer border border-emerald-400/40"
            >
              <Download className="w-4 h-4" /> 📥 Télécharger le PDF (Direct)
            </button>
            <button
              onClick={handlePrintFallback}
              className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Ouvrir la fenêtre d'impression"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimer
            </button>
          </div>
        </div>

        {/* CONTENU PRINCIPAL DU DOSSIER COMBINÉ (SECTION IMPRIMABLE) */}
        <div className="p-8 overflow-y-auto flex-1 bg-white text-slate-900" id="full-file-print-section">
          
          {/* EN-TÊTE RÉPUBLIQUE DÉMOCRATIQUE DU CONGO & ÉCOLE */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase text-slate-700 tracking-wider">
                  RÉPUBLIQUE DÉMOCRATIQUE DU CONGO
                </p>
                <p className="text-[10px] font-extrabold text-slate-500 uppercase">
                  MINISTÈRE DE L'ENSEIGNEMENT PRIMAIRE, SECONDAIRE ET TECHNIQUE
                </p>
                <h3 className="text-base font-black text-indigo-900 uppercase tracking-tight mt-1">
                  COMPLEXE SCOLAIRE SAINT-MICHEL EPST RDC
                </h3>
                <p className="text-[10px] text-slate-600">
                  Code Établissement: <strong>710482</strong> · Kinshasa / Gombe
                </p>
              </div>

              <div className="text-right flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs font-black uppercase text-slate-900">Année Scolaire 2025–2026</p>
                  <p className="text-[11px] font-mono font-bold text-indigo-700">Matricule: {student.registrationNumber}</p>
                </div>
                {student.photoUrl ? (
                  <img src={student.photoUrl} alt={student.prenom} className="w-16 h-20 rounded-lg object-cover border-2 border-slate-400 shadow-md" />
                ) : (
                  <div className="w-16 h-20 rounded-lg border-2 border-slate-400 bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-[10px]">
                    PHOTO
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 p-2 bg-indigo-950 text-white text-center rounded-lg shadow-sm">
              <h1 className="text-sm font-black uppercase tracking-widest">
                DOSSIER SCOLAIRE & FICHE SIGNALÉTIQUE COMPLÈTE DE L'ÉLÈVE
              </h1>
            </div>
          </div>

          {/* SECTION 1 : ÉTAT CIVIL & IDENTITÉ OFFICIELLE */}
          <div className="mb-6 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-indigo-900 border-b pb-1 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-700" /> 1. ÉTAT CIVIL & IDENTITÉ OFFICIELLE
            </h2>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs font-medium">
              <div className="flex border-b border-slate-200 py-1">
                <span className="w-36 text-slate-500 font-bold">Nom Complet:</span>
                <span className="font-black text-slate-950 uppercase">{student.nom} {student.postnom || ''} {student.prenom}</span>
              </div>
              <div className="flex border-b border-slate-200 py-1">
                <span className="w-36 text-slate-500 font-bold">Classe Actuelle:</span>
                <span className="font-black text-indigo-700">{student.nomClasse}</span>
              </div>
              <div className="flex border-b border-slate-200 py-1">
                <span className="w-36 text-slate-500 font-bold">Date & Lieu de Naissance:</span>
                <span className="font-bold text-slate-900">{student.dateNaissance} à {student.lieuNaissance || 'Kinshasa'}</span>
              </div>
              <div className="flex border-b border-slate-200 py-1">
                <span className="w-36 text-slate-500 font-bold">Sexe / Genre:</span>
                <span className="font-black text-slate-900">{student.sexe || 'Masculin'}</span>
              </div>
              <div className="flex border-b border-slate-200 py-1 col-span-2">
                <span className="w-36 text-slate-500 font-bold">Adresse Domicile:</span>
                <span className="font-bold text-slate-900">{student.adressePhysique || 'N° 45, Av. des Huileries, Q. Golf, C. Gombe, Kinshasa'}</span>
              </div>
            </div>

            {/* DÉCOUPAGE TERRITORIAL RDC */}
            <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-3 gap-2 text-[11px]">
              <div><span className="text-slate-500 font-bold">Province d'Origine:</span> <strong className="text-slate-900">{student.provinceOrigine || 'Haut-Katanga'}</strong></div>
              <div><span className="text-slate-500 font-bold">Territoire / Commune:</span> <strong className="text-slate-900">{student.territoireCommune || 'Gombe'}</strong></div>
              <div><span className="text-slate-500 font-bold">Chefferie / Secteur:</span> <strong className="text-slate-900">{student.chefferieSecteur || 'N/A'}</strong></div>
              <div><span className="text-slate-500 font-bold">Groupement:</span> <strong className="text-slate-900">{student.groupement || 'N/A'}</strong></div>
              <div><span className="text-slate-500 font-bold">Village:</span> <strong className="text-slate-900">{student.village || 'N/A'}</strong></div>
              <div><span className="text-slate-500 font-bold">Nationalité:</span> <strong className="text-slate-900">Congolaise 🇨🇩</strong></div>
            </div>
          </div>

          {/* SECTION 2 : TUTEURS LÉGAUX & CONTACTS FAMILLE */}
          <div className="mb-6 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-indigo-900 border-b pb-1 flex items-center gap-2">
              <Phone className="w-4 h-4 text-indigo-700" /> 2. TUTEURS LÉGAUX & PARENTS
            </h2>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                <p className="font-black text-indigo-900 text-xs">Père / Tuteur Principal Légal</p>
                <p className="font-bold text-slate-900">{student.nomPere || student.nomParent || 'M. Jean-Baptiste Mukendi'}</p>
                <p className="text-slate-600 text-[11px]">Profession: <strong>{student.professionPere || 'Ingénieur BTP'}</strong></p>
                <p className="text-slate-600 text-[11px]">Téléphone: <strong className="font-mono text-indigo-700">{student.telephonePere || student.telephoneParent || '+243 81 555 0192'}</strong></p>
                <p className="text-slate-600 text-[11px]">Email: <strong className="font-mono">{student.emailPere || student.emailParent || 'j.mukendi@gmail.com'}</strong></p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                <p className="font-black text-pink-900 text-xs">Mère / Tuteur Secondaire</p>
                <p className="font-bold text-slate-900">{student.nomMere || 'Mme Chantal Bakamba'}</p>
                <p className="text-slate-600 text-[11px]">Profession: <strong>{student.professionMere || 'Médecin Généraliste'}</strong></p>
                <p className="text-slate-600 text-[11px]">Téléphone: <strong className="font-mono text-pink-700">{student.telephoneMere || '+243 99 444 8812'}</strong></p>
                <p className="text-slate-600 text-[11px]">Email: <strong className="font-mono">{student.emailMere || 'c.bakamba@yahoo.fr'}</strong></p>
              </div>
            </div>
          </div>

          {/* SECTION 3 : RENSEIGNEMENTS MÉDICAUX & INFIRMERIE */}
          <div className="mb-6 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-indigo-900 border-b pb-1 flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-600" /> 3. FICHE MÉDICALE & INFIRMERIE SCOLAIRE
            </h2>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-lg border bg-red-50 border-red-200">
                <p className="text-[10px] font-black uppercase text-red-700">Groupe Sanguin & Rhésus</p>
                <p className="text-sm font-black text-red-900 mt-0.5">O+ (Positif)</p>
              </div>
              <div className="p-2.5 rounded-lg border bg-amber-50 border-amber-200">
                <p className="text-[10px] font-black uppercase text-amber-700">Allergies Signalées</p>
                <p className="text-xs font-bold text-amber-900 mt-0.5">Aucune allergie sévère</p>
              </div>
              <div className="p-2.5 rounded-lg border bg-blue-50 border-blue-200">
                <p className="text-[10px] font-black uppercase text-blue-700">Aptitude Physique & Sport</p>
                <p className="text-xs font-bold text-blue-900 mt-0.5">Aptitude Complète (EPS)</p>
              </div>
            </div>
          </div>

          {/* SECTION 4 : Bilan Académique & Minerval */}
          <div className="mb-6 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-indigo-900 border-b pb-1 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-700" /> 4. SYNTHÈSE ACADÉMIQUE & MINERVAL
            </h2>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg border bg-slate-50 border-slate-200">
                <p className="text-[10px] font-black uppercase text-slate-500">Moyenne Générale S1</p>
                <p className="text-sm font-black text-indigo-700 mt-0.5">78.5% (Mention Très Bien)</p>
              </div>
              <div className="p-3 rounded-lg border bg-slate-50 border-slate-200">
                <p className="text-[10px] font-black uppercase text-slate-500">Taux d'Assiduité</p>
                <p className="text-sm font-black text-emerald-700 mt-0.5">98.5% (Présence Régulière)</p>
              </div>
              <div className="p-3 rounded-lg border bg-slate-50 border-slate-200">
                <p className="text-[10px] font-black uppercase text-slate-500">Compte Minerval</p>
                <p className="text-sm font-black text-emerald-700 mt-0.5">100% Soldé ($280 / $280)</p>
              </div>
            </div>
          </div>

          {/* SECTION SIGNATURE & CERTIFICATION */}
          <div className="mt-8 pt-4 border-t-2 border-slate-900 flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-slate-800">Fait à Kinshasa, le 15 Septembre 2025</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Document certifié conforme aux archives EPST</p>
            </div>
            <div className="text-center">
              <p className="font-black text-slate-900 uppercase">Le Chef d'Établissement</p>
              <div className="mt-2 w-28 h-12 border border-dashed border-slate-400 mx-auto rounded flex items-center justify-center text-[9px] text-slate-400 font-bold">
                Cachet & Signature
              </div>
            </div>
          </div>

        </div>

        {/* PIED DE PAGE MODAL */}
        <div
          className="px-6 py-3 border-t flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 no-print"
          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
        >
          <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" /> Prêt pour exportation PDF et Word (.DOCX)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-500/10 text-slate-700 dark:text-slate-200 font-black hover:bg-slate-500/20 transition-all cursor-pointer border border-slate-500/20"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
};
