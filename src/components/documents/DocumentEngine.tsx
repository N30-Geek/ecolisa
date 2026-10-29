import React, { useState } from 'react';
import {
  GraduationCap,
  Wallet,
  Building2,
  HeartPulse,
  Users,
  FileText,
  Award,
  TrendingUp,
  Receipt,
  Banknote,
  BookOpen,
  UserCheck,
  CalendarDays,
  ShieldCheck,
  Stethoscope,
  FileOutput,
} from 'lucide-react';
import { DocumentGeneratorModal, StudentReportTemplate } from './DocumentGeneratorModal';

type TabKey = 'pedagogie' | 'finances' | 'administration' | 'vie-scolaire';

interface DocumentCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  template?: StudentReportTemplate;
  comingSoon?: boolean;
}

const documentGroups: Record<TabKey, DocumentCard[]> = {
  pedagogie: [
    { id: 'liste-eleves', title: 'Liste des élèves', description: 'Générez une liste filtrée par classe, année, sexe et statut. Export PDF, Word, Excel.', icon: Users, template: 'LISTE_ELEVES' },
    { id: 'bulletin', title: 'Bulletin scolaire', description: 'Bulletins périodiques conformes EPST RDC avec cotes et appréciations.', icon: GraduationCap, comingSoon: true },
    { id: 'certificat', title: 'Certificat de scolarité', description: 'Attestation officielle de présence dans l\'établissement.', icon: Award, comingSoon: true },
    { id: 'palmares', title: 'Palmarès annuel', description: 'Classement général des élèves par classe et par année.', icon: TrendingUp, comingSoon: true },
  ],
  finances: [
    { id: 'recu-paiement', title: 'Reçu de paiement', description: 'Reçus personnalisés pour les encaissements de frais scolaires.', icon: Receipt, comingSoon: true },
    { id: 'facture', title: 'Facture des frais', description: 'Factures détaillées par élève et par type de frais.', icon: Banknote, comingSoon: true },
    { id: 'journal-caisse', title: 'Journal de caisse', description: 'Relevé chronologique des entrées et sorties de caisse.', icon: Wallet, comingSoon: true },
    { id: 'etat-financier', title: 'État financier', description: 'Synthèse des revenus, charges et résultats de l\'année.', icon: TrendingUp, comingSoon: true },
  ],
  administration: [
    { id: 'attestation', title: 'Attestation administrative', description: 'Attestations de travail, de stage ou de bonne conduite.', icon: Building2, comingSoon: true },
    { id: 'contrat-enseignant', title: 'Contrat enseignant', description: 'Modèle de contrat et fiche de service du personnel.', icon: UserCheck, comingSoon: true },
    { id: 'planning', title: 'Emploi du temps', description: 'Planning hebdomadaire par classe et par enseignant.', icon: CalendarDays, comingSoon: true },
    { id: 'proces-verbal', title: 'Procès-verbal de délibération', description: 'Comptes rendus de conseil de classe et de délibération.', icon: BookOpen, comingSoon: true },
  ],
  'vie-scolaire': [
    { id: 'fiche-presence', title: 'Fiche de présence', description: 'Listes de présence journalières ou mensuelles.', icon: CalendarDays, comingSoon: true },
    { id: 'fiche-conduite', title: 'Fiche de conduite', description: 'Rapports d\'incidents, absences et sanctions.', icon: ShieldCheck, comingSoon: true },
    { id: 'autorisation-sortie', title: 'Autorisation de sortie', description: 'Formulaire d\'autorisation et de garde malade.', icon: FileOutput, comingSoon: true },
    { id: 'fiche-medical', title: 'Fiche médicale', description: 'Suivi des visites à l\'infirmerie et allergies.', icon: Stethoscope, comingSoon: true },
  ],
};

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'pedagogie', label: 'Pédagogique & Élèves', icon: GraduationCap },
  { key: 'finances', label: 'Finances & Caisse', icon: Wallet },
  { key: 'administration', label: 'Administration', icon: Building2 },
  { key: 'vie-scolaire', label: 'Vie scolaire', icon: HeartPulse },
];

export const DocumentEngine: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('pedagogie');
  const [modalTemplate, setModalTemplate] = useState<StudentReportTemplate | null>(null);

  return (
    <div className="space-y-5 animate-fade-in w-full pb-8 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Documents</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Générez les documents officiels, financiers, administratifs et pédagogiques de l'établissement.</p>
        </div>
      </div>

      <div className="p-2 rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-black transition-all ${
                activeTab === t.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
              style={{ color: activeTab === t.key ? '#fff' : 'var(--text-muted)' }}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {documentGroups[activeTab].map(card => (
          <div key={card.id} className="p-4 rounded-2xl border section-card" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500/15 text-indigo-500">
                <card.icon className="w-5 h-5" />
              </div>
              {card.comingSoon && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-600">Bientôt</span>
              )}
            </div>
            <h3 className="text-sm font-black mb-1" style={{ color: 'var(--text-primary)' }}>{card.title}</h3>
            <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>{card.description}</p>
            <button
              onClick={() => {
                if (card.template) setModalTemplate(card.template);
              }}
              disabled={card.comingSoon}
              className="w-full btn-primary flex items-center justify-center gap-2"
              style={{ fontSize: '12px' }}
            >
              <FileText className="w-3.5 h-3.5" /> {card.comingSoon ? 'Indisponible' : 'Générer'}
            </button>
          </div>
        ))}
      </div>

      {modalTemplate && (
        <DocumentGeneratorModal
          template={modalTemplate}
          onClose={() => setModalTemplate(null)}
        />
      )}
    </div>
  );
};
