import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image, Plus, Trash2, Save, ChevronDown, ChevronUp, Upload, Loader2, Check } from 'lucide-react';
import api from '../../lib/api';
import type { LandingConfig, HeroSlide, StatItem, HowItWorksStep, ActorCard, PricingPlan } from '../../context/LandingConfigContext';

type Section = 'hero' | 'stats' | 'how_it_works' | 'actors' | 'pricing' | 'cta';

const SECTIONS: { key: Section; label: string; desc: string }[] = [
  { key: 'hero', label: 'Hero / Slider', desc: 'Slides principal en haut de page' },
  { key: 'stats', label: 'Chiffres clés', desc: 'Bande de statistiques' },
  { key: 'how_it_works', label: 'Comment ça marche', desc: 'Étapes du processus' },
  { key: 'actors', label: 'Acteurs', desc: 'Employeur, Salarié, Commerçant' },
  { key: 'pricing', label: 'Tarifs', desc: 'Plans et prix' },
  { key: 'cta', label: 'Appel à l\'action', desc: 'Section finale de conversion' },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, textarea }: {
  value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean;
}) {
  const cls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 resize-none";
  if (textarea) return <textarea className={cls} rows={3} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />;
  return <input className={cls} type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />;
}

function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-slate-200" />
      <input className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/30" value={value} onChange={e => onChange(e.target.value)} placeholder={label} />
    </div>
  );
}

