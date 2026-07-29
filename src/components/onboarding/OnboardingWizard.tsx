import React, { useState } from 'react';
import { 
  Building2, 
  GraduationCap, 
  Wallet, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles,
  Check,
  Cpu,
  MapPin
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface OnboardingWizardProps {
  onComplete: (config: any) => void;
  onSkip?: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [schoolName, setSchoolName] = useState('Complexe Scolaire ACADEMIA / ECOLISA');
  const [province, setProvince] = useState('Kinshasa / Gombe');
  const [address, setAddress] = useState('12, Avenue de la Justice, Kinshasa');
  const [phone, setPhone] = useState('+243 81 555 0192');
  
  const [selectedCycles, setSelectedCycles] = useState<string[]>(['PRIMAIRE', 'CTEB', 'HUMANITES']);
  const [currency, setCurrency] = useState<'USD' | 'CDF'>('USD');
  const [adminName, setAdminName] = useState('Dr. Sarah Jenkins (Préfet des Études)');
  const [adminEmail, setAdminEmail] = useState('admin@ecolisa.edu');

  const steps = [
    { number: 1, title: 'Identité Établissement', icon: Building2 },
    { number: 2, title: 'Cycles EPST RDC', icon: GraduationCap },
    { number: 3, title: 'Monnaie & Finances', icon: Wallet },
    { number: 4, title: 'Admin & Licence HWID', icon: ShieldCheck },
    { number: 5, title: 'Lancement', icon: Sparkles },
  ];

  const toggleCycle = (cycleCode: string) => {
    setSelectedCycles(prev => 
      prev.includes(cycleCode) ? prev.filter(c => c !== cycleCode) : [...prev, cycleCode]
    );
  };

  const handleFinish = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    
    onComplete({
      schoolName,
      province,
      address,
      phone,
      selectedCycles,
      currency,
      adminName,
      adminEmail
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Top Gradient Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase">
              PRE-CONFIGURATION & INITIALISATION
            </span>
            <h2 className="text-xl font-black tracking-tight mt-0.5">
              Assistant de Lancement ECOLISA RDC
            </h2>
          </div>
          {onSkip && (
            <button 
              onClick={onSkip}
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Passer la configuration
            </button>
          )}
        </div>

        {/* Step Indicator Header */}
        <div className="px-8 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          {steps.map((s) => {
            const Icon = s.icon;
            const isActive = currentStep === s.number;
            const isDone = currentStep > s.number;
            return (
              <div key={s.number} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold transition-all ${
                  isDone 
                    ? 'bg-emerald-600 text-white' 
                    : isActive 
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20' 
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  {isDone ? <Check className="w-4 h-4" /> : s.number}
                </div>
                <span className={`text-xs font-bold hidden sm:inline ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* STEP CONTENT BODY */}
        <div className="p-8 min-h-[340px] flex flex-col justify-between">
          
          {/* STEP 1: IDENTITE ETABLISSEMENT */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-lg font-bold text-slate-900">
                1. Identité de l'Établissement Scolaire
              </h3>
              <p className="text-xs text-slate-500">
                Informations officielles figurant sur les bulletins RDC et pièces justificatives EPST.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                    Nom Officiel de l'École
                  </label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                      Province / Commune (RDC)
                    </label>
                    <input
                      type="text"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                      Téléphone Contact
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                    Adresse Physique
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CYCLES EPST RDC */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-lg font-bold text-slate-900">
                2. Structure des Cycles d'Enseignement
              </h3>
              <p className="text-xs text-slate-500">
                Sélectionnez les cycles officiels CITE/EPST RDC activés pour votre établissement :
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { code: 'PRESCHOOL', label: 'Maternelle & Éveil', cite: 'CITE 020' },
                  { code: 'PRIMAIRE', label: 'Éducation de Base / Primaire', cite: 'CITE 100' },
                  { code: 'CTEB', label: 'Cycle Terminal CTEB (7e/8e)', cite: 'CITE 244' },
                  { code: 'HUMANITES', label: 'Humanités Générales & Tech.', cite: 'CITE 344' },
                  { code: 'CUSTOM', label: 'Mode International Custom', cite: 'CUSTOM' },
                ].map((c) => {
                  const isSelected = selectedCycles.includes(c.code);
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => toggleCycle(c.code)}
                      className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 font-bold ring-2 ring-indigo-500/20' 
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-extrabold">{c.label}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{c.cite}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: MONNAIE ET FINANCES */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-lg font-bold text-slate-900">
                3. Monnaie Principale & Mode d'Encaissement
              </h3>
              <p className="text-xs text-slate-500">
                Définissez la devise d'affichage par défaut et la passerelle Mobile Money.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
                    Devise de Comptabilité Principale :
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrency('USD')}
                      className={`p-4 rounded-2xl border text-center transition-all ${
                        currency === 'USD' 
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-extrabold ring-2 ring-emerald-500/20' 
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-base">Dollar Américain (USD $)</div>
                      <div className="text-[10px] text-slate-500 mt-1">Standard Minerval RDC</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrency('CDF')}
                      className={`p-4 rounded-2xl border text-center transition-all ${
                        currency === 'CDF' 
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-extrabold ring-2 ring-emerald-500/20' 
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-base">Franc Congolais (CDF FC)</div>
                      <div className="text-[10px] text-slate-500 mt-1">Devise Nationale RDC</div>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Intégration FlexPay RDC Active
                  </div>
                  <p className="text-slate-500">
                    Les encaissements via M-Pesa, Orange Money et Airtel Money sont pré-configurés.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: ADMIN & LICENCE HWID */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-lg font-bold text-slate-900">
                4. Compte Administrateur & Licence Matérielle (HWID)
              </h3>
              <p className="text-xs text-slate-500">
                Vérification de l'empreinte PC et création du compte Préfet/Promoteur.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                    Nom du Chef d'Établissement / Promoteur
                  </label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                    Email de Récupération
                  </label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>

                {/* HWID Badge */}
                <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-indigo-900">
                    <Cpu className="w-4 h-4 text-indigo-600" />
                    HWID Machine Footprint Détecté :
                  </div>
                  <div className="font-mono text-xs text-indigo-700 font-bold truncate">
                    HWID-ED25519-RDC-99201-NODE-MAC
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: FINAL LAUNCH */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                <Sparkles className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Prêt à Lancer ECOLISA !
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Votre établissement <strong>{schoolName}</strong> ({province}) est entièrement configuré avec l'architecture Offline-First.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs space-y-2 font-semibold text-slate-700 max-w-md mx-auto">
                <div className="flex justify-between">
                  <span className="text-slate-400">Cycles Activés :</span>
                  <span>{selectedCycles.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Devise Principale :</span>
                  <span>{currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Administrateur :</span>
                  <span>{adminName}</span>
                </div>
              </div>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Précédent
              </button>
            ) : <div />}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-md text-xs transition-all flex items-center gap-1.5 ml-auto"
              >
                Suivant <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-600/20 text-xs transition-all flex items-center gap-2 ml-auto"
              >
                <CheckCircle2 className="w-4 h-4" /> Enregistrer & Lancer le Tableau de Bord
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
