---
name: project-service-wizard
description: ServiceWizard V8 — wizard multi-étapes de création de service inter-sites, BFS, composants ajoutés
metadata:
  type: project
---

Fonctionnalité ServiceWizard implémentée dans App.jsx (~ligne 1175 après genCid). Remplace l'ancienne ServicesView monolithique.

**Composants ajoutés dans App.jsx (avant ServicesView) :**
- `siteFromPortId(portId)` — utilitaire, extrait site_id depuis port_id
- `useRouteGraph(cables)` — hook BFS, expose `findPath(siteA, siteB)` et `getCablesBetween(from, to)`
- `RoutePathDisplay` — affiche la route en pills avec étape active
- `CableSelector` — liste les câbles EXTERNE d'une liaison avec capacité, clic = sélection
- `ServiceWizard` — wizard modal complet, state machine : SELECT_SITES → HOP_n → SELECT_FOURNISSEUR → SELECT_CLIENT → CONFIRM

**State machine du wizard :**
- `step` = "SELECT_SITES" | "HOP_0" | "HOP_1" | ... | "SELECT_FOURNISSEUR" | "SELECT_CLIENT" | "CONFIRM"
- `hops` = tableau d'objets `{cableId, portEntree, portSortie, siteFrom, siteTo, cable_reference}`

**Critère d'éligibilité câble EXTERNE pour un service :**
- `capacite_disponible_gbps >= capacite_demandee` (NOT le statut LIBRE des ports)
- Les ports d'interconnexion sont déjà OCCUPE (créés OCCUPE par le trigger V8) — c'est normal

**Persistance :**
1. INSERT services (cable_id = premier câble, capacite décrémentée par trigger fn_service_capacity)
2. INSERT service_jonctions — une ligne par câble EXTERNE + une jarretière auto-créée si ODF différents sur site de transit
3. Rollback : si addServiceJonctions échoue → DELETE service créé

**Nouveaux helpers dans supabase.js :**
- `getCablesInterSites()` — câbles EXTERNE avec port_source, port_dest résolus
- `checkTopologie()` — vérifie que chaque liaison a ≥12 câbles

**Why:** Refactoring de l'ancien wizard inline dans ServicesView qui avait des bugs (usedCableIds trop restrictif, BFS sans respect de la capacité disponible).

**How to apply:** ServicesView charge maintenant `cablesInterSites` via `getCablesInterSites()` au lieu de `getCables()`. Les states form/hops/mode/siteA/siteB/pathSites/stepSelections sont tous dans ServiceWizard. [[project-odf-v7-architecture]]