function SaveButton({ onClick, saving, saved }: { onClick: () => void; saving: boolean; saved: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-60 transition-all shadow-sm"
    >
      {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
      {saving ? 'Sauvegarde...' : saved ? 'Sauvegardé' : 'Sauvegarder'}
    </button>
  );
}

function ImageUpload({ value, onChange, label }: { value: string; onChange: (url: string) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post('/landing/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onChange(res.data.url);
    } catch {
      alert('Erreur lors de l\'upload de l\'image');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt="" className="w-20 h-14 rounded-lg object-cover border border-slate-200" />
        ) : (
          <div className="w-20 h-14 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50">
            <Image size={16} className="text-slate-300" />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => ref.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            {uploading ? 'Upload...' : 'Choisir une image'}
          </button>
          <input
            className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-400"
            placeholder="ou coller une URL"
            value={value}
            onChange={e => onChange(e.target.value)}
          />
        </div>
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
    </div>
  );
}

// ─── Section Editors ────────────────────────────────────────────────────────

function HeroEditor({ data, onChange }: { data: { slides: HeroSlide[] }; onChange: (d: any) => void }) {
  const slides = data.slides ?? [];

  function updateSlide(i: number, patch: Partial<HeroSlide>) {
    const updated = slides.map((s, idx) => idx === i ? { ...s, ...patch } : s);
    onChange({ ...data, slides: updated });
  }

  function addSlide() {
    onChange({ ...data, slides: [...slides, { bg: '#0D1F35', panelBg: 'rgba(6,14,24,0.82)', textColor: '#FFFFFF', accent: '#0EA5E9', badge: 'Nouveau', title: 'Titre du slide', subtitle: 'Sous-titre', ctaPrimary: 'Commencer', ctaSecondary: 'En savoir plus', img: '' }] });
  }

  function removeSlide(i: number) {
    onChange({ ...data, slides: slides.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="flex flex-col gap-6">
      {slides.map((s, i) => (
        <div key={i} className="border border-slate-100 rounded-xl p-5 bg-slate-50 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Slide {i + 1}</span>
            {slides.length > 1 && (
              <button onClick={() => removeSlide(i)} className="text-red-400 hover:text-red-600 transition">
                <Trash2 size={13} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Badge"><Input value={s.badge} onChange={v => updateSlide(i, { badge: v })} placeholder="Nouveauté 2025" /></Field>
            <Field label="Couleur accent">
              <ColorInput value={s.accent} onChange={v => updateSlide(i, { accent: v })} label="#0EA5E9" />
            </Field>
            <Field label="Titre (\\n pour saut de ligne)">
              <Input value={s.title} onChange={v => updateSlide(i, { title: v })} placeholder="Titre principal" textarea />
            </Field>
            <Field label="Sous-titre">
              <Input value={s.subtitle} onChange={v => updateSlide(i, { subtitle: v })} placeholder="Description courte" textarea />
            </Field>
            <Field label="Bouton principal"><Input value={s.ctaPrimary} onChange={v => updateSlide(i, { ctaPrimary: v })} /></Field>
            <Field label="Bouton secondaire"><Input value={s.ctaSecondary} onChange={v => updateSlide(i, { ctaSecondary: v })} /></Field>
            <Field label="Couleur fond slide">
              <ColorInput value={s.bg} onChange={v => updateSlide(i, { bg: v })} label="#0D1F35" />
            </Field>
            <Field label="Couleur texte">
              <ColorInput value={s.textColor} onChange={v => updateSlide(i, { textColor: v })} label="#FFFFFF" />
            </Field>
          </div>
          <ImageUpload value={s.img ?? ''} onChange={url => updateSlide(i, { img: url })} label="Image de fond (optionnel)" />
        </div>
      ))}
      <button onClick={addSlide} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-500 hover:border-sky-400 hover:text-sky-500 transition">
        <Plus size={14} /> Ajouter un slide
      </button>
    </div>
  );
}

function StatsEditor({ data, onChange }: { data: { items: StatItem[] }; onChange: (d: any) => void }) {
  const items = data.items ?? [];

  function update(i: number, patch: Partial<StatItem>) {
    onChange({ ...data, items: items.map((s, idx) => idx === i ? { ...s, ...patch } : s) });
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((s, i) => (
        <div key={i} className="grid grid-cols-2 gap-3 border border-slate-100 rounded-xl p-4 bg-slate-50">
          <Field label="Valeur"><Input value={s.val} onChange={v => update(i, { val: v })} placeholder="3 200+" /></Field>
          <Field label="Label"><Input value={s.label} onChange={v => update(i, { label: v })} placeholder="Salariés actifs" /></Field>
        </div>
      ))}
      <button onClick={() => onChange({ ...data, items: [...items, { val: '', label: '' }] })} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-500 hover:border-sky-400 hover:text-sky-500 transition">
        <Plus size={14} /> Ajouter une stat
      </button>
    </div>
  );
}

function HowItWorksEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const steps: HowItWorksStep[] = data.steps ?? [];

  function updateStep(i: number, patch: Partial<HowItWorksStep>) {
    onChange({ ...data, steps: steps.map((s, idx) => idx === i ? { ...s, ...patch } : s) });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4">
        <Field label="Titre principal"><Input value={data.title} onChange={v => onChange({ ...data, title: v })} /></Field>
        <Field label="Sous-titre"><Input value={data.subtitle} onChange={v => onChange({ ...data, subtitle: v })} textarea /></Field>
      </div>
      <div className="h-px bg-slate-100 my-1" />
      {steps.map((s, i) => (
        <div key={i} className="border border-slate-100 rounded-xl p-4 bg-slate-50 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-slate-400">{s.num}</span>
            <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer ml-auto">
              <input type="checkbox" checked={!!s.highlight} onChange={e => updateStep(i, { highlight: e.target.checked })} className="rounded" />
              Mise en valeur
            </label>
          </div>
          <Field label="Titre étape"><Input value={s.title} onChange={v => updateStep(i, { title: v })} /></Field>
          <Field label="Description"><Input value={s.desc} onChange={v => updateStep(i, { desc: v })} textarea /></Field>
        </div>
      ))}
    </div>
  );
}

function ActorsEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const cards: ActorCard[] = data.cards ?? [];

  function updateCard(i: number, patch: Partial<ActorCard>) {
    onChange({ ...data, cards: cards.map((c, idx) => idx === i ? { ...c, ...patch } : c) });
  }

  function updateFeature(ci: number, fi: number, v: string) {
    const updated = cards.map((c, idx) => {
      if (idx !== ci) return c;
      const features = c.features.map((f, fIdx) => fIdx === fi ? v : f);
      return { ...c, features };
    });
    onChange({ ...data, cards: updated });
  }

  function addFeature(ci: number) {
    const updated = cards.map((c, idx) => idx !== ci ? c : { ...c, features: [...c.features, ''] });
    onChange({ ...data, cards: updated });
  }

  function removeFeature(ci: number, fi: number) {
    const updated = cards.map((c, idx) => idx !== ci ? c : { ...c, features: c.features.filter((_, fIdx) => fIdx !== fi) });
    onChange({ ...data, cards: updated });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4">
        <Field label="Titre section"><Input value={data.title} onChange={v => onChange({ ...data, title: v })} /></Field>
        <Field label="Sous-titre"><Input value={data.subtitle} onChange={v => onChange({ ...data, subtitle: v })} textarea /></Field>
      </div>
      <div className="h-px bg-slate-100 my-1" />
      {cards.map((c, ci) => (
        <div key={ci} className="border border-slate-100 rounded-xl p-5 bg-slate-50 flex flex-col gap-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{c.name || `Carte ${ci + 1}`}</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Nom acteur"><Input value={c.name} onChange={v => updateCard(ci, { name: v })} /></Field>
            <Field label="Rôle / plateforme"><Input value={c.role} onChange={v => updateCard(ci, { role: v })} /></Field>
            <Field label="Badge tag"><Input value={c.tag} onChange={v => updateCard(ci, { tag: v })} /></Field>
            <Field label="Lien connexion"><Input value={c.loginHref} onChange={v => updateCard(ci, { loginHref: v })} /></Field>
            <Field label="Libellé bouton"><Input value={c.loginLabel} onChange={v => updateCard(ci, { loginLabel: v })} /></Field>
            <Field label="Alt image"><Input value={c.imgAlt} onChange={v => updateCard(ci, { imgAlt: v })} /></Field>
            <Field label="Couleur accent début">
              <ColorInput value={c.accentFrom} onChange={v => updateCard(ci, { accentFrom: v })} label="#1A3C5E" />
            </Field>
            <Field label="Couleur accent fin">
              <ColorInput value={c.accentTo} onChange={v => updateCard(ci, { accentTo: v })} label="#0EA5E9" />
            </Field>
          </div>
          <ImageUpload value={c.img} onChange={url => updateCard(ci, { img: url })} label="Image de la carte" />
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Fonctionnalités</label>
            <div className="mt-2 flex flex-col gap-2">
              {c.features.map((f, fi) => (
                <div key={fi} className="flex items-center gap-2">
                  <Input value={f} onChange={v => updateFeature(ci, fi, v)} placeholder="Fonctionnalité..." />
                  <button onClick={() => removeFeature(ci, fi)} className="text-red-400 hover:text-red-600 flex-shrink-0"><Trash2 size={13} /></button>
                </div>
              ))}
              <button onClick={() => addFeature(ci)} className="flex items-center gap-1.5 text-xs text-sky-500 hover:text-sky-600 mt-1">
                <Plus size={12} /> Ajouter
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PricingEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const plans: PricingPlan[] = data.plans ?? [];

  function updatePlan(i: number, patch: Partial<PricingPlan>) {
    onChange({ ...data, plans: plans.map((p, idx) => idx === i ? { ...p, ...patch } : p) });
  }

  function updateFeature(pi: number, fi: number, v: string) {
    const updated = plans.map((p, idx) => {
      if (idx !== pi) return p;
      return { ...p, features: p.features.map((f, fIdx) => fIdx === fi ? v : f) };
    });
    onChange({ ...data, plans: updated });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4">
        <Field label="Titre section"><Input value={data.title} onChange={v => onChange({ ...data, title: v })} /></Field>
        <Field label="Sous-titre"><Input value={data.subtitle} onChange={v => onChange({ ...data, subtitle: v })} textarea /></Field>
      </div>
      <div className="h-px bg-slate-100 my-1" />
      {plans.map((p, pi) => (
        <div key={pi} className="border border-slate-100 rounded-xl p-5 bg-slate-50 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{p.name || `Plan ${pi + 1}`}</span>
            <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer ml-auto">
              <input type="checkbox" checked={!!p.featured} onChange={e => updatePlan(pi, { featured: e.target.checked })} className="rounded" />
              Mis en avant
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom plan"><Input value={p.name} onChange={v => updatePlan(pi, { name: v })} /></Field>
            <Field label="Prix"><Input value={p.price} onChange={v => updatePlan(pi, { price: v })} /></Field>
            <Field label="Période / info"><Input value={p.period} onChange={v => updatePlan(pi, { period: v })} /></Field>
            <Field label="Badge (optionnel)"><Input value={p.badge ?? ''} onChange={v => updatePlan(pi, { badge: v })} /></Field>
            <Field label="Libellé CTA (optionnel)"><Input value={p.ctaLabel ?? ''} onChange={v => updatePlan(pi, { ctaLabel: v })} /></Field>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Fonctionnalités</label>
            <div className="mt-2 flex flex-col gap-2">
              {p.features.map((f, fi) => (
                <div key={fi} className="flex items-center gap-2">
                  <Input value={f} onChange={v => updateFeature(pi, fi, v)} placeholder="Fonctionnalité..." />
                  <button onClick={() => updatePlan(pi, { features: p.features.filter((_, fIdx) => fIdx !== fi) })} className="text-red-400 hover:text-red-600 flex-shrink-0"><Trash2 size={13} /></button>
                </div>
              ))}
              <button onClick={() => updatePlan(pi, { features: [...p.features, ''] })} className="flex items-center gap-1.5 text-xs text-sky-500 hover:text-sky-600 mt-1">
                <Plus size={12} /> Ajouter
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CTAEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Titre (\\n pour saut de ligne)"><Input value={data.title} onChange={v => onChange({ ...data, title: v })} textarea /></Field>
      <Field label="Sous-titre"><Input value={data.subtitle} onChange={v => onChange({ ...data, subtitle: v })} textarea /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Bouton principal"><Input value={data.ctaPrimary} onChange={v => onChange({ ...data, ctaPrimary: v })} /></Field>
        <Field label="Bouton secondaire"><Input value={data.ctaSecondary} onChange={v => onChange({ ...data, ctaSecondary: v })} /></Field>
      </div>
    </div>
  );
}

// ─── Main CRM Component ─────────────────────────────────────────────────────

export default function LandingCRM() {
  const qc = useQueryClient();
  const [active, setActive] = useState<Section>('hero');
  const [drafts, setDrafts] = useState<Partial<LandingConfig>>({});
  const [savedSections, setSavedSections] = useState<Set<Section>>(new Set());

  const { data: config, isLoading } = useQuery<LandingConfig>({
    queryKey: ['landing-config'],
    queryFn: async () => {
      const res = await api.get('/landing/config');
      return res.data.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ section, data }: { section: Section; data: any }) => {
      await api.put(`/landing/config/${section}`, data);
    },
    onSuccess: (_, { section }) => {
      qc.invalidateQueries({ queryKey: ['landing-config'] });
      setSavedSections(prev => new Set([...prev, section]));
      setTimeout(() => setSavedSections(prev => { const s = new Set(prev); s.delete(section); return s; }), 2000);
    },
  });

  function getDraft(section: Section) {
    return drafts[section] ?? config?.[section];
  }

  function setDraft(section: Section, data: any) {
    setSavedSections(prev => { const s = new Set(prev); s.delete(section); return s; });
    setDrafts(prev => ({ ...prev, [section]: data }));
  }

  function save(section: Section) {
    const data = getDraft(section);
    if (data) saveMutation.mutate({ section, data });
  }

  const activeSection = SECTIONS.find(s => s.key === active)!;
  const draft = getDraft(active);
  const isSaving = saveMutation.isPending && saveMutation.variables?.section === active;
  const isSaved = savedSections.has(active);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 border-r border-slate-100 bg-white pt-2 flex flex-col gap-0.5 p-2">
        <div className="px-3 py-2 mb-1">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sections</div>
        </div>
        {SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setActive(s.key)}
            className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
              active === s.key
                ? 'bg-sky-50 text-sky-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="text-sm font-medium">{s.label}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{s.desc}</div>
          </button>
        ))}
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-auto bg-slate-50">
        <div className="max-w-3xl mx-auto p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-base font-bold text-slate-800">{activeSection.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{activeSection.desc}</div>
            </div>
            <SaveButton onClick={() => save(active)} saving={isSaving} saved={isSaved} />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-slate-300" />
            </div>
          ) : draft ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              {active === 'hero' && <HeroEditor data={draft as any} onChange={d => setDraft('hero', d)} />}
              {active === 'stats' && <StatsEditor data={draft as any} onChange={d => setDraft('stats', d)} />}
              {active === 'how_it_works' && <HowItWorksEditor data={draft as any} onChange={d => setDraft('how_it_works', d)} />}
              {active === 'actors' && <ActorsEditor data={draft as any} onChange={d => setDraft('actors', d)} />}
              {active === 'pricing' && <PricingEditor data={draft as any} onChange={d => setDraft('pricing', d)} />}
              {active === 'cta' && <CTAEditor data={draft as any} onChange={d => setDraft('cta', d)} />}
            </div>
          ) : null}

          <div className="mt-4 flex justify-end">
            <SaveButton onClick={() => save(active)} saving={isSaving} saved={isSaved} />
          </div>
        </div>
      </div>
    </div>
  );
}
