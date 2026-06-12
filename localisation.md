## Géolocalisation des commerçants

### Stack cartographique
- Carte : OpenStreetMap (tiles gratuits, zéro frais)
- Librairie mobile : react-native-maps (Expo compatible)
- Librairie web portail admin : Leaflet.js
- Pas de Google Maps (éviter les frais API)
- Coordonnées GPS stockées dans le modèle Prisma Commercant
  (latitude DECIMAL(10,8), longitude DECIMAL(11,8))

### API backend — routes géolocalisation

GET /api/v1/commercants/nearby
  Query params :
    lat        (float, requis) — latitude de l'utilisateur
    lng        (float, requis) — longitude de l'utilisateur
    rayon      (int, optionnel, défaut 2000) — rayon en mètres
    categorie  (string, optionnel) — RESTAURANT | BOULANGERIE |
               EPICERIE | TRAITEUR | CAFETERIA | LIVRAISON | SUPERMARCHE
    ouvert     (boolean, optionnel) — filtrer sur les horaires actuels

  Algorithme de tri :
    → Calculer la distance Haversine entre la position utilisateur
      et chaque commerçant en base
    → Filtrer par statut = ACTIF uniquement
    → Si ouvert=true : filtrer selon commercant.horaires (JSON)
      et l'heure actuelle côté serveur (timezone Africa/Porto-Novo)
    → Trier par distance ASC
    → Retourner max 20 résultats

  Réponse :
    {
      success: true,
      data: [
        {
          id,
          nom,
          type,
          niveau,          // VERIFIE | SIMPLIFIE
          adresse,
          ville,
          latitude,
          longitude,
          distance_metres, // calculé côté serveur
          distance_label,  // "350 m" ou "1,2 km"
          duree_a_pied,    // "~4 min" (distance / 80m par minute)
          note_moyenne,
          horaires,
          est_ouvert,      // boolean calculé côté serveur
          photo_url,
          qr_code_url,
          taux_commission
        }
      ],
      meta: { total, rayon_metres, position: { lat, lng } }
    }

GET /api/v1/commercants/:id/fiche
  → Retourne la fiche complète d'un commerçant
  → Inclut : toutes les infos + horaires détaillés + note + distance
    si lat/lng passés en query params
  → Nécessite user authentifié (JWT)

### Fonction Haversine (utils/geo.js)
Implémenter la formule Haversine complète :

  calculerDistance(lat1, lng1, lat2, lng2)
    → retourne la distance en mètres (float)
    → formule : 
        R = 6371000 (rayon Terre en mètres)
        φ1 = lat1 en radians
        φ2 = lat2 en radians
        Δφ = (lat2 - lat1) en radians
        Δλ = (lng2 - lng1) en radians
        a = sin²(Δφ/2) + cos(φ1) × cos(φ2) × sin²(Δλ/2)
        c = 2 × atan2(√a, √(1−a))
        d = R × c

  formaterDistance(metres)
    → si < 1000 : "350 m"
    → si >= 1000 : "1,2 km" (1 décimale)

  estimerDureeAPied(metres)
    → vitesse moyenne piéton : 80 m/min
    → retourne "~4 min" ou "~12 min"

  estOuvertMaintenant(horaires, timezone)
    → horaires = objet JSON :
        {
          lundi:    { ouverture: "07:00", fermeture: "21:00" },
          mardi:    { ouverture: "07:00", fermeture: "21:00" },
          mercredi: { ouverture: "07:00", fermeture: "21:00" },
          jeudi:    { ouverture: "07:00", fermeture: "21:00" },
          vendredi: { ouverture: "07:00", fermeture: "21:00" },
          samedi:   { ouverture: "08:00", fermeture: "18:00" },
          dimanche: null  // null = fermé
        }
    → timezone : "Africa/Porto-Novo" (UTC+1, Bénin)
    → retourne boolean
    → RÈGLE TIKEXO : dimanche toujours fermé même si horaires définis
      (règle métier titre-restaurant)

### App mobile — écran Carte (screens/beneficiaire/Carte.tsx)

