
-- ───────────────────────────────────────────────────────────────────────────
-- 7. VUE interconnexions
-- ───────────────────────────────────────────────────────────────────────────
CREATE VIEW public.vue_interconnexions AS
SELECT
  c.id            AS cable_id,
  c.cable_reference,
  c.type_fibre,
  src_si.name || '/' || src_sa.name || '/' || src_ra.name || '/' || src_od.name || '/' ||
    src_sl.name || '/' || src_p.slot_port AS chemin_source,
  '⇌'::TEXT AS liaison,
  dst_si.name || '/' || dst_sa.name || '/' || dst_ra.name || '/' || dst_od.name || '/' ||
    dst_sl.name || '/' || dst_p.slot_port AS chemin_destination,
  c.created_at
FROM public.cables_fibre c
JOIN public.ports  src_p  ON c.port_source_id = src_p.id
JOIN public.slots  src_sl ON src_p.slot_id    = src_sl.id
JOIN public.odfs   src_od ON src_p.odf_id     = src_od.id
JOIN public.racks  src_ra ON src_od.rack_id   = src_ra.id
JOIN public.salles src_sa ON src_ra.salle_id  = src_sa.id
JOIN public.sites  src_si ON src_sa.site_id   = src_si.id
JOIN public.ports  dst_p  ON c.port_dest_id   = dst_p.id
JOIN public.slots  dst_sl ON dst_p.slot_id    = dst_sl.id
JOIN public.odfs   dst_od ON dst_p.odf_id     = dst_od.id
JOIN public.racks  dst_ra ON dst_od.rack_id   = dst_ra.id
JOIN public.salles dst_sa ON dst_ra.salle_id  = dst_sa.id
JOIN public.sites  dst_si ON dst_sa.site_id   = dst_si.id;

-- ───────────────────────────────────────────────────────────────────────────
-- 7b. ROUTAGE DES SERVICES (route dynamique, retracée à la lecture)
-- ───────────────────────────────────────────────────────────────────────────

-- Étiquette lisible d'un port : ex. 'RDK/ODF1/S01P05'
CREATE OR REPLACE FUNCTION fn_port_label(p_port TEXT)
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT si.name || '/' || sa.name || '/' || o.name || '/' || p.slot_port
  FROM public.ports p
  JOIN public.odfs  o  ON p.odf_id  = o.id
  JOIN public.racks r  ON o.rack_id = r.id
  JOIN public.salles sa ON r.salle_id = sa.id
  JOIN public.sites si ON sa.site_id = si.id
  WHERE p.id = p_port;
$$;

-- Route complète d'un service, reconstruite depuis ses jonctions ordonnées :
--   port_entree(hop1) → port_sortie(hop1) → port_sortie(hop2) → … → client final
CREATE OR REPLACE FUNCTION fn_service_route(p_service TEXT)
RETURNS TEXT LANGUAGE sql STABLE AS $$
  WITH ordered AS (
    SELECT ordre, port_entree_id, port_sortie_id
    FROM public.service_jonctions
    WHERE service_id = p_service
    ORDER BY ordre
  )
  SELECT COALESCE(
    (SELECT fn_port_label(port_entree_id) FROM ordered ORDER BY ordre LIMIT 1)
    || COALESCE(' → ' || (
         SELECT string_agg(fn_port_label(port_sortie_id), ' → ' ORDER BY ordre)
         FROM ordered
       ), ''),
    '—'
  );
$$;

-- Vue : une route lisible par service
CREATE OR REPLACE VIEW public.vue_routes_service AS
SELECT
  s.id            AS service_id,
  s.cid,
  s.label,
  s.capacite_gbps,
  cl.nom          AS client,
  fo.nom          AS fournisseur,
  fn_service_route(s.id) AS route,
  (SELECT COUNT(*) FROM public.service_jonctions j WHERE j.service_id = s.id) AS nb_jonctions,
  s.statut,
  s.created_at
FROM public.services s
LEFT JOIN public.clients      cl ON s.client_id      = cl.id
LEFT JOIN public.fournisseurs fo ON s.fournisseur_id = fo.id;

