// Fonctions de formatage partagées TIKEXO

const NUM_FR = new Intl.NumberFormat('fr-FR');

/** Formate un montant en XOF : 12 500 XOF */
export function fmt(n: number | string): string {
  return `${NUM_FR.format(Math.round(Number(n)))} XOF`;
}

/** Formate un nombre sans devise : 12 500 */
export function fmtNum(n: number | string): string {
  return NUM_FR.format(Number(n));
}

/** Formate en K XOF (≥1000) ou valeur brute : 12 K */
export function fmtK(n: number | string): string {
  const v = Number(n);
  return v >= 1_000 ? `${(v / 1_000).toFixed(0)} K` : `${v}`;
}

/** Formate une date ISO en date courte : 24 juin 2026 */
export function fmtDate(d: string | Date | undefined | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Formate une date ISO en heure : 14:32 */
export function fmtHeure(iso: string | Date): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** Formate une date ISO en date + heure : 24 juin 2026, 14:32 */
export function fmtDateHeure(iso: string | Date | undefined | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

/** Formate un montant de façon compacte : 1,5 M XOF / 12 K XOF / 500 XOF */
export function fmtCompact(n: number | string): string {
  const v = Math.round(Number(n));
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')} M XOF`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)} K XOF`;
  return `${v} XOF`;
}

/** Retourne "il y a X min/h/j" */
export function fmtRelatif(iso: string | Date): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1)  return 'à l\'instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

/** Masque partiellement un email : jul***@gmail.com */
export function masquerEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  return `${local.slice(0, 3)}***@${domain}`;
}

/** Masque un numéro de téléphone */
export function masquerTelephone(tel: string): string {
  if (tel.length < 6) return tel;
  return tel.slice(0, -4).replace(/\d/g, '*') + tel.slice(-4);
}
