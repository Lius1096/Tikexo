import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  Search, MapPin, Navigation, Star, Clock, X, ChefHat,
  Utensils, Croissant, ShoppingBasket, Bike, Coffee, Store, Wheat,
  LucideIcon,
} from 'lucide-react';
import api from '../../lib/api';

const TYPE_LABELS: Record<string, string> = {
  RESTAURANT:  'Restaurant',
  BOULANGERIE: 'Boulangerie',
  EPICERIE:    'Épicerie',
  TRAITEUR:    'Traiteur',
  CAFETERIA:   'Cafétéria',
  LIVRAISON:   'Livraison',
  SUPERMARCHE: 'Supermarché',
};

const TYPE_ICON: Record<string, LucideIcon> = {
  RESTAURANT:  Utensils,
  BOULANGERIE: Croissant,
  EPICERIE:    ShoppingBasket,
  TRAITEUR:    ChefHat,
  CAFETERIA:   Coffee,
  LIVRAISON:   Bike,
  SUPERMARCHE: Store,
};

const TYPE_COLOR: Record<string, [string, string]> = {
  RESTAURANT:  ['#FEF3C7', '#92400E'],
  BOULANGERIE: ['#FAEEDA', '#854F0B'],
  EPICERIE:    ['#DCFCE7', '#166534'],
  TRAITEUR:    ['#DBEAFE', '#185FA5'],
  CAFETERIA:   ['#FDF4FF', '#7E22CE'],
  LIVRAISON:   ['#F0FDF4', '#15803D'],
  SUPERMARCHE: ['#F1F5F9', '#334155'],
};

interface Commercant {
  id: string;
  nom: string;
  type: string;
  niveau: string;
  adresse: string;
  ville: string;
  statut: string;
  note_moyenne: number;
  photo_url?: string;
  latitude?: number;
  longitude?: number;
  distance_metres?: number;
  distance_label?: string;
  duree_a_pied?: string;
  est_ouvert?: boolean;
}

