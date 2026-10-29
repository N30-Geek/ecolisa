import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Printer, Download, User, School, MapPin, BookOpen, Calendar } from 'lucide-react';
import type { ScheduleSlot, ClasseScolaire, MembrePersonnel, Discipline, HoraireCreneau } from '../../types';
import { CustomSelect } from '../common/CustomSelect';
import { EPST_SECTIONS_OPTIONS } from '../../data/referentielEpstData';
import { getAllowedOptionsForClass } from '../../utils/academicContext';

export type ScheduleExportProfile = 'ELEVE' | 'ENSEIGNANT' | 'CHEF';

interface ScheduleExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  slots: ScheduleSlot[];
  classes: ClasseScolaire[];
  teachers: MembrePersonnel[];
  subjects: Discipline[];
  timeSlots: HoraireCreneau[];
  activeSchoolYear?: string;
  currentUser?: { role?: string; nom?: string } | null;
  currentStaff?: MembrePersonnel | null;
}

const VACATION_OPTIONS = [
  { value: 'MATIN', label: 'Matin' },
  { value: 'APRES_MIDI', label: 'Après-Midi' },
  { value: 'SOIR', label: 'Soir' },
  { value: 'SUR_MESURE', label: 'Sur Mesure' },
];

const DAYS_OF_WEEK = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

function normalizeNiveau(nom?: string): string | null {
  if (!nom) return null;
  const m = nom.toLowerCase();
  if (m.includes('1ère') || m.includes('1ere') || m.includes('première')) return '1';
  if (m.includes('2ème') || m.includes('2eme') || m.includes('deuxième') || m.includes('2e')) return '2';
  if (m.includes('3ème') || m.includes('3eme') || m.includes('troisième') || m.includes('3e')) return '3';
  if (m.includes('4ème') || m.includes('4eme') || m.includes('quatrième') || m.includes('4e')) return '4';
  if (m.includes('7ème') || m.includes('7eme') || m.includes('7e')) return '7';
  if (m.includes('8ème') || m.includes('8eme') || m.includes('8e')) return '8';
  return null;
}