-- ───────────────────────────────────────────────────────────────────────────
-- 8. RLS (Row Level Security)
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.fournisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.racks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odfs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cables_fibre ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_jonctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON public.fournisseurs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.clients      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.sites        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.salles       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.racks        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.odfs         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.slots        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.ports        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.cables_fibre FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.services     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.service_jonctions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.history      FOR ALL USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────────────────────────────────────
-- 9. DONNÉES DÉMO
-- ATTENTION : on insère uniquement les sites ; les triggers créent
--             automatiquement R1, ODF1, S01 et les 12 ports pour chacun.
--             Ensuite on insère les ODFs supplémentaires de Ras-Dika
--             et on peuple les ports réels via UPDATE.
-- ───────────────────────────────────────────────────────────────────────────

-- Fournisseurs (propriétaires de capacité)
INSERT INTO public.fournisseurs (id, nom, type, pays) VALUES
  ('SEACOM', 'SEACOM',  'Câble sous-marin', 'Afrique de l''Est'),
  ('AAE1',   'AAE1',    'Câble sous-marin', 'Asie-Afrique-Europe'),
  ('WIOCC',  'WIOCC',   'Opérateur de gros','Afrique'),
  ('EIG',    'EIG',     'Câble sous-marin', 'Europe-Inde')
ON CONFLICT (id) DO NOTHING;

-- Clients (à qui le service est vendu)
INSERT INTO public.clients (id, nom, type) VALUES
  ('MTN',    'MTN',       'Opérateur'),
  ('AIRTEL', 'Airtel',    'Opérateur'),
  ('VF',     'Vodafone',  'Opérateur'),
  ('CMI',    'CMI',       'Entreprise'),
  ('WINGU',  'Wingu',     'Data Center')
ON CONFLICT (id) DO NOTHING;

-- Sites (les triggers créent RDK-R1, RDK-R1-ODF1, RDK-R1-ODF1_S01, P01..P12)
INSERT INTO public.sites (id, name, description) VALUES
  ('RDK', 'Ras-Dika',  'Cable Landing Station (côté Mosquée)'),
  ('YAC', 'YAC',       'Site YAC — bâtiment côté ville'),
  ('HAR', 'Haramous',  'Station Haramous (via Siesta)'),
  ('DDC', 'DDC',       'Data Center Djibouti')
ON CONFLICT (id) DO NOTHING;

-- ODFs supplémentaires pour Ras-Dika (ODF2..ODF8 sur rack RDK-R1)
-- ODF1 a déjà été créé par le trigger du rack RDK-R1, on ajoute les autres
INSERT INTO public.odfs (id, rack_id, name, odf_type, route) VALUES
  ('RDK-R1-ODF1', 'RDK-R1', 'ODF1', 'EXTERNE', 'Ras-Dika ↔ YAC (côté Mosquée)'),
  ('RDK-R1-ODF2', 'RDK-R1', 'ODF2', 'EXTERNE', 'Ras-Dika → YAC — IODF CIENA'),
  ('RDK-R1-ODF3', 'RDK-R1', 'ODF3', 'INTERNE', 'Ras-Dika MMR ↔ ODF L2'),
  ('RDK-R1-ODF4', 'RDK-R1', 'ODF4', 'EXTERNE', 'Ras-Dika → YAC (BACK, Mosquée)'),
  ('RDK-R1-ODF5', 'RDK-R1', 'ODF5', 'EXTERNE', 'Ras-Dika ↔ Haramous (Siesta)'),
  ('RDK-R1-ODF6', 'RDK-R1', 'ODF6', 'EXTERNE', 'Ras-Dika → YAC-B (BACK cable)'),
  ('RDK-R1-ODF7', 'RDK-R1', 'ODF7', 'EXTERNE', 'Ras-Dika → YAC — Backhaul TEJAS'),
  ('RDK-R1-ODF8', 'RDK-R1', 'ODF8', 'EXTERNE', 'Ras-Dika ↔ Haramous — CIENA 2')
ON CONFLICT (id) DO UPDATE SET route = EXCLUDED.route, odf_type = EXCLUDED.odf_type;

-- Slots supplémentaires pour les ODFs Ras-Dika (S02..S06 pour chaque ODF)
-- S01 a été créé automatiquement par le trigger fn_after_odf_insert
INSERT INTO public.slots (id, odf_id, slot_num, name)
SELECT
  o.id || '_S' || LPAD(n::TEXT, 2, '0'),
  o.id,
  n,
  'S' || LPAD(n::TEXT, 2, '0')
FROM public.odfs o
CROSS JOIN generate_series(2, 6) AS n
WHERE o.rack_id = 'RDK-R1'
ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 10. PORTS RÉELS — métadonnées ODF1..ODF8
--   NB : tous les ports restent au statut 'LIBRE' (défaut). Seuls les ports
--        réellement reliés par un câble passeront en 'OCCUPE' (trigger).
-- ───────────────────────────────────────────────────────────────────────────