export default function BeneficiaireCommercants() {
  const [search, setSearch]           = useState('');
  const [typeFiltre, setTypeFiltre]   = useState('');
  const [selected, setSelected]       = useState<Commercant | null>(null);
  const [geoError, setGeoError]       = useState('');
  const [nearbyMode, setNearbyMode]   = useState(false);
  const [coords, setCoords]           = useState<{ lat: number; lng: number } | null>(null);

  /* ── Liste complète (mode défaut) ── */
  const { data: listeData, isLoading: loadListe } = useQuery({
    queryKey: ['commercants-liste', typeFiltre],
    queryFn: () =>
      api.get(`/commercants?statut=ACTIF${typeFiltre ? `&type=${typeFiltre}` : ''}&limit=50`)
        .then((r) => r.data.data.items),
    enabled: !nearbyMode,
    staleTime: 60_000,
  });

  /* ── Mode proximité ── */
  const { data: nearbyData, isLoading: loadNearby } = useQuery({
    queryKey: ['commercants-nearby', coords, typeFiltre],
    queryFn: () =>
      api.get(`/commercants/nearby?lat=${coords!.lat}&lng=${coords!.lng}&rayon=5000${typeFiltre ? `&categorie=${typeFiltre}` : ''}`)
        .then((r) => r.data.data),
    enabled: nearbyMode && !!coords,
    staleTime: 60_000,
  });

  const items: Commercant[] = nearbyMode
    ? (nearbyData?.data ?? [])
    : (listeData ?? []);

  const filtered = items.filter((c) =>
    !search || c.nom.toLowerCase().includes(search.toLowerCase()) || c.adresse?.toLowerCase().includes(search.toLowerCase())
  );

  const isLoading = nearbyMode ? loadNearby : loadListe;

  function activerProximite() {
    setGeoError('');
    if (!navigator.geolocation) {
      setGeoError('Géolocalisation non disponible sur cet appareil.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearbyMode(true);
      },
      () => setGeoError('Accès à la position refusé. Activez la géolocalisation.'),
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div>
        <div className="text-[15px] font-medium text-slate-900">Points de vente</div>
        <div className="text-xs text-slate-500">Restaurants et enseignes acceptant TIKEXO</div>
      </div>

      {/* Barre de recherche + bouton près de moi */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un restaurant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-tikexo-accent"
          />
        </div>
        <button
          onClick={nearbyMode ? () => { setNearbyMode(false); setCoords(null); } : activerProximite}
          className={clsx(
            'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] border transition-colors flex-shrink-0',
            nearbyMode
              ? 'bg-tikexo-accent text-white border-tikexo-accent'
              : 'bg-white text-slate-600 border-slate-200 hover:border-tikexo-accent'
          )}
        >
          <Navigation size={14} />
          {nearbyMode ? 'Près de moi ✓' : 'Près de moi'}
        </button>
      </div>

      {geoError && (
        <div className="text-[12px] text-[#A32D2D] bg-[#FCEBEB] px-3 py-2 rounded-lg">{geoError}</div>
      )}

      {/* Filtres par type */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setTypeFiltre('')}
          className={clsx(
            'flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors',
            !typeFiltre ? 'bg-tikexo-primary text-white border-tikexo-primary' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          )}
        >
          Tous
        </button>
        {Object.entries(TYPE_LABELS).map(([key, label]) => {
          const Icon = TYPE_ICON[key] ?? Utensils;
          return (
            <button
              key={key}
              onClick={() => setTypeFiltre(key === typeFiltre ? '' : key)}
              className={clsx(
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors',
                typeFiltre === key
                  ? 'bg-tikexo-primary text-white border-tikexo-primary'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              )}
            >
              <Icon size={11} /> {label}
            </button>
          );
        })}
      </div>

      {/* Résultats */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 py-12 flex flex-col items-center gap-2">
          <ChefHat size={28} className="text-slate-200" />
          <div className="text-sm text-slate-400">Aucun établissement trouvé</div>
          {nearbyMode && <div className="text-[11px] text-slate-300">Élargissez votre rayon ou désactivez "Près de moi"</div>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <CarteCommercant
              key={c.id}
              commercant={c}
              onClick={() => setSelected(c)}
            />
          ))}
        </div>
      )}

      {filtered.length > 0 && !isLoading && (
        <div className="text-[11px] text-slate-400 text-center">
          {filtered.length} établissement{filtered.length > 1 ? 's' : ''}
          {nearbyMode && coords ? ' dans un rayon de 5 km' : ''}
        </div>
      )}

      {/* Drawer détail */}
      {selected && (
        <DetailDrawer commercant={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function CarteCommercant({ commercant: c, onClick }: { commercant: Commercant; onClick: () => void }) {
  const Icon = TYPE_ICON[c.type] ?? Store;
  const [iconBg, iconFg] = TYPE_COLOR[c.type] ?? ['#F1F5F9', '#334155'];
  return (
    <button
      onClick={onClick}
      className="w-full bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3 hover:border-tikexo-accent/40 hover:shadow-sm transition-all text-left"
    >
      {/* Avatar type */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg }}
      >
        <Icon size={20} style={{ color: iconFg }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-[13px] font-medium text-slate-900 truncate">{c.nom}</div>
          {c.est_ouvert === true && (
            <span className="flex-shrink-0 text-[9px] bg-[#EAF3DE] text-[#3B6D11] px-1.5 py-0.5 rounded-full font-medium">Ouvert</span>
          )}
          {c.est_ouvert === false && (
            <span className="flex-shrink-0 text-[9px] bg-[#F1F5F9] text-slate-400 px-1.5 py-0.5 rounded-full font-medium">Fermé</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[10px] text-slate-400">{TYPE_LABELS[c.type] ?? c.type}</span>
          {c.adresse && (
            <span className="flex items-center gap-0.5 text-[10px] text-slate-400 truncate">
              <MapPin size={9} /> {c.adresse}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        {c.note_moyenne > 0 && (
          <div className="flex items-center gap-0.5">
            <Star size={10} className="text-yellow-400 fill-yellow-400" />
            <span className="text-[11px] text-slate-600 font-medium">{c.note_moyenne.toFixed(1)}</span>
          </div>
        )}
        {c.distance_label && (
          <span className="text-[10px] text-tikexo-accent font-medium">{c.distance_label}</span>
        )}
      </div>
    </button>
  );
}

function DetailDrawer({ commercant: c, onClose }: { commercant: Commercant; onClose: () => void }) {
  const Icon = TYPE_ICON[c.type] ?? Store;
  const [iconBg, iconFg] = TYPE_COLOR[c.type] ?? ['#F1F5F9', '#334155'];
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1" onClick={onClose} />
      <div className="w-[360px] bg-white shadow-2xl border-l border-slate-100 flex flex-col h-full overflow-y-auto">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
              <Icon size={22} style={{ color: iconFg }} />
            </div>
            <div>
              <div className="text-[14px] font-medium text-slate-900">{c.nom}</div>
              <div className="text-[11px] text-slate-400">{TYPE_LABELS[c.type] ?? c.type}</div>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100">
            <X size={14} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 px-5 py-4 space-y-4">
          {/* Statut ouverture + note */}
          <div className="flex items-center gap-3">
            {c.est_ouvert !== undefined && (
              <span className={clsx(
                'flex items-center gap-1.5 text-[12px] px-3 py-1 rounded-full font-medium',
                c.est_ouvert ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-[#F1F5F9] text-slate-400'
              )}>
                <Clock size={11} />
                {c.est_ouvert ? 'Ouvert maintenant' : 'Fermé'}
              </span>
            )}
            {c.note_moyenne > 0 && (
              <span className="flex items-center gap-1 text-[12px] text-slate-600">
                <Star size={12} className="text-yellow-400 fill-yellow-400" />
                {c.note_moyenne.toFixed(1)} / 5
              </span>
            )}
          </div>

          {/* Infos */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            {c.adresse && (
              <div className="flex items-start gap-2.5">
                <MapPin size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-[12px] text-slate-700">{c.adresse}</div>
                  <div className="text-[11px] text-slate-400">{c.ville}</div>
                </div>
              </div>
            )}
            {c.distance_label && (
              <div className="flex items-center gap-2.5">
                <Navigation size={14} className="text-tikexo-accent flex-shrink-0" />
                <div>
                  <div className="text-[12px] text-tikexo-accent font-medium">{c.distance_label}</div>
                  {c.duree_a_pied && <div className="text-[10px] text-slate-400">{c.duree_a_pied} à pied</div>}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <div className="w-3.5 h-3.5 rounded-full bg-tikexo-primary flex-shrink-0 flex items-center justify-center">
                <span className="text-[7px] text-white font-bold">T</span>
              </div>
              <div className="text-[12px] text-slate-700">
                Paiement TIKEXO accepté
                {c.niveau === 'VERIFIE' && <span className="ml-1.5 text-[10px] text-tikexo-accent">✓ Vérifié</span>}
              </div>
            </div>
          </div>

          {/* Instruction paiement */}
          <div className="bg-tikexo-primary rounded-xl p-4 text-white">
            <div className="text-[11px] text-white/50 mb-1">COMMENT PAYER</div>
            <div className="text-[13px] font-medium mb-1">Scanner le QR Code TIKEXO</div>
            <div className="text-[11px] text-white/60 leading-relaxed">
              Présentez-vous à la caisse de <span className="text-white/90 font-medium">{c.nom}</span> et demandez à scanner le QR Code TIKEXO affiché en caisse pour payer avec votre solde.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
