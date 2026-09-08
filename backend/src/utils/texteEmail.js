// Conversion texte brut → HTML pour le contenu saisi par un admin (email
// personnalisé, communication de masse) — l'admin ne voit et n'écrit jamais
// de balise HTML, juste du texte normal avec des lignes vides entre les
// paragraphes, comme dans un email classique.
function echapperHtml(texte) {
  return String(texte)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function texteVersHtml(texte) {
  return echapperHtml(texte)
    .split(/\n{2,}/)
    .map((p) => `<p style="color:#555;margin:0 0 16px;line-height:1.6">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

// Comme texteVersHtml, mais reconnaît les titres de section : une ligne
// commençant par "# " (comme un simple sommaire) devient un sous-titre.
// Utilisé pour les CGU, qui ont besoin de sections titrées contrairement à
// un email — toujours sans qu'un admin non technique ait à écrire de HTML.
function texteStructureVersHtml(texte) {
  return echapperHtml(texte)
    .split(/\n{2,}/)
    .map((bloc) => {
      const titre = bloc.match(/^#{1,2}\s+(.+)$/);
      if (titre) return `<h2 style="color:#1A3C5E;font-size:15px;margin:24px 0 10px">${titre[1]}</h2>`;
      return `<p style="color:#555;margin:0 0 16px;line-height:1.6">${bloc.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');
}

module.exports = { echapperHtml, texteVersHtml, texteStructureVersHtml };