Composants :
  MapView (react-native-maps)
    → Provider : OSM via react-native-maps-osmdroid OU
      utiliser la vue MapView standard avec tiles OSM custom
    → Region initiale : Cotonou (6.3654° N, 2.4183° E)
    → Zoom par défaut : delta 0.02 (environ 2 km de rayon visible)
    → showsUserLocation : true (point bleu natif)
    → followsUserLocation : false (l'utilisateur contrôle)

  Markers commerçants sur la carte :
    → Couleur du marker selon la catégorie :
        RESTAURANT   → #1A3C5E
        BOULANGERIE  → #B45309
        EPICERIE     → #166534
        autres       → #0EA5E9
    → Marker sélectionné : plus grand + callout tooltip
      (nom + distance + statut ouvert/fermé)
    → Tap sur marker → ouvre la fiche commerçant (bottom sheet)

  Barre de filtres (horizontal scroll) :
    → Tous | Restaurant | Boulangerie | Épicerie | Ouvert maintenant
    → Filtre actif : fond #0EA5E9

  Liste scrollable sous la carte :
    → Triée par distance ASC
    → Chaque item : icône catégorie + nom + note + distance + statut
    → Tap sur item → centre la carte sur ce commerçant + ouvre fiche

  Bottom sheet fiche commerçant :
    → Déclenché par tap marker OU tap item liste
    → Contenu : nom, type, adresse, distance, durée à pied,
      note étoiles, horaires du jour, statut ouvert/fermé,
      bouton "Itinéraire" (ouvre app navigation native via Linking),
      bouton "Scanner et payer ici" (navigue vers screen Paiement
      avec commercant_id pré-rempli)
    → Dimanche : afficher clairement "Fermé — paiements TIKEXO
      non disponibles le dimanche"

  Bouton recentrer :
    → En bas à droite de la carte
    → Tap → anime la carte vers la position GPS actuelle
    → Icône ti-current-location

  Gestion permissions GPS :
    → Demander la permission au premier accès à l'écran Carte
    → Si refusée : afficher la liste sans carte avec message
      "Activez la localisation pour voir les commerçants proches"
    → Si accordée : appeler /api/v1/commercants/nearby avec coords

### Côté commerçant — saisie des coordonnées GPS

Lors de l'onboarding commerçant (formulaire d'affiliation) :
  Option 1 — Automatique :
    → Bouton "Utiliser ma position actuelle"
    → Rempli latitude/longitude via GPS du téléphone
    → Affiche un aperçu carte pour confirmation visuelle

  Option 2 — Manuelle :
    → Champ adresse avec autocomplétion (Nominatim API d'OSM,
      endpoint : https://nominatim.openstreetmap.org/search)
    → Query : q=adresse&format=json&countrycodes=bj&limit=5
    → Sélection d'une suggestion → rempli lat/lng automatiquement

  Validation Admin DIGI :
    → Si les coordonnées semblent hors Bénin (lat hors [6.0, 12.5],
      lng hors [0.8, 3.9]) → alerte Admin avant activation
    → Mini carte de confirmation dans le back-office lors de
      la validation du dossier commerçant

### Tests à ajouter

geo.test.js (unit) :
  - calculerDistance(6.3654, 2.4183, 6.3700, 2.4220)
    → résultat entre 600 et 650 mètres
  - formaterDistance(350) → "350 m"
  - formaterDistance(1250) → "1,3 km"
  - estimerDureeAPied(320) → "~4 min"
  - estOuvertMaintenant(horaires, dimanche) → false (règle TIKEXO)
  - estOuvertMaintenant(horaires_ferme, maintenant) → false
  - estOuvertMaintenant(horaires_ouvert, maintenant) → true

commercant.nearby.integration.test.js :
  Seed : 5 commerçants avec coordonnées GPS réelles Cotonou
  - GET /nearby?lat=6.3654&lng=2.4183&rayon=1000
    → retourne uniquement les commerçants dans le rayon
    → triés par distance ASC
  - GET /nearby?ouvert=true
    → retourne uniquement les commerçants ouverts selon
      l'heure actuelle et leur JSON horaires
  - GET /nearby?categorie=RESTAURANT
    → retourne uniquement les restaurants
  - Commerçant statut SUSPENDU → jamais retourné dans /nearby
  - Dimanche : aucun commerçant retourné si ouvert=true
    (règle métier TIKEXO)