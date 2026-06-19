-- ═══════════════════════════════════════════════════════════════════════════════
--  MIGRATION : Unification du format des IDs d'infrastructure
--  Objectif : Tous les IDs doivent inclure la salle dans leur chemin
--
--  Avant : BET-R1-ODF1_S01P01   (pas de salle dans l'ID)
--  Après : BET-S1-R1-ODF1_S01P01 (salle S1 incluse)
--
--  Hiérarchie complète : {SITE}-{SALLE}-{RACK}-{ODF}_{SLOT}P{PORT}
--
--  ⚠️  IMPORTANT : Exécuter dans Supabase SQL Editor en TRANSACTION
--  ⚠️  Faire une SAUVEGARDE (backup) avant d'exécuter
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 1 : Assigner la salle "S1" à tous les racks qui n'en ont pas
-- Pour chaque site avec des racks orphelins (salle_id IS NULL),
-- on crée/utilise directement la salle "S1" (ID: {site_id}-S1).
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  site_rec        RECORD;
  default_salle_id TEXT;
  orphan_count    INT;
BEGIN
  FOR site_rec IN
    SELECT DISTINCT r.site_id
    FROM racks r
    WHERE r.salle_id IS NULL
  LOOP
    SELECT COUNT(*) INTO orphan_count
    FROM racks WHERE site_id = site_rec.site_id AND salle_id IS NULL;

    IF orphan_count > 0 THEN
      -- Déterminer l'ID de la salle "S1" pour ce site
      default_salle_id := site_rec.site_id || '-S1';
      
      -- S'assurer que cette salle "S1" existe en DB
      INSERT INTO public.salles (id, site_id, name, description)
      VALUES (default_salle_id, site_rec.site_id, 'S1', 'Salle 1 (créée par migration)')
      ON CONFLICT (id) DO NOTHING;
      
      -- Assigner les racks orphelins à cette salle
      UPDATE public.racks
      SET salle_id = default_salle_id
      WHERE site_id = site_rec.site_id AND salle_id IS NULL;

      RAISE NOTICE 'Site % : % rack(s) orphelins assignés à la salle S1 (%)',
        site_rec.site_id, orphan_count, default_salle_id;
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 2 : Construire la table de correspondance rack IDs
-- Identifier les racks dont l'ID ne contient pas encore la salle
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TEMP TABLE rack_rename AS
WITH salle_data AS (
  SELECT
    r.id        AS old_rack_id,
    r.site_id,
    r.salle_id,
    -- Extraire le suffixe de la salle (ex: 'BET-S1' → 'S1')
    regexp_replace(s.id, '^' || r.site_id || '-', '') AS salle_suffix,
    r.name      AS rack_name
  FROM public.racks r
  JOIN public.salles s ON r.salle_id = s.id
)
SELECT
  old_rack_id,
  site_id || '-' || salle_suffix || '-' || rack_name AS new_rack_id,
  site_id,
  salle_id,
  salle_suffix,
  rack_name
FROM salle_data
-- Uniquement les racks dont l'ID actuel ne contient PAS déjà la salle
WHERE old_rack_id != (site_id || '-' || salle_suffix || '-' || rack_name);

-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 3 : Construire la table de correspondance ODF IDs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TEMP TABLE odf_rename AS
SELECT
  o.id                                        AS old_odf_id,
  rr.new_rack_id || '-' || o.name             AS new_odf_id,
  o.rack_id                                   AS old_rack_id,
  rr.new_rack_id
FROM public.odfs o
JOIN rack_rename rr ON o.rack_id = rr.old_rack_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 4 : Construire la table de correspondance Slot IDs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TEMP TABLE slot_rename AS
SELECT
  sl.id                                       AS old_slot_id,
  orf.new_odf_id || '_' || sl.name            AS new_slot_id,
  sl.odf_id                                   AS old_odf_id,
  orf.new_odf_id
FROM public.slots sl
JOIN odf_rename orf ON sl.odf_id = orf.old_odf_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 5 : Construire la table de correspondance Port IDs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TEMP TABLE port_rename AS
SELECT
  p.id                                        AS old_port_id,
  orf.new_odf_id || '_' || p.slot_port        AS new_port_id,
  p.odf_id                                    AS old_odf_id,
  orf.new_odf_id,
  p.slot_id                                   AS old_slot_id,
  COALESCE(slr.new_slot_id, p.slot_id)        AS new_slot_id
FROM public.ports p
JOIN odf_rename orf ON p.odf_id = orf.old_odf_id
LEFT JOIN slot_rename slr ON p.slot_id = slr.old_slot_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 6 : Gestion des contraintes de clés étrangères (FK)
-- Pour éviter l'erreur de privilège ("system trigger"), on supprime temporairement
-- les contraintes de clés étrangères (FK) pour effectuer la migration,
-- puis on les recrée à l'identique à la fin.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  fk_rec RECORD;
BEGIN
  -- Création d'une table temporaire pour stocker les définitions de contraintes FK à recréer
  CREATE TEMP TABLE temp_fk_definitions (
    table_name text,
    constraint_name text,
    definition text
  );

  -- Identifier et sauvegarder les définitions de toutes les contraintes de clé étrangère
  -- qui pointent vers les tables modifiées (racks, odfs, slots, ports) ou qui partent de celles-ci.
  INSERT INTO temp_fk_definitions (table_name, constraint_name, definition)
  SELECT 
    conrelid::regclass::text AS table_name,
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS definition
  FROM pg_constraint c
  JOIN pg_namespace n ON n.oid = c.connamespace
  WHERE c.contype = 'f' 
    AND n.nspname = 'public'
    AND (
      conrelid::regclass::text IN ('racks', 'odfs', 'slots', 'ports', 'cables_fibre', 'services', 'service_jonctions')
      OR confrelid::regclass::text IN ('racks', 'odfs', 'slots', 'ports')
    );

  -- Supprimer temporairement ces contraintes
  FOR fk_rec IN SELECT table_name, constraint_name FROM temp_fk_definitions LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', fk_rec.table_name, fk_rec.constraint_name);
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 7 : Appliquer les modifications d'IDs et références
-- ─────────────────────────────────────────────────────────────────────────────

-- 7a. Mettre à jour les références dans cables_fibre
UPDATE public.cables_fibre cf
SET port_source_id = pr.new_port_id
FROM port_rename pr
WHERE cf.port_source_id = pr.old_port_id;

UPDATE public.cables_fibre cf
SET port_dest_id = pr.new_port_id
FROM port_rename pr
WHERE cf.port_dest_id = pr.old_port_id;

-- 7b. Mettre à jour les références dans service_jonctions
UPDATE public.service_jonctions sj
SET port_entree_id = pr.new_port_id
FROM port_rename pr
WHERE sj.port_entree_id = pr.old_port_id;

UPDATE public.service_jonctions sj
SET port_sortie_id = pr.new_port_id
FROM port_rename pr
WHERE sj.port_sortie_id = pr.old_port_id;

-- 7c. Mettre à jour les références dans services
UPDATE public.services sv
SET port_id = pr.new_port_id
FROM port_rename pr
WHERE sv.port_id = pr.old_port_id;

-- 7d. Mettre à jour les ports (FKs internes d'abord)
UPDATE public.ports p
SET slot_id = pr.new_slot_id
FROM port_rename pr
WHERE p.id = pr.old_port_id AND pr.new_slot_id != pr.old_slot_id;

UPDATE public.ports p
SET odf_id = pr.new_odf_id
FROM port_rename pr
WHERE p.id = pr.old_port_id;

UPDATE public.ports p
SET id = pr.new_port_id
FROM port_rename pr
WHERE p.id = pr.old_port_id;

-- 7e. Mettre à jour les slots
UPDATE public.slots sl
SET odf_id = sr.new_odf_id
FROM slot_rename sr
WHERE sl.id = sr.old_slot_id;

UPDATE public.slots sl
SET id = sr.new_slot_id
FROM slot_rename sr
WHERE sl.id = sr.old_slot_id;

-- 7f. Mettre à jour les ODFs
UPDATE public.odfs o
SET rack_id = orf.new_rack_id
FROM odf_rename orf
WHERE o.id = orf.old_odf_id;

UPDATE public.odfs o
SET id = orf.new_odf_id
FROM odf_rename orf
WHERE o.id = orf.old_odf_id;

-- 7g. Mettre à jour les racks (en dernier)
UPDATE public.racks r
SET id = rr.new_rack_id
FROM rack_rename rr
WHERE r.id = rr.old_rack_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 8 : Restaurer toutes les contraintes de clés étrangères (FK)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  fk_rec RECORD;
BEGIN
  -- Recréer chaque contrainte à partir de sa définition sauvegardée
  FOR fk_rec IN SELECT table_name, constraint_name, definition FROM temp_fk_definitions LOOP
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I %s', 
      fk_rec.table_name, 
      fk_rec.constraint_name, 
      fk_rec.definition
    );
  END LOOP;

  -- Nettoyer la table temporaire
  DROP TABLE temp_fk_definitions;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- VÉRIFICATION FINALE
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  orphan_racks   INT;
  bad_odf_ids    INT;
  bad_port_ids   INT;
  count_racks    INT;
  count_ports    INT;
BEGIN
  -- Racks encore sans salle dans l'ID
  SELECT COUNT(*) INTO orphan_racks
  FROM racks r
  JOIN salles s ON r.salle_id = s.id
  WHERE r.id NOT LIKE r.site_id || '-' || regexp_replace(s.id, '^' || r.site_id || '-', '') || '-%';

  -- ODFs dont le rack_id n'est plus dans les racks (orphelins)
  SELECT COUNT(*) INTO bad_odf_ids
  FROM odfs o
  LEFT JOIN racks r ON o.rack_id = r.id
  WHERE r.id IS NULL;

  -- Ports dont le port_id ne commence pas par l'odf_id correct
  SELECT COUNT(*) INTO bad_port_ids
  FROM ports p
  WHERE p.id NOT LIKE p.odf_id || '_%';

  SELECT COUNT(*) INTO count_racks FROM racks;
  SELECT COUNT(*) INTO count_ports FROM ports;

  RAISE NOTICE '=== VÉRIFICATION MIGRATION ===';
  RAISE NOTICE 'Racks au total : %', count_racks;
  RAISE NOTICE 'Ports au total : %', count_ports;
  RAISE NOTICE 'Racks avec ID incohérent : %', orphan_racks;
  RAISE NOTICE 'ODFs orphelins : %', bad_odf_ids;
  RAISE NOTICE 'Ports avec ID incohérent : %', bad_port_ids;

  IF orphan_racks > 0 OR bad_odf_ids > 0 OR bad_port_ids > 0 THEN
    RAISE EXCEPTION 'Migration incomplète — rollback automatique. Vérifiez les données.';
  ELSE
    RAISE NOTICE '✅ Migration réussie — tous les IDs sont cohérents.';
  END IF;
END $$;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- APRÈS MIGRATION : Vérification visuelle
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  p.id                        AS port_id,
  rk.site_id,
  sl.name                     AS salle,
  rk.name                     AS rack,
  o.name                      AS odf,
  o.odf_type,
  p.slot_port,
  p.statut
FROM ports p
JOIN odfs o   ON p.odf_id  = o.id
JOIN racks rk ON o.rack_id = rk.id
JOIN salles sl ON rk.salle_id = sl.id
ORDER BY p.id
LIMIT 20;