-- ODF1
UPDATE public.ports SET cid='DJT-22072025091210', ot_num='615', capacite='100G', owner='2AF/MTN',     destination='SEACOM' WHERE id='RDK-R1-ODF1_S01P05';
UPDATE public.ports SET cid='DJT-18092025114423', ot_num='621', capacite='100G', owner='VF/WIOCC',   destination='AAE1'  WHERE id='RDK-R1-ODF1_S01P06';

-- ODF2
UPDATE public.ports SET cid='DJT-03122024085532', ot_num='554', capacite='100G', owner='VF/WIOCC',  destination='DDC'    WHERE id='RDK-R1-ODF2_S01P01';

-- Active Route ports for SVC-0004 (Liaison MTN multi-sites RDK→HAR)
UPDATE public.ports SET cid='DJT-06062026043300', ot_num='700', capacite='40G', owner='MTN' WHERE id IN ('RDK-R1-ODF1_S01P07', 'YAC-R1-ODF1_S01P01', 'YAC-R1-ODF1_S01P02', 'HAR-R1-ODF1_S01P01');


-- ───────────────────────────────────────────────────────────────────────────
-- 10b. CÂBLES FIBRE (capacité) + liens ODF/PORT
--   On initialise capacite_disponible = capacite_totale ; les services
--   décrémenteront automatiquement la capacité disponible via le trigger.
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO public.cables_fibre
  (id, cable_reference, nom, fournisseur_id, type_fibre, nombre_fibres, route,
   capacite_totale_gbps, capacite_disponible_gbps, port_source_id) VALUES
  ('CBL-SEACOM-01', 'CBL-RDK-SEACOM-01', 'Ras-Dika ↔ SEACOM', 'SEACOM', 'Monomode', 144, 'Ras-Dika → SEACOM', 400, 400, 'RDK-R1-ODF1_S01P05'),
  ('CBL-AAE1-01',   'CBL-RDK-AAE1-01',   'Ras-Dika ↔ AAE1',   'AAE1',   'Monomode', 96,  'Ras-Dika → AAE1',   300, 300, 'RDK-R1-ODF1_S01P06'),
  ('CBL-WIOCC-01',  'CBL-RDK-WIOCC-01',  'Ras-Dika ↔ DDC',    'WIOCC',  'Monomode', 48,  'Ras-Dika → DDC',    200, 200, 'RDK-R1-ODF2_S01P01')
ON CONFLICT (id) DO NOTHING;

-- Lier les ODFs et ports concernés aux câbles physiques (FK)
UPDATE public.odfs  SET cable_id = 'CBL-SEACOM-01' WHERE id = 'RDK-R1-ODF1';
UPDATE public.odfs  SET cable_id = 'CBL-WIOCC-01'  WHERE id = 'RDK-R1-ODF2';
UPDATE public.ports SET cable_id = 'CBL-SEACOM-01' WHERE id = 'RDK-R1-ODF1_S01P05';
UPDATE public.ports SET cable_id = 'CBL-AAE1-01'   WHERE id = 'RDK-R1-ODF1_S01P06';
UPDATE public.ports SET cable_id = 'CBL-WIOCC-01'  WHERE id = 'RDK-R1-ODF2_S01P01';

