-- ═══════════════════════════════════════════════════════════════════════════
-- ODF Manager V8 — Anneau inter-sites 4×12 ports (CORRIGÉ)
-- Topologie : RDK ↔ YAC ↔ HAR ↔ DDC ↔ RDK
--
-- Chaque liaison = 12 câbles EXTERNE indépendants (1 fibre chacun).
-- Slots S02 créés pour YAC, HAR, DDC (S01 = déjà pris par la liaison
-- entrante, S02 = ports vers le site suivant dans l'anneau).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Nettoyage des anciens câbles de démo V7 (1 port par liaison)
DELETE FROM public.service_jonctions
  WHERE cable_id IN ('CBL-RDK-YAC','CBL-YAC-HAR','CBL-RDK-YAC-01','CBL-YAC-HAR-01');
DELETE FROM public.services
  WHERE cable_id IN ('CBL-RDK-YAC','CBL-YAC-HAR','CBL-RDK-YAC-01','CBL-YAC-HAR-01');
DELETE FROM public.cables_fibre
  WHERE id IN ('CBL-RDK-YAC','CBL-YAC-HAR','CBL-RDK-YAC-01','CBL-YAC-HAR-01');

-- 2. Slots S02 pour YAC, HAR, DDC
--    (S01 reçoit les fibres entrantes, S02 porte les fibres sortantes)
INSERT INTO public.slots (id, odf_id, slot_num, name) VALUES
  ('YAC-R1-ODF1_S02', 'YAC-R1-ODF1', 2, 'S02'),
  ('HAR-R1-ODF1_S02', 'HAR-R1-ODF1', 2, 'S02'),
  ('DDC-R1-ODF1_S02', 'DDC-R1-ODF1', 2, 'S02')
ON CONFLICT (id) DO NOTHING;
-- Le trigger fn_after_slot_insert crée automatiquement P01..P12 pour chaque slot.

-- 3. Slot S02 pour RDK (ports de sortie vers DDC, côté anneau retour)
--    RDK-R1-ODF1_S02 existe déjà dans les données V7 ; on l'insère en
--    ON CONFLICT DO NOTHING pour être idempotent.
INSERT INTO public.slots (id, odf_id, slot_num, name)
  VALUES ('RDK-R1-ODF1_S02', 'RDK-R1-ODF1', 2, 'S02')
ON CONFLICT (id) DO NOTHING;

-- Attendre que les triggers aient créé les ports avant de les référencer
-- (les triggers AFTER INSERT sont synchrones dans Postgres — pas de sleep nécessaire)

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Câbles inter-sites — 12 par liaison
--    Ordre correct des colonnes :
--      id, cable_reference, nom,
--      type_lien,            ← 'EXTERNE'
--      fournisseur_id,       ← code fournisseur
--      type_fibre,           ← 'Monomode'
--      nombre_fibres,        ← 1
--      route,                ← description lisible
--      capacite_totale_gbps, capacite_disponible_gbps,
--      port_source_id, port_dest_id
-- ─────────────────────────────────────────────────────────────────────────

-- Liaison RDK → YAC  (RDK S02 → YAC S01)
INSERT INTO public.cables_fibre
  (id, cable_reference, nom, type_lien, fournisseur_id, type_fibre, nombre_fibres,
   route, capacite_totale_gbps, capacite_disponible_gbps, port_source_id, port_dest_id)
SELECT
  'CBL-RDK-YAC-' || LPAD(p::TEXT, 2, '0'),
  'CBL-RDK-YAC-' || LPAD(p::TEXT, 2, '0'),
  'Liaison RDK-YAC Fibre ' || LPAD(p::TEXT, 2, '0'),
  'EXTERNE',
  'WIOCC',
  'Monomode',
  1,
  'Ras-Dika ↔ YAC',
  400,
  400,
  'RDK-R1-ODF1_S02P' || LPAD(p::TEXT, 2, '0'),
  'YAC-R1-ODF1_S01P' || LPAD(p::TEXT, 2, '0')
FROM generate_series(1, 12) p
ON CONFLICT (id) DO UPDATE SET
  type_lien                = 'EXTERNE',
  fournisseur_id           = 'WIOCC',
  port_source_id           = EXCLUDED.port_source_id,
  port_dest_id             = EXCLUDED.port_dest_id,
  capacite_totale_gbps     = 400,
  capacite_disponible_gbps = 400;

-- Liaison YAC → HAR  (YAC S02 → HAR S01)
INSERT INTO public.cables_fibre
  (id, cable_reference, nom, type_lien, fournisseur_id, type_fibre, nombre_fibres,
   route, capacite_totale_gbps, capacite_disponible_gbps, port_source_id, port_dest_id)
SELECT
  'CBL-YAC-HAR-' || LPAD(p::TEXT, 2, '0'),
  'CBL-YAC-HAR-' || LPAD(p::TEXT, 2, '0'),
  'Liaison YAC-HAR Fibre ' || LPAD(p::TEXT, 2, '0'),
  'EXTERNE',
  'AAE1',
  'Monomode',
  1,
  'YAC ↔ Haramous',
  400,
  400,
  'YAC-R1-ODF1_S02P' || LPAD(p::TEXT, 2, '0'),
  'HAR-R1-ODF1_S01P' || LPAD(p::TEXT, 2, '0')
FROM generate_series(1, 12) p
ON CONFLICT (id) DO UPDATE SET
  type_lien                = 'EXTERNE',
  fournisseur_id           = 'AAE1',
  port_source_id           = EXCLUDED.port_source_id,
  port_dest_id             = EXCLUDED.port_dest_id,
  capacite_totale_gbps     = 400,
  capacite_disponible_gbps = 400;

-- Liaison HAR → DDC  (HAR S02 → DDC S01)
INSERT INTO public.cables_fibre
  (id, cable_reference, nom, type_lien, fournisseur_id, type_fibre, nombre_fibres,
   route, capacite_totale_gbps, capacite_disponible_gbps, port_source_id, port_dest_id)
SELECT
  'CBL-HAR-DDC-' || LPAD(p::TEXT, 2, '0'),
  'CBL-HAR-DDC-' || LPAD(p::TEXT, 2, '0'),
  'Liaison HAR-DDC Fibre ' || LPAD(p::TEXT, 2, '0'),
  'EXTERNE',
  'EIG',
  'Monomode',
  1,
  'Haramous ↔ DDC',
  400,
  400,
  'HAR-R1-ODF1_S02P' || LPAD(p::TEXT, 2, '0'),
  'DDC-R1-ODF1_S01P' || LPAD(p::TEXT, 2, '0')
FROM generate_series(1, 12) p
ON CONFLICT (id) DO UPDATE SET
  type_lien                = 'EXTERNE',
  fournisseur_id           = 'EIG',
  port_source_id           = EXCLUDED.port_source_id,
  port_dest_id             = EXCLUDED.port_dest_id,
  capacite_totale_gbps     = 400,
  capacite_disponible_gbps = 400;

-- Liaison DDC → RDK  (DDC S02 → RDK ODF4 S01)
INSERT INTO public.cables_fibre
  (id, cable_reference, nom, type_lien, fournisseur_id, type_fibre, nombre_fibres,
   route, capacite_totale_gbps, capacite_disponible_gbps, port_source_id, port_dest_id)
SELECT
  'CBL-DDC-RDK-' || LPAD(p::TEXT, 2, '0'),
  'CBL-DDC-RDK-' || LPAD(p::TEXT, 2, '0'),
  'Liaison DDC-RDK Fibre ' || LPAD(p::TEXT, 2, '0'),
  'EXTERNE',
  'SEACOM',
  'Monomode',
  1,
  'DDC ↔ Ras-Dika',
  400,
  400,
  'DDC-R1-ODF1_S02P' || LPAD(p::TEXT, 2, '0'),
  'RDK-R1-ODF4_S01P' || LPAD(p::TEXT, 2, '0')
FROM generate_series(1, 12) p
ON CONFLICT (id) DO UPDATE SET
  type_lien                = 'EXTERNE',
  fournisseur_id           = 'SEACOM',
  port_source_id           = EXCLUDED.port_source_id,
  port_dest_id             = EXCLUDED.port_dest_id,
  capacite_totale_gbps     = 400,
  capacite_disponible_gbps = 400;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Vérification post-migration
-- ─────────────────────────────────────────────────────────────────────────
-- Exécuter après migration :
--
-- SELECT
--   split_part(port_source_id,'-',1) AS site_src,
--   split_part(port_dest_id,'-',1)   AS site_dst,
--   COUNT(*)                          AS nb_cables,
--   type_lien
-- FROM public.cables_fibre
-- WHERE id ~ '^CBL-(RDK-YAC|YAC-HAR|HAR-DDC|DDC-RDK)-\d+$'
-- GROUP BY 1,2,4 ORDER BY 1;
--
-- Résultat attendu :
--   DDC | RDK | 12 | EXTERNE
--   HAR | DDC | 12 | EXTERNE
--   RDK | YAC | 12 | EXTERNE
--   YAC | HAR | 12 | EXTERNE
