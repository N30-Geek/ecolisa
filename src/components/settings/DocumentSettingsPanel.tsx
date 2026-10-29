import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Check, RefreshCw, Save, Palette, Type, Ruler, LayoutTemplate, Image, PenTool, Hash } from 'lucide-react';
import { LocalDatabaseService } from '../../services/localDatabase';
import { DOCUMENT_FONTS, DOCUMENT_PRESETS, DOCUMENT_TEMPLATES_KEY, DEFAULT_DOCUMENT_TEMPLATE, resolveDocumentTemplate, resolveDocumentTemplatesConfig, type DocumentTemplate } from '../../utils/documentTemplates';

const SAMPLE_STUDENTS = [
  { id: '1', n: 1, registrationNumber: '2026-ED-001', prenom: 'Jeanne', nom: 'MUKENDI', postnom: 'KABONGO', nomClasse: '3ème Math-Physique', sexe: 'F', dateNaissance: '2008-04-12', statut: 'ACTIF' },
  { id: '2', n: 2, registrationNumber: '2026-ED-002', prenom: 'Pascal', nom: 'TSHIBANGU', postnom: 'LOMATA', nomClasse: '3ème Math-Physique', sexe: 'M', dateNaissance: '2007-09-23', statut: 'ACTIF' },
  { id: '3', n: 3, registrationNumber: '2026-ED-003', prenom: 'Grâce', nom: 'ILUNGA', postnom: 'MUTOMBO', nomClasse: '3ème Math-Physique', sexe: 'F', dateNaissance: '2008-01-05', statut: 'ACTIF' },
];