-- Liens de routage pour la démo multi-sites (RDK → YAC → HAR)
--   2 liens EXTERNE (porteurs de capacité) + 1 JARRETIERE interne à YAC (capacité 0)
INSERT INTO public.cables_fibre
  (id, cable_reference, nom, type_lien, fournisseur_id, type_fibre, route,
   capacite_totale_gbps, capacite_disponible_gbps, port_source_id, port_dest_id) VALUES
  ('CBL-RDK-YAC', 'CBL-RDK-YAC-01', 'Ras-Dika ↔ YAC', 'EXTERNE', 'WIOCC', 'Monomode', 'Ras-Dika → YAC',
     200, 200, 'RDK-R1-ODF1_S01P07', 'YAC-R1-ODF1_S01P01'),
  ('JAR-YAC-01',  'JAR-YAC-01',     'Brassage YAC ODF1', 'JARRETIERE', NULL, 'Monomode', 'Brassage interne YAC',
     0, 0, 'YAC-R1-ODF1_S01P01', 'YAC-R1-ODF1_S01P02'),
  ('CBL-YAC-HAR', 'CBL-YAC-HAR-01', 'YAC ↔ Haramous', 'EXTERNE', 'AAE1', 'Monomode', 'YAC → Haramous',
     200, 200, 'YAC-R1-ODF1_S01P02', 'HAR-R1-ODF1_S01P01')
ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 10c. SERVICES démo (déclenchent la soustraction de capacité)
--   SEACOM : 400 - 100 = 300 dispo
--   AAE1   : 300 - 100 = 200 dispo
--   WIOCC  : 200 - 10  = 190 dispo
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO public.services
  (id, label, cable_id, client_id, fournisseur_id, port_id, capacite_gbps, cid, ot_num, statut) VALUES
  ('SVC-0001', 'Transit IP SEACOM 100G', 'CBL-SEACOM-01', 'MTN',    'SEACOM', 'RDK-R1-ODF1_S01P05', 100, 'DJT-22072025091210', '615', 'ACTIF'),
  ('SVC-0002', 'Capacité AAE1 100G',     'CBL-AAE1-01',   'VF',     'AAE1',   'RDK-R1-ODF1_S01P06', 100, 'DJT-18092025114423', '621', 'ACTIF'),
  ('SVC-0003', 'Liaison DDC 10G',        'CBL-WIOCC-01',  'AIRTEL', 'WIOCC',  'RDK-R1-ODF2_S01P01', 10,  'DJT-03122024085532', '554', 'ACTIF')
ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 10d. SERVICE MULTI-SITES + JONCTIONS (démo du routage dynamique)
--   Service traversant RDK → YAC → HAR. La capacité (40G) est débitée sur le
--   câble primaire (cable_id = CBL-RDK-YAC). Les jonctions décrivent le chemin
--   complet jusqu'au client final ; fn_service_route() le reconstruit à la lecture.
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO public.services
  (id, label, cable_id, client_id, fournisseur_id, port_id, capacite_gbps, cid, ot_num, statut) VALUES
  ('SVC-0004', 'Liaison MTN multi-sites RDK→HAR', 'CBL-RDK-YAC', 'MTN', 'WIOCC', 'RDK-R1-ODF1_S01P07', 40, 'DJT-06062026043300', '700', 'ACTIF')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.service_jonctions (service_id, ordre, cable_id, port_entree_id, port_sortie_id) VALUES
  ('SVC-0004', 1, 'CBL-RDK-YAC', 'RDK-R1-ODF1_S01P07', 'YAC-R1-ODF1_S01P01'),
  ('SVC-0004', 2, 'JAR-YAC-01',  'YAC-R1-ODF1_S01P01', 'YAC-R1-ODF1_S01P02'),
  ('SVC-0004', 3, 'CBL-YAC-HAR', 'YAC-R1-ODF1_S01P02', 'HAR-R1-ODF1_S01P01')
ON CONFLICT (service_id, ordre) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 11. VÉRIFICATION
-- ───────────────────────────────────────────────────────────────────────────
SELECT 'fournisseurs' AS tbl, COUNT(*)::TEXT AS valeur FROM public.fournisseurs
UNION ALL SELECT 'clients',  COUNT(*)::TEXT FROM public.clients
UNION ALL SELECT 'sites',    COUNT(*)::TEXT FROM public.sites
UNION ALL SELECT 'salles',   COUNT(*)::TEXT FROM public.salles
UNION ALL SELECT 'racks',    COUNT(*)::TEXT FROM public.racks
UNION ALL SELECT 'odfs',     COUNT(*)::TEXT FROM public.odfs
UNION ALL SELECT 'slots',    COUNT(*)::TEXT FROM public.slots
UNION ALL SELECT 'ports',    COUNT(*)::TEXT FROM public.ports
UNION ALL SELECT 'cables',   COUNT(*)::TEXT FROM public.cables_fibre
UNION ALL SELECT 'services', COUNT(*)::TEXT FROM public.services
UNION ALL SELECT 'jonctions',COUNT(*)::TEXT FROM public.service_jonctions
ORDER BY 1;

-- Vérification capacité des câbles après services démo
SELECT id, type_lien, capacite_totale_gbps, capacite_disponible_gbps,
       (capacite_totale_gbps - capacite_disponible_gbps) AS capacite_utilisee
FROM public.cables_fibre ORDER BY id;

-- Vérification du routage dynamique des services (route reconstruite)
SELECT service_id, cid, label, client, route, nb_jonctions
FROM public.vue_routes_service ORDER BY service_id;
