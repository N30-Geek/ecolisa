import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Printer,
  QrCode,
  Download,
  School,
  Award,
  CheckCircle2,
  Sparkles,
  Layers,
  Eye,
  RotateCw,
  Palette,
  User
} from 'lucide-react';
import { Eleve } from '../../types';

interface StudentIdCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Eleve;
}

export const StudentIdCardModal: React.FC<StudentIdCardModalProps> = ({
  isOpen,
  onClose,
  student
}) => {
  const [activeTab, setActiveTab] = useState<'inner' | 'outer' | 'unfolded'>('inner');
  const [cardTheme, setCardTheme] = useState<'blue' | 'indigo' | 'emerald' | 'gold'>('blue');

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Dynamic Theme Colors
  const themeStyles = {
    blue: {
      bgOuter: 'bg-gradient-to-br from-cyan-900 via-slate-900 to-blue-950',
      borderOuter: 'border-cyan-500/40',
      badgeBg: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/30',
      titleColor: 'text-cyan-300',
      accentColor: '#0ea5e9'
    },
    indigo: {
      bgOuter: 'bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950',
      borderOuter: 'border-indigo-500/40',
      badgeBg: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30',
      titleColor: 'text-indigo-300',
      accentColor: '#6366f1'
    },
    emerald: {
      bgOuter: 'bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950',
      borderOuter: 'border-emerald-500/40',
      badgeBg: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
      titleColor: 'text-emerald-300',
      accentColor: '#10b981'
    },
    gold: {
      bgOuter: 'bg-gradient-to-br from-amber-950 via-slate-900 to-yellow-950',
      borderOuter: 'border-amber-500/40',
      badgeBg: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
      titleColor: 'text-amber-300',
      accentColor: '#f59e0b'
    }
  }[cardTheme];

  const currentTheme = themeStyles;

  // Split permanent numbers into array of digits for EPST boxes
  const matriculeDigits = (student.registrationNumber || '7104829104').replace(/\D/g, '').padEnd(10, '0').split('');
  const codeEcoleDigits = '710482'.split('');
  const numPermanentDigits = '9876543210'.split('');

  const modalJSX = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      {/* IMPRESSION CSS STYLES SPECIFIQUES */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-section, #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="relative w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border text-slate-900 dark:text-white"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {/* EN-TÊTE MODAL */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between no-print"
          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-500 border border-indigo-500/30">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                Carte Officielle d'Identification de l'Élève EPST RDC
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-extrabold">
                  Certifié EPST
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Génération Recto / Verso intégrale & livret officiel de l'Enseignement Primaire, Secondaire et Technique
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

        {/* BARRE D'ACTIONS & SELECTION DE MODE (NO-PRINT) */}
        <div
          className="px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 no-print"
          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
        >
          {/* ONGLET VOLETS */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <button
              onClick={() => setActiveTab('inner')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'inner'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'hover:bg-slate-500/10'
              }`}
              style={{ color: activeTab === 'inner' ? '#ffffff' : 'var(--text-secondary)' }}
            >
              <Eye className="w-3.5 h-3.5" /> Volet Intérieur (Recto)
            </button>
            <button
              onClick={() => setActiveTab('outer')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'outer'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'hover:bg-slate-500/10'
              }`}
              style={{ color: activeTab === 'outer' ? '#ffffff' : 'var(--text-secondary)' }}
            >
              <RotateCw className="w-3.5 h-3.5" /> Couverture Extérieure (Verso)
            </button>
            <button
              onClick={() => setActiveTab('unfolded')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'unfolded'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'hover:bg-slate-500/10'
              }`}
              style={{ color: activeTab === 'unfolded' ? '#ffffff' : 'var(--text-secondary)' }}
            >
              <Layers className="w-3.5 h-3.5" /> Livret Déplié (Mode Impression)
            </button>
          </div>

          {/* SELECTION DE THEME & BOUTON IMPRIMER */}
          <div className="flex items-center gap-3">
            {/* COULEURS */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <span className="text-[10px] font-bold px-2 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                <Palette className="w-3 h-3" /> Thème :
              </span>
              {[
                { id: 'blue', color: 'bg-cyan-500' },
                { id: 'indigo', color: 'bg-indigo-500' },
                { id: 'emerald', color: 'bg-emerald-500' },
                { id: 'gold', color: 'bg-amber-500' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setCardTheme(t.id as any)}
                  className={`w-5 h-5 rounded-full ${t.color} border-2 transition-all cursor-pointer ${
                    cardTheme === t.id ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 hover:bg-emerald-500 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Imprimer / Export PDF HD
            </button>
          </div>
        </div>

        {/* ZONE PRINCIPALE DE CONSULTATION DE LA CARTE */}
        <div className="p-6 overflow-y-auto flex-1 flex items-center justify-center bg-slate-950/70" id="print-section">
          
          {/* ========================================================================= */}
          {/* OPTION 1 : VOLET INTÉRIEUR (RECTO - FICHE D'IDENTITÉ & PHOTO + MATRICULES)   */}
          {/* ========================================================================= */}
          {activeTab === 'inner' && (
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-3xl bg-cyan-950/30 border border-cyan-500/30 text-slate-900 shadow-2xl relative">
              {/* BANDEAU REPUBLIQUE DÉCORATIF EN ARRIÈRE PLAN */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-yellow-500/10 to-red-500/10 rounded-3xl pointer-events-none" />

              {/* VOLET GAUCHE INTÉRIEUR : IDENTITÉ D'ÉLÈVE */}
              <div className="p-5 rounded-2xl bg-white border border-cyan-200 shadow-md space-y-3 relative overflow-hidden">
                {/* EN-TÊTE RED BADGE */}
                <div className="inline-block px-4 py-1 rounded-r-lg bg-red-600 text-white font-black text-xs uppercase tracking-wider shadow-sm">
                  IDENTITE D'ELEVE
                </div>

                <div className="space-y-2 text-xs font-semibold text-slate-800 pt-1">
                  <div className="flex border-b border-dashed border-slate-300 pb-1">
                    <span className="w-32 text-slate-500 font-extrabold">Nom:</span>
                    <span className="font-black text-slate-950 uppercase">{student.nom}</span>
                  </div>
                  <div className="flex border-b border-dashed border-slate-300 pb-1">
                    <span className="w-32 text-slate-500 font-extrabold">Postnom:</span>
                    <span className="font-black text-slate-950 uppercase">{student.postnom || '-'}</span>
                  </div>
                  <div className="flex border-b border-dashed border-slate-300 pb-1">
                    <span className="w-32 text-slate-500 font-extrabold">Prénom:</span>
                    <span className="font-black text-slate-950 uppercase">{student.prenom}</span>
                  </div>
                  <div className="flex border-b border-dashed border-slate-300 pb-1">
                    <span className="w-32 text-slate-500 font-extrabold">Né(e) à:</span>
                    <span className="font-bold text-slate-900">
                      {student.lieuNaissance || 'Kinshasa'}, le {student.dateNaissance}
                    </span>
                  </div>
                  <div className="flex border-b border-dashed border-slate-300 pb-1">
                    <span className="w-32 text-slate-500 font-extrabold">Sexe:</span>
                    <span className="font-black text-slate-950">{student.sexe || 'M'}</span>
                  </div>
                  <div className="flex border-b border-dashed border-slate-300 pb-1">
                    <span className="w-32 text-slate-500 font-extrabold">Adresse:</span>
                    <span className="font-bold text-slate-900 leading-tight">
                      {student.adressePhysique || 'N° 45, Av. des Huileries, Q. Golf, C. Gombe'}
                    </span>
                  </div>
                  <div className="flex border-b border-dashed border-slate-300 pb-1">
                    <span className="w-32 text-slate-500 font-extrabold">Province d'origine:</span>
                    <span className="font-bold text-slate-900">{student.provinceOrigine || 'Haut-Katanga'}</span>
                  </div>
                  <div className="flex border-b border-dashed border-slate-300 pb-1">
                    <span className="w-32 text-slate-500 font-extrabold">Territoire/Commune:</span>
                    <span className="font-bold text-slate-900">{student.territoireCommune || 'Gombe'}</span>
                  </div>
                  <div className="flex border-b border-dashed border-slate-300 pb-1">
                    <span className="w-32 text-slate-500 font-extrabold">Chefferie/Secteur:</span>
                    <span className="font-bold text-slate-900">{student.chefferieSecteur || '-'}</span>
                  </div>
                  <div className="flex border-b border-dashed border-slate-300 pb-1">
                    <span className="w-32 text-slate-500 font-extrabold">Groupement:</span>
                    <span className="font-bold text-slate-900">{student.groupement || '-'}</span>
                  </div>
                  <div className="flex border-b border-dashed border-slate-300 pb-1">
                    <span className="w-32 text-slate-500 font-extrabold">Village:</span>
                    <span className="font-bold text-slate-900">{student.village || '-'}</span>
                  </div>
                </div>
              </div>

              {/* VOLET DROIT INTÉRIEUR : PHOTO & MATRICULES BOTTES EPST */}
              <div className="p-5 rounded-2xl bg-white border border-cyan-200 shadow-md flex flex-col justify-between space-y-4 text-center relative overflow-hidden">
                {/* PHOTO OFFICIELLE */}
                <div className="flex flex-col items-center pt-2">
                  <div className="w-28 h-32 rounded-xl border-2 border-slate-400 bg-slate-100 shadow-md overflow-hidden flex items-center justify-center relative">
                    {student.photoUrl ? (
                      <img src={student.photoUrl} alt={student.prenom} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-2">
                        <User className="w-12 h-12 stroke-[1.5]" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1">PHOTO</span>
                      </div>
                    )}
                    {/* FILIGRANE SCEAU SUR PHOTO */}
                    <div className="absolute bottom-1 right-1 p-0.5 rounded bg-blue-600/80 text-white text-[8px] font-black">
                      EPST
                    </div>
                  </div>
                </div>

                {/* MATRICULE & NUMÉRO PERMANENT EN CASES NUMÉROTÉES (BOÎTES OFFICIALES) */}
                <div className="space-y-3">
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-600 tracking-wider mb-1">
                      NUMERO D'IDENTIFICATION
                    </p>
                    <div className="flex justify-center gap-1">
                      {matriculeDigits.map((d: string, i: number) => (
                        <span key={i} className="w-6 h-7 rounded border border-slate-400 bg-slate-50 flex items-center justify-center font-mono font-black text-xs text-slate-900 shadow-inner">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-600 tracking-wider mb-1">
                      NUMERO PERMANENT
                    </p>
                    <div className="flex justify-center gap-1">
                      {numPermanentDigits.map((d: string, i: number) => (
                        <span key={i} className="w-6 h-7 rounded border border-slate-400 bg-slate-50 flex items-center justify-center font-mono font-black text-xs text-slate-900 shadow-inner">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* SIGNATURE & CACHET DU CHEF D'ÉTABLISSEMENT */}
                <div className="pt-2 border-t border-slate-200 text-[10px]">
                  <p className="text-slate-600 font-semibold">Fait à Kinshasa, le 15 / 09 / 2025</p>
                  <div className="mt-1 flex items-center justify-between px-4">
                    <div className="text-left">
                      <p className="font-black text-slate-900 uppercase">Nom et Signature</p>
                      <p className="text-[9px] text-slate-500">Du Chef d'Établissement</p>
                    </div>
                    {/* SCEAU DIGITALISE */}
                    <div className="w-12 h-12 rounded-full border-2 border-blue-600/40 border-dashed flex items-center justify-center text-blue-600 font-black text-[8px] rotate-[-12deg] bg-blue-500/5">
                      SEAU EPST
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* OPTION 2 : COUVERTURE EXTÉRIEURE (VERSO - FACE OFFICIELLE & DOS ÉCOLE)     */}
          {/* ========================================================================= */}
          {activeTab === 'outer' && (
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-700 text-white shadow-2xl relative">
              
              {/* VOLET GAUCHE EXTÉRIEUR : DOS ÉCOLE & CARTE GÉOGRAPHIQUE */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950 via-slate-900 to-blue-950 border border-cyan-500/30 shadow-md space-y-4 flex flex-col justify-between relative overflow-hidden">
                <div className="space-y-3">
                  <div className="inline-block px-3 py-1 rounded-r-lg bg-red-600 text-white font-black text-xs uppercase tracking-wider">
                    Dénomination de l'École :
                  </div>
                  <h3 className="text-sm font-black text-cyan-200 uppercase tracking-tight pl-1">
                    CS SAINT-MICHEL EPST RDC
                  </h3>

                  {/* CODE DE L'ÉCOLE CASES NUMÉROTÉES */}
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                      Code de l'École :
                    </p>
                    <div className="flex gap-1.5">
                      {codeEcoleDigits.map((d: string, i: number) => (
                        <span key={i} className="w-7 h-8 rounded border border-cyan-400/40 bg-cyan-950/80 flex items-center justify-center font-mono font-black text-sm text-cyan-300 shadow-md">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CARTE GÉOGRAPHIQUE DE LA PROVINCE DE L'ÉCOLE */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-cyan-500/20 text-center space-y-2 relative">
                  <p className="text-[10px] font-black uppercase text-cyan-400 tracking-wider">
                    Province d'Implantation Scolaire (RDC)
                  </p>
                  <div className="h-28 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center relative overflow-hidden">
                    {/* SVG SCHEMA CARTE DE LA PROVINCE */}
                    <svg className="w-full h-full text-cyan-500/30 p-2" viewBox="0 0 200 120" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M20,40 Q40,10 80,30 T150,20 T180,70 T120,110 T40,100 Z" fill="rgba(6,182,212,0.1)" />
                      <circle cx="80" cy="50" r="4" fill="#0ea5e9" />
                      <text x="90" y="54" fill="#67e8f9" fontSize="10" fontWeight="bold">KINSHASA / HAUT-UELE</text>
                    </svg>
                  </div>
                </div>

                {/* BANDEAU TRICOLORE RDC AU BAS */}
                <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-blue-500 via-yellow-400 to-red-500 shadow-md" />
              </div>

              {/* VOLET DROIT EXTÉRIEUR : COUVERTURE FACE OFFICIELLE DE LA CARTE */}
              <div className={`p-5 rounded-2xl ${currentTheme.bgOuter} border ${currentTheme.borderOuter} shadow-xl flex flex-col justify-between text-center relative overflow-hidden text-white space-y-4`}>
                
                {/* ARMOIRIES ET REPUBLIQUE EN-TÊTE */}
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-widest text-cyan-300">
                    République Démocratique du Congo
                  </h4>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-400/40 flex items-center justify-center font-black text-yellow-300 text-[10px]">
                      🇨🇩
                    </div>
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-300 pt-1">
                    MINISTERE DE L'ENSEIGNEMENT PRIMAIRE SECONDAIRE ET TECHNIQUE
                  </p>
                  <p className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                    PROVINCE DU HAUT-UELE / KINSHASA
                  </p>
                </div>

                {/* TITRE PRINCIPAL EMBOSSÉ DE LA CARTE */}
                <div className="py-3 px-2 rounded-xl bg-slate-950/60 border border-red-500/40 shadow-inner my-2">
                  <h2 className="text-sm font-black uppercase tracking-wider text-red-500 drop-shadow-md">
                    CARTE D'IDENTIFICATION DE L'ELEVE
                  </h2>
                </div>

                {/* QR CODE & ANNEE SCOLAIRE */}
                <div className="flex flex-col items-center space-y-2 pt-1">
                  <div className="p-2 rounded-xl bg-white text-slate-950 shadow-xl">
                    <QrCode className="w-12 h-12" />
                  </div>
                  <p className="text-xs font-black tracking-widest text-amber-300 font-mono">
                    ANNEE SCOLAIRE : 2025–2026
                  </p>
                </div>

                {/* BANDEAU TRICOLORE RDC AU BAS */}
                <div className="h-2 w-full rounded-full bg-gradient-to-r from-blue-500 via-yellow-400 to-red-500 shadow-md" />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* OPTION 3 : MODE LIVRET IMPRIMABLE 2 VOLETS DÉPLIÉS (FORMAT OFFICIEL)      */}
          {/* ========================================================================= */}
          {activeTab === 'unfolded' && (
            <div className="w-full space-y-6">
              <div className="text-center text-xs font-bold text-slate-400 no-print">
                📄 Vue Complète Prête à l'Impression / Plastification (Format Standard EPST RDC)
              </div>

              {/* FEUILLE RECTO-VERSO COMBINÉE */}
              <div className="p-6 rounded-3xl bg-white border border-slate-300 text-slate-900 shadow-2xl space-y-8">
                
                {/* 1. VUE INTERNE (RECTO) */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2 border-b pb-1">
                    VOLET INTÉRIEUR (RECTO)
                  </h4>
                  <div className="grid grid-cols-2 gap-3 border-2 border-slate-400 p-3 rounded-2xl bg-slate-50">
                    {/* INTERIEUR GAUCHE */}
                    <div className="p-3 bg-white border rounded-xl text-[11px] space-y-1.5">
                      <div className="px-2 py-0.5 bg-red-600 text-white font-black text-[10px] inline-block rounded">
                        IDENTITE D'ELEVE
                      </div>
                      <p><span className="font-bold text-slate-500">Nom:</span> <strong className="uppercase">{student.nom}</strong></p>
                      <p><span className="font-bold text-slate-500">Postnom:</span> <strong className="uppercase">{student.postnom || '-'}</strong></p>
                      <p><span className="font-bold text-slate-500">Prénom:</span> <strong className="uppercase">{student.prenom}</strong></p>
                      <p><span className="font-bold text-slate-500">Né(e) à:</span> {student.lieuNaissance || 'Kinshasa'}, le {student.dateNaissance}</p>
                      <p><span className="font-bold text-slate-500">Sexe:</span> {student.sexe || 'M'}</p>
                      <p><span className="font-bold text-slate-500">Adresse:</span> {student.adressePhysique || 'N° 45, Av. des Huileries'}</p>
                      <p><span className="font-bold text-slate-500">Province orig.:</span> {student.provinceOrigine || 'Haut-Katanga'}</p>
                    </div>

                    {/* INTERIEUR DROIT */}
                    <div className="p-3 bg-white border rounded-xl text-[11px] text-center flex flex-col justify-between">
                      <div className="w-16 h-20 border border-slate-400 bg-slate-100 mx-auto rounded flex items-center justify-center text-[9px] font-bold text-slate-400">
                        PHOTO
                      </div>
                      <div className="text-[9px] space-y-1">
                        <p className="font-black text-slate-600">ID: {student.registrationNumber}</p>
                        <p className="font-black text-slate-600">PERMANENT: 9876543210</p>
                      </div>
                      <div className="border-t pt-1 text-[8px] text-slate-500">
                        Signature Chef d'Établissement
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. VUE EXTERNE (VERSO) */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2 border-b pb-1">
                    COUVERTURE EXTÉRIEURE (VERSO)
                  </h4>
                  <div className="grid grid-cols-2 gap-3 border-2 border-slate-400 p-3 rounded-2xl bg-slate-900 text-white">
                    {/* DOS GAUCHE */}
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[10px] space-y-2">
                      <div className="px-2 py-0.5 bg-red-600 text-white font-black text-[9px] inline-block rounded">
                        CS SAINT-MICHEL EPST
                      </div>
                      <p className="font-mono text-cyan-300">CODE: 710482</p>
                      <div className="h-16 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-[9px] text-slate-500">
                        CARTE PROVINCE RDC
                      </div>
                    </div>

                    {/* FACE DROITE */}
                    <div className="p-3 bg-gradient-to-br from-indigo-900 to-slate-950 border border-indigo-500/40 rounded-xl text-center space-y-2">
                      <p className="text-[8px] font-black uppercase text-cyan-300">REP. DEMOCRATIQUE DU CONGO</p>
                      <h5 className="text-[11px] font-black text-red-500 uppercase">CARTE D'IDENTIFICATION DE L'ELEVE</h5>
                      <QrCode className="w-8 h-8 mx-auto text-white" />
                      <p className="text-[9px] font-black text-amber-300 font-mono">2025–2026</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* PIED DE PAGE MODAL */}
        <div
          className="px-6 py-3 border-t flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 no-print"
          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
        >
          <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" /> Prêt pour impression officielle EPST RDC
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-500/10 text-slate-700 dark:text-slate-200 font-black hover:bg-slate-500/20 transition-all cursor-pointer border border-slate-500/20"
          >
            Fermer l'Aperçu
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
};