export const DocumentSettingsPanel: React.FC = () => {
  const [template, setTemplate] = useState<DocumentTemplate>({ ...DEFAULT_DOCUMENT_TEMPLATE });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const stored = await LocalDatabaseService.getConfig(DOCUMENT_TEMPLATES_KEY);
      setTemplate(resolveDocumentTemplatesConfig(stored).active);
      setDirty(false);
    } catch {
      setNotice({ error: true, text: 'Impossible de charger les modèles. Réessayez avant de modifier les réglages.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!notice || notice.error) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const update = (change: Partial<DocumentTemplate>) => {
    setTemplate(current => ({ ...current, ...change }));
    setDirty(true);
    setNotice(null);
  };

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const value = { version: 1 as const, active: resolveDocumentTemplate(template) };
      await LocalDatabaseService.setConfig(DOCUMENT_TEMPLATES_KEY, value, true);
      const stored = await LocalDatabaseService.getConfig(DOCUMENT_TEMPLATES_KEY);
      if (!stored || JSON.stringify(resolveDocumentTemplatesConfig(stored)) !== JSON.stringify(value)) throw new Error('Persistence verification failed');
      setTemplate(value.active);
      setDirty(false);
      setNotice({ error: false, text: 'Modèle enregistré et appliqué au générateur de documents.' });
      window.dispatchEvent(new Event('ecolisa:config:change'));
    } catch {
      setNotice({ error: true, text: 'Enregistrement impossible. Vos modifications sont conservées à l’écran ; réessayez.' });
    } finally {
      setSaving(false);
    }
  };

  const previewStyle: React.CSSProperties = {
    fontFamily: DOCUMENT_FONTS[template.font].pdf || 'Helvetica',
    color: '#0f172a',
    padding: `${template.margin}mm`,
    minHeight: '297mm',
    width: template.orientation === 'landscape' ? '297mm' : '210mm',
    background: '#fff',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    borderRadius: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  };

  const accent = template.accent;
  const headerLines = [
    'RÉPUBLIQUE DÉMOCRATIQUE DU CONGO',
    'MINISTÈRE DE L\'ENSEIGNEMENT PRIMAIRE, SECONDAIRE ET TECHNIQUE',
    'COMPLEXE SCOLAIRE ACADEMIA',
    '12, Avenue de la Justice, Gombe · +243 81 555 0192',
    template.headerText,
  ].filter(Boolean);
  const footerLines = [
    template.footerText,
    template.showSignature ? 'Fait à Kinshasa, le ' + new Date().toLocaleDateString('fr-FR') : '',
    template.showSignature ? 'Dr. Jean-Baptiste KABANGE — Promoteur' : '',
    template.showSignature ? 'Signature et cachet à apposer par une personne habilitée.' : '',
  ].filter(Boolean);

  const Preview = useMemo(() => (
    <div className="rounded-2xl p-4" style={{ background: 'var(--md-sys-color-surface-container)', overflow: 'auto' }}>
      <div className="flex justify-center" style={{ minWidth: 'fit-content' }}>
        <div style={previewStyle}>
          <div className="text-center space-y-1" style={{ fontSize: 10, lineHeight: 1.3 }}>
            {template.showLogo && <div className="w-12 h-12 mx-auto rounded-full mb-2" style={{ background: accent, opacity: 0.15 }} />}
            {headerLines.map((line, i) => <p key={i} style={{ fontWeight: i === 2 ? 900 : i === 4 ? 700 : 400, color: i === 4 ? accent : '#0f172a' }}>{line}</p>)}
          </div>

          <div className="text-center" style={{ borderBottom: `1px solid ${accent}`, paddingBottom: 6 }}>
            <h3 style={{ fontSize: 16, fontWeight: 900, color: accent }}>LISTE DES ÉLÈVES</h3>
            <p style={{ fontSize: 9 }}>Année : 2025–2026 | Classe : 3ème Math-Physique | Total : 3 élève(s)</p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9, marginTop: 8 }}>
            <thead>
              <tr style={{ background: accent, color: '#fff' }}>
                {['N°', 'MATRICULE', 'PRÉNOM', 'NOM', 'POST-NOM', 'CLASSE', 'SEXE', 'NÉ(E) LE', 'STATUT'].map((h) => (
                  <th key={h} style={{ border: template.tableStyle === 'grid' ? `1px solid ${accent}` : 'none', padding: 4, fontWeight: 700, textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SAMPLE_STUDENTS.map((s, i) => (
                <tr key={s.id} style={{ background: template.tableStyle === 'striped' && i % 2 === 0 ? '#f1f5f9' : 'transparent' }}>
                  {[
                    s.n, s.registrationNumber, s.prenom, s.nom, s.postnom, s.nomClasse, s.sexe,
                    new Date(s.dateNaissance).toLocaleDateString('fr-FR'), s.statut,
                  ].map((cell, j) => (
                    <td key={j} style={{ border: template.tableStyle === 'grid' ? '1px solid #cbd5e1' : 'none', borderTop: template.tableStyle !== 'plain' ? '1px solid #cbd5e1' : 'none', padding: 4 }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-auto text-right space-y-1" style={{ fontSize: 9 }}>
            {footerLines.map((line, i) => <p key={i} style={{ color: i === footerLines.length - 1 ? '#64748b' : '#0f172a', fontWeight: i === 1 ? 700 : 400 }}>{line}</p>)}
            {template.showPagination && <p className="text-right" style={{ color: '#64748b' }}>Page 1 / 1</p>}
          </div>
        </div>
      </div>
    </div>
  ), [template]);

  return (
    <section className="space-y-5" aria-labelledby="document-settings-title">
      <div className="space-y-1">
        <h2 id="document-settings-title" className="text-2xl font-black flex items-center gap-3" style={{ color: 'var(--md-sys-color-on-surface)' }}>
          <span className="p-2 rounded-xl" style={{ background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' }}>
            <FileText className="w-5 h-5" />
          </span>
          Modèles de documents
        </h2>
        <p className="text-sm" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
          Personnalisez les listes d’élèves et certificats de scolarité. L’aperçu se met à jour en temps réel. Les exports Excel restent des données brutes.
        </p>
      </div>

      {notice && (
        <div role={notice.error ? 'alert' : 'status'} className="md3-card p-3 text-sm" style={{ background: notice.error ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', borderColor: notice.error ? 'var(--md-sys-color-error)' : 'rgba(16,185,129,0.3)', color: notice.error ? 'var(--md-sys-color-error)' : '#047857' }}>
          <div className="flex justify-between gap-4 items-center"><span>{notice.text}</span><button type="button" onClick={() => setNotice(null)} aria-label="Fermer la notification" className="md3-outlined-btn text-[10px] py-1 px-2">Fermer</button></div>
        </div>
      )}

      {loading ? <p role="status" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Chargement des modèles…</p> : (
        <>
          <div className="md3-card p-5 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--md-sys-color-on-surface)' }}>
              <LayoutTemplate className="w-4 h-4" /> Bases prêtes à l’emploi
            </h3>
            <div className="grid gap-3 md:grid-cols-3">
              {DOCUMENT_PRESETS.map(preset => {
                const active = template.accent === preset.template.accent && template.tableStyle === preset.template.tableStyle;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => update(preset.template)}
                    className={`text-left p-4 rounded-2xl border transition-all hover:shadow-md ${active ? 'border-transparent' : ''}`}
                    style={{
                      background: active ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-container-low)',
                      borderColor: active ? 'transparent' : 'var(--md-sys-color-outline)',
                      color: active ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full" style={{ background: preset.template.accent }} />
                      <span className="font-semibold text-sm">{preset.name}</span>
                      {active && <Check className="w-4 h-4 ml-auto" />}
                    </div>
                    <p className="text-xs" style={{ color: active ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface-variant)' }}>{preset.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="md3-card p-5 space-y-5">
              <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                <Palette className="w-4 h-4" /> Contenu et mise en page
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm space-y-1.5" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                  <span className="flex items-center gap-2"><Type className="w-3.5 h-3.5" /> Texte d’en-tête</span>
                  <input className="md3-input" maxLength={160} value={template.headerText} onChange={e => update({ headerText: e.target.value })} />
                </label>
                <label className="block text-sm space-y-1.5" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                  <span className="flex items-center gap-2"><Type className="w-3.5 h-3.5" /> Texte de pied de page</span>
                  <input className="md3-input" maxLength={120} value={template.footerText} onChange={e => update({ footerText: e.target.value })} />
                </label>

                <label className="block text-sm space-y-1.5" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                  <span className="flex items-center gap-2"><Palette className="w-3.5 h-3.5" /> Couleur d’accent</span>
                  <div className="flex items-center gap-3">
                    <input type="color" className="w-12 h-12 rounded-xl border-0 p-0 cursor-pointer" value={template.accent} onChange={e => update({ accent: e.target.value })} />
                    <span className="font-mono text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>{template.accent}</span>
                  </div>
                </label>

                <label className="block text-sm space-y-1.5" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                  <span className="flex items-center gap-2"><PenTool className="w-3.5 h-3.5" /> Police</span>
                  <select className="md3-input" value={template.font} onChange={e => update({ font: e.target.value as DocumentTemplate['font'] })}>
                    {Object.entries(DOCUMENT_FONTS).map(([key, font]) => <option key={key} value={key}>{font.label}</option>)}
                  </select>
                </label>

                <label className="block text-sm space-y-1.5" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                  <span className="flex items-center gap-2"><Ruler className="w-3.5 h-3.5" /> Marges extérieures : {template.margin} mm</span>
                  <input className="md3-input" type="range" min={10} max={25} step={1} value={template.margin} onChange={e => update({ margin: Number(e.target.value) })} />
                  <span className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Un espace réservé est ajouté pour l’en-tête et le pied de page.</span>
                </label>

                <label className="block text-sm space-y-1.5" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                  <span className="flex items-center gap-2"><LayoutTemplate className="w-3.5 h-3.5" /> Orientation</span>
                  <select className="md3-input" value={template.orientation} onChange={e => update({ orientation: e.target.value as DocumentTemplate['orientation'] })}>
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Paysage</option>
                  </select>
                </label>

                <label className="block text-sm space-y-1.5" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                  <span className="flex items-center gap-2"><LayoutTemplate className="w-3.5 h-3.5" /> Style des tableaux</span>
                  <select className="md3-input" value={template.tableStyle} onChange={e => update({ tableStyle: e.target.value as DocumentTemplate['tableStyle'] })}>
                    <option value="grid">Quadrillé</option>
                    <option value="striped">Lignes alternées</option>
                    <option value="plain">Sans quadrillage</option>
                  </select>
                </label>
              </div>

              <div className="space-y-3 pt-2" style={{ borderTop: '1px solid var(--md-sys-color-outline-variant)' }}>
                <label className="md3-list-item cursor-pointer">
                  <input type="checkbox" checked={template.showLogo} onChange={e => update({ showLogo: e.target.checked })} className="md3-switch shrink-0" />
                  <Image className="w-4 h-4" style={{ color: 'var(--md-sys-color-on-surface-variant)' }} />
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Afficher le logo</div>
                    <div className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Logo de l’établissement en en-tête si configuré.</div>
                  </div>
                </label>
                <label className="md3-list-item cursor-pointer">
                  <input type="checkbox" checked={template.showSignature} onChange={e => update({ showSignature: e.target.checked })} className="md3-switch shrink-0" />
                  <PenTool className="w-4 h-4" style={{ color: 'var(--md-sys-color-on-surface-variant)' }} />
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Bloc à signer</div>
                    <div className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Nom, fonction et espace signature.</div>
                  </div>
                </label>
                <label className="md3-list-item cursor-pointer">
                  <input type="checkbox" checked={template.showPagination} onChange={e => update({ showPagination: e.target.checked })} className="md3-switch shrink-0" />
                  <Hash className="w-4 h-4" style={{ color: 'var(--md-sys-color-on-surface-variant)' }} />
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Numéros de page</div>
                    <div className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Pagination en bas de page.</div>
                  </div>
                </label>
              </div>

              <div className="flex flex-wrap gap-3 items-center pt-3" style={{ borderTop: '1px solid var(--md-sys-color-outline-variant)' }}>
                <button type="button" className="md3-filled-btn" disabled={saving || !dirty} onClick={() => void save()}>
                  <Save className="w-4 h-4" />
                  {saving ? 'Enregistrement…' : 'Enregistrer le modèle'}
                </button>
                <button type="button" disabled={saving} className="md3-outlined-btn" onClick={() => void load()}>
                  <RefreshCw className="w-4 h-4" /> Recharger
                </button>
                {dirty && <span className="text-sm" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Modifications non enregistrées</span>}
              </div>
            </div>

            <div className="md3-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Aperçu en temps réel</h3>
                <span className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>{template.orientation === 'landscape' ? 'A4 Paysage' : 'A4 Portrait'}</span>
              </div>
              {Preview}
            </div>
          </div>
        </>
      )}
    </section>
  );
};
