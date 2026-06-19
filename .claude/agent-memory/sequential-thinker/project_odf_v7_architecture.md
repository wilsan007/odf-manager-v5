---
name: project-odf-v7-architecture
description: Architecture technique du projet ODF Manager V7/V8 — stack, schéma clé, conventions ID, composants
metadata:
  type: project
---

Projet React monolithique (Vite) + Supabase. Le code principal est dans `src/App.jsx` (~2500+ lignes après ajouts V8). Les composants UI (Btn, Inp, Sel, Modal, Spinner, Confirm, Field) sont définis inline dans App.jsx — ne pas les importer depuis `/src/components/UI.jsx` qui a une API différente (incompatible).

**Why:** Règle V5 du projet — pas de theme=== dans les style props, tout passe par `TH` (theme object). Les composants inline respectent cette convention.

**How to apply:** Tout nouveau composant ajouté dans App.jsx doit recevoir `TH` comme prop et utiliser `TH.blue`, `TH.text1`, etc. pour les couleurs.

Hiérarchie de données : Sites → Salles → Racks → ODFs → Slots → Ports.
Convention IDs (tous TEXT PK) :
- site: 'RDK'
- salle: 'RDK-S1'
- rack: 'RDK-R1'
- odf: 'RDK-R1-ODF1'
- slot: 'RDK-R1-ODF1_S01'
- port: 'RDK-R1-ODF1_S01P01'

Extraction du site depuis port_id : `portId.split('-')[0]` (fiable, convention garantie par schéma).

Topologie V8 (anneau) : RDK ↔ YAC ↔ HAR ↔ DDC ↔ RDK (12 câbles EXTERNE par liaison).

Bug migration V8 connu : `20260609_v8_interconnections.sql` a inséré le fournisseur dans la colonne `type_lien`. Corrigé par `20260609_v8b_fix_type_lien_et_vue.sql`.

**Fichiers clés :**
- `src/App.jsx` — monolithe principal
- `src/supabase.js` — tous les helpers Supabase
- `supabase/migrations/20250606200000_v7_text_ids.sql` — schéma complet V7
- `supabase/migrations/20260609_v8_interconnections.sql` — câbles inter-sites (bug type_lien)
- `supabase/migrations/20260609_v8b_fix_type_lien_et_vue.sql` — correctif + vue_cables_inter_sites