function uuid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export const ScheduleExportModal: React.FC<ScheduleExportModalProps> = ({
  isOpen,
  onClose,
  slots,
  classes,
  teachers,
  subjects,
  timeSlots,
  activeSchoolYear,
  currentUser,
  currentStaff,
}) => {
  const [profile, setProfile] = useState<ScheduleExportProfile>('ELEVE');
  const [vacation, setVacation] = useState<'MATIN' | 'APRES_MIDI' | 'SOIR' | 'SUR_MESURE'>('MATIN');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('ALL');
  const [selectedRoom, setSelectedRoom] = useState<string>('ALL');
  const [selectedOption, setSelectedOption] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);

  const isTeacher = currentUser?.role === 'ENSEIGNANT' || currentUser?.role === 'TITULAIRE';

  React.useEffect(() => {
    if (isTeacher && currentStaff) {
      setSelectedTeacherId(currentStaff.id);
      if (profile === 'ENSEIGNANT') {
        setSelectedTeacherId(currentStaff.id);
      }
    }
  }, [isTeacher, currentStaff, profile]);

  const optionOptions = useMemo(() => {
    const base = [
      { value: 'ALL', label: 'Toutes les options' },
      ...EPST_SECTIONS_OPTIONS.filter(o => o.value !== 'ALL' && o.value !== 'TRONC_COMMUN'),
    ];
    if (selectedClassId === 'ALL') return base;
    const cl = classes.find(c => c.id === selectedClassId);
    if (!cl) return base;
    return [
      { value: 'ALL', label: 'Toutes les options' },
      ...getAllowedOptionsForClass(cl, classes, isTeacher ? currentStaff : null),
    ];
  }, [classes, selectedClassId, isTeacher, currentStaff]);

  const visibleTeachers = useMemo(() => {
    if (!isTeacher || !currentStaff) return teachers;
    return teachers.filter(t => t.id === currentStaff.id);
  }, [teachers, isTeacher, currentStaff]);

  const roomOptions = useMemo(() => {
    const set = new Set<string>();
    classes.forEach(c => { if (c.salle) set.add(c.salle); });
    slots.forEach(s => { if (s.salle) set.add(s.salle); });
    return [{ value: 'ALL', label: 'Toutes les salles' }, ...Array.from(set).map(r => ({ value: r, label: r }))];
  }, [classes, slots]);

  const availableClasses = useMemo(() => {
    if (selectedOption === 'ALL') return classes;
    return classes.filter(c => c.optionCode === selectedOption);
  }, [classes, selectedOption]);

  const filteredSlots = useMemo(() => {
    return slots.filter(s => {
      if (s.vacation !== vacation) return false;
      if (selectedClassId !== 'ALL' && s.classeId !== selectedClassId) return false;
      if (selectedTeacherId !== 'ALL' && s.professeurId !== selectedTeacherId) return false;
      if (selectedRoom !== 'ALL' && s.salle !== selectedRoom) return false;
      if (selectedOption !== 'ALL') {
        const cl = classes.find(c => c.id === s.classeId);
        if (!cl || cl.optionCode !== selectedOption) return false;
      }
      return true;
    });
  }, [slots, vacation, selectedClassId, selectedTeacherId, selectedRoom, selectedOption, classes]);

  const activeTimeSlots = useMemo(() => {
    return [...timeSlots].sort((a, b) => a.debut.localeCompare(b.debut));
  }, [timeSlots]);

  const handleExport = async () => {
    setLoading(true);
    try {
      await exportScheduleToPDF({
        profile,
        vacation,
        slots: filteredSlots,
        timeSlots: activeTimeSlots,
        classes,
        teachers,
        subjects,
        selectedClassId,
        selectedTeacherId,
        selectedRoom,
        activeSchoolYear,
        currentStaff,
      });
      onClose();
    } catch (e) {
      console.error('[ScheduleExport] Erreur export PDF :', e);
      alert('Erreur lors de l\'export PDF. Voir la console.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border shadow-2xl p-6 space-y-5"
        style={{ background: 'var(--sidebar-popover-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            <h3 className="font-black text-base">Exporter l'emploi du temps en PDF</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-500/20 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-bold mb-1 block">Profil d'export</label>
            <div className="flex rounded-xl p-1 border gap-1 bg-slate-500/10" style={{ borderColor: 'var(--border)' }}>
              {[
                { key: 'ELEVE', icon: School, label: 'Élève' },
                { key: 'ENSEIGNANT', icon: User, label: 'Enseignant' },
                { key: 'CHEF', icon: Printer, label: 'Chef' },
              ].map(p => (
                <button
                  key={p.key}
                  onClick={() => setProfile(p.key as ScheduleExportProfile)}
                  className={`flex-1 px-3 py-1.5 rounded-lg font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    profile === p.key ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <p.icon className="w-3.5 h-3.5" /> {p.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {profile === 'ELEVE' && 'Planning sans noms de professeurs, uniquement les matières et les horaires.'}
              {profile === 'ENSEIGNANT' && 'Planning du professeur avec sa classe, salle et matière.'}
              {profile === 'CHEF' && 'Planning complet avec nom du professeur, salle et matière.'}
            </p>
          </div>

          <div>
            <label className="font-bold mb-1 block">Vacation</label>
            <CustomSelect value={vacation} onChange={(v) => setVacation(v as any)} options={VACATION_OPTIONS} />
          </div>

          <div>
            <label className="font-bold mb-1 block">Classe / Promotion</label>
            <CustomSelect
              value={selectedClassId}
              onChange={setSelectedClassId}
              options={[{ value: 'ALL', label: 'Toutes les classes' }, ...availableClasses.map(c => ({ value: c.id, label: c.nom }))]}
              placeholder="Filtrer par classe..."
            />
          </div>

          <div>
            <label className="font-bold mb-1 block">Option / Section</label>
            <CustomSelect value={selectedOption} onChange={setSelectedOption} options={optionOptions} />
          </div>

          <div>
            <label className="font-bold mb-1 block">Enseignant</label>
            <CustomSelect
              value={selectedTeacherId}
              onChange={setSelectedTeacherId}
              options={[{ value: 'ALL', label: 'Tous les enseignants' }, ...visibleTeachers.map(t => ({ value: t.id, label: `${t.prenom} ${t.nom}` }))]}
              placeholder="Filtrer par enseignant..."
            />
          </div>

          <div>
            <label className="font-bold mb-1 block">Salle / Local</label>
            <CustomSelect value={selectedRoom} onChange={setSelectedRoom} options={roomOptions} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border font-bold text-xs hover:bg-slate-500/10 cursor-pointer"
            style={{ borderColor: 'var(--border)' }}
          >
            Annuler
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? <span className="animate-pulse">Génération...</span> : <><Download className="w-4 h-4" /> Exporter PDF</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

interface ScheduleExportJob {
  profile: ScheduleExportProfile;
  vacation: 'MATIN' | 'APRES_MIDI' | 'SOIR' | 'SUR_MESURE';
  slots: ScheduleSlot[];
  timeSlots: HoraireCreneau[];
  classes: ClasseScolaire[];
  teachers: MembrePersonnel[];
  subjects: Discipline[];
  selectedClassId: string;
  selectedTeacherId: string;
  selectedRoom: string;
  activeSchoolYear?: string;
  currentStaff?: MembrePersonnel | null;
}

async function exportScheduleToPDF(job: ScheduleExportJob) {
  const jsPDFModule = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable').catch(() => null);
  if (!autoTableModule) throw new Error('jspdf-autotable non disponible');
  const { jsPDF } = jsPDFModule as any;
  const autoTable = (autoTableModule as any).default || autoTableModule;

  const { profile, slots, timeSlots, classes, teachers, selectedClassId } = job;

  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const margin = 10;

  let title = 'Emploi du temps';
  if (profile === 'ELEVE') title = 'Emploi du temps - Élève';
  if (profile === 'ENSEIGNANT') title = 'Emploi du temps - Enseignant';
  if (profile === 'CHEF') title = 'Emploi du temps - Direction';

  if (selectedClassId !== 'ALL') {
    const cl = classes.find(c => c.id === selectedClassId);
    if (cl) title += ` — ${cl.nom}`;
  }

  doc.setFontSize(16);
  doc.text(title, pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(10);
  const subtitle = `Vacation : ${job.vacation} — Généré le ${new Date().toLocaleDateString('fr-FR')}`;
  doc.text(subtitle, pageWidth / 2, 22, { align: 'center' });

  const days = DAYS_OF_WEEK;
  const head = ['Horaire', ...days];

  const body: any[] = [];
  for (const ts of timeSlots) {
    if (ts.isBreak) {
      const row = [`${ts.debut} - ${ts.fin}\n${ts.label}`, ...Array(days.length).fill('— PAUSE —')];
      body.push(row);
      continue;
    }

    const row = [`${ts.debut} - ${ts.fin}\n${ts.label || 'Cours'}`];
    for (const day of days) {
      const slot = slots.find(s => s.jour === day && s.heureDebut === ts.debut && !ts.isBreak);
      if (!slot) {
        row.push('');
        continue;
      }

      const subject = job.subjects.find(s => s.id === slot.matiereId);
      const matiere = slot.nomMatiere || (subject?.nom) || 'Matière';
      const code = subject?.code ? `\n${subject.code}` : '';

      let cell = `${matiere}${code}`;

      if (profile === 'ENSEIGNANT') {
        const cls = job.classes.find(c => c.id === slot.classeId);
        const room = slot.salle ? `\nSalle ${slot.salle}` : '';
        const className = cls ? `\n${cls.nom}` : '';
        cell += `${className}${room}`;
      }

      if (profile === 'CHEF') {
        const prof = job.teachers.find(t => t.id === slot.professeurId);
        const profName = slot.nomProfesseur || (prof ? `${prof.prenom} ${prof.nom}` : 'Enseignant');
        const room = slot.salle ? `\nSalle ${slot.salle}` : '';
        cell += `\n${profName}${room}`;
      }

      row.push(cell);
    }
    body.push(row);
  }

  autoTable(doc, {
    startY: 30,
    margin: { left: margin, right: margin },
    head: [head],
    body,
    theme: 'grid',
    headStyles: { fillColor: [67, 56, 202], textColor: 255, fontSize: 9, halign: 'center', valign: 'middle' },
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', halign: 'center', valign: 'middle' },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 30 },
    },
    alternateRowStyles: { fillColor: [245, 245, 255] },
    didParseCell: (data: any) => {
      if (data.row.index === 0) return;
    },
  });

  const pdfData = doc.output('datauristring').split(',')[1];
  const defaultName = `emploi_du_temps_${profile.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`;

  // Electron : enregistrer via le système natif
  if ((window as any).electronAPI?.saveFile) {
    const res = await (window as any).electronAPI.saveFile({
      fileName: defaultName,
      dataBase64: pdfData,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (res && res.success) {
      // ok
    } else if (res && !res.canceled) {
      throw new Error(res.error || 'Erreur enregistrement fichier');
    }
    return;
  }

  // Fallback navigateur
  const bytes = base64ToUint8Array(pdfData);
  const blob = new Blob([bytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
