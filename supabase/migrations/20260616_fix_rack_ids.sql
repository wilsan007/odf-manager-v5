-- ═══════════════════════════════════════════════════════════════════════════════
--  MIGRATION : Correction du format des IDs de rack (max 3 parties: SITE-SALLE-RACK)
--  Objectif : Supprimer les doublons de préfixe de salle (ex: ALP-S2-S2-R1 -> ALP-S2-R1)
--             et corriger les triggers automatiques.
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- EXÉCUTION DE TOUTE LA MIGRATION DANS UN UNIQUE BLOC DYNAMIQUE
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  fk_rec RECORD;
  drop_queries TEXT := '';
  restore_queries TEXT := '';
BEGIN
  -- 1. Récupérer et générer dynamiquement les requêtes de DROP et d'ADD pour les FKs
  FOR fk_rec IN 
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
      )
  LOOP
    drop_queries := drop_queries || format('ALTER TABLE public.%I DROP CONSTRAINT %I; ', fk_rec.table_name, fk_rec.constraint_name);
    restore_queries := restore_queries || format('ALTER TABLE public.%I ADD CONSTRAINT %I %s; ', fk_rec.table_name, fk_rec.constraint_name, fk_rec.definition);
  END LOOP;

  -- 2. Exécuter la suppression temporaire des clés étrangères (si existantes)
  IF drop_queries <> '' THEN
    EXECUTE drop_queries;
  END IF;

  -- 3. Supprimer les contraintes d'unicité obsolètes sur la table racks
  ALTER TABLE public.racks DROP CONSTRAINT IF EXISTS racks_site_id_name_key;
  ALTER TABLE public.racks DROP CONSTRAINT IF EXISTS racks_salle_id_name_key;

  -- 4. Construire dynamiquement les tables de renommage et exécuter les updates
  EXECUTE 'CREATE TEMP TABLE rack_rename AS
    WITH salle_data AS (
      SELECT
        r.id AS old_rack_id,
        r.site_id,
        r.salle_id,
        regexp_replace(s.id, ''^'' || r.site_id || ''-'', '''') AS salle_suffix,
        r.name AS old_rack_name
      FROM public.racks r
      JOIN public.salles s ON r.salle_id = s.id
      WHERE r.name LIKE regexp_replace(s.id, ''^'' || r.site_id || ''-'', '''') || ''-%''
    ),
    cleaned_data AS (
      SELECT
        old_rack_id,
        site_id,
        salle_id,
        salle_suffix,
        old_rack_name,
        regexp_replace(old_rack_name, ''^'' || salle_suffix || ''-'', '''') AS new_rack_name
      FROM salle_data
    )
    SELECT
      old_rack_id,
      site_id || ''-'' || salle_suffix || ''-'' || new_rack_name AS new_rack_id,
      new_rack_name
    FROM cleaned_data';

  EXECUTE 'CREATE TEMP TABLE odf_rename AS
    SELECT
      o.id AS old_odf_id,
      rr.new_rack_id || regexp_replace(o.id, ''^'' || rr.old_rack_id, '''') AS new_odf_id,
      rr.new_rack_id
    FROM public.odfs o
    JOIN rack_rename rr ON o.rack_id = rr.old_rack_id';

  EXECUTE 'CREATE TEMP TABLE slot_rename AS
    SELECT
      sl.id AS old_slot_id,
      orf.new_odf_id || regexp_replace(sl.id, ''^'' || orf.old_odf_id, '''') AS new_slot_id,
      orf.new_odf_id
    FROM public.slots sl
    JOIN odf_rename orf ON sl.odf_id = orf.old_odf_id';

  EXECUTE 'CREATE TEMP TABLE port_rename AS
    SELECT
      p.id AS old_port_id,
      orf.new_odf_id || regexp_replace(p.id, ''^'' || orf.old_odf_id, '''') AS new_port_id,
      orf.new_odf_id,
      p.slot_id AS old_slot_id,
      COALESCE(slr.new_slot_id, p.slot_id) AS new_slot_id
    FROM public.ports p
    JOIN odf_rename orf ON p.odf_id = orf.old_odf_id
    LEFT JOIN slot_rename slr ON p.slot_id = slr.old_slot_id';

  -- Application des renommages
  EXECUTE 'UPDATE public.cables_fibre cf SET port_source_id = pr.new_port_id FROM port_rename pr WHERE cf.port_source_id = pr.old_port_id';
  EXECUTE 'UPDATE public.cables_fibre cf SET port_dest_id = pr.new_port_id FROM port_rename pr WHERE cf.port_dest_id = pr.old_port_id';
  EXECUTE 'UPDATE public.service_jonctions sj SET port_entree_id = pr.new_port_id FROM port_rename pr WHERE sj.port_entree_id = pr.old_port_id';
  EXECUTE 'UPDATE public.service_jonctions sj SET port_sortie_id = pr.new_port_id FROM port_rename pr WHERE sj.port_sortie_id = pr.old_port_id';
  EXECUTE 'UPDATE public.services sv SET port_id = pr.new_port_id FROM port_rename pr WHERE sv.port_id = pr.old_port_id';

  EXECUTE 'UPDATE public.ports p SET id = pr.new_port_id, slot_id = pr.new_slot_id, odf_id = pr.new_odf_id FROM port_rename pr WHERE p.id = pr.old_port_id';
  EXECUTE 'UPDATE public.slots sl SET id = sr.new_slot_id, odf_id = sr.new_odf_id FROM slot_rename sr WHERE sl.id = sr.old_slot_id';
  EXECUTE 'UPDATE public.odfs o SET id = orf.new_odf_id, rack_id = orf.new_rack_id FROM odf_rename orf WHERE o.id = orf.old_odf_id';
  EXECUTE 'UPDATE public.racks r SET id = rr.new_rack_id, name = rr.new_rack_name FROM rack_rename rr WHERE r.id = rr.old_rack_id';

  -- 5. Créer la nouvelle contrainte d'unicité (par salle et non plus globale par site)
  ALTER TABLE public.racks ADD CONSTRAINT racks_salle_id_name_key UNIQUE (salle_id, name);

  -- 6. Restaurer les clés étrangères
  IF restore_queries <> '' THEN
    EXECUTE restore_queries;
  END IF;

  -- 7. Nettoyer les tables temporaires
  EXECUTE 'DROP TABLE IF EXISTS rack_rename';
  EXECUTE 'DROP TABLE IF EXISTS odf_rename';
  EXECUTE 'DROP TABLE IF EXISTS slot_rename';
  EXECUTE 'DROP TABLE IF EXISTS port_rename';

END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 6 : Corriger les triggers d'auto-génération et fonctions associées
-- ─────────────────────────────────────────────────────────────────────────────

-- 6a. Fonction exécutée lors de l'insertion d'un site
CREATE OR REPLACE FUNCTION fn_after_site_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_salle_id TEXT;
BEGIN
  v_salle_id := NEW.id || '-S1';
  INSERT INTO public.salles (id, site_id, name)
  VALUES (v_salle_id, NEW.id, 'S1')
  ON CONFLICT (id) DO NOTHING;
  
  -- Correction ici : NEW.id || '-S1-R1' au lieu de NEW.id || '-R1'
  INSERT INTO public.racks (id, site_id, salle_id, name)
  VALUES (NEW.id || '-S1-R1', NEW.id, v_salle_id, 'R1')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 6b. Fonction de garantie des enfants minimaux
CREATE OR REPLACE FUNCTION fn_ensure_min_children(p_level TEXT DEFAULT 'site')
RETURNS TABLE(created_entity TEXT, created_id TEXT) LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
  new_salle_id TEXT;
  new_rack_id TEXT;
  new_odf_id  TEXT;
  new_slot_id TEXT;
  sp TEXT;
  p  INT;
BEGIN
  IF p_level = 'site' THEN
    FOR r IN SELECT id FROM public.sites LOOP
      new_salle_id := r.id || '-S1';
      INSERT INTO public.salles (id, site_id, name)
      VALUES (new_salle_id, r.id, 'S1')
      ON CONFLICT (id) DO NOTHING;
      IF FOUND THEN
        created_entity := 'salle'; created_id := new_salle_id; RETURN NEXT;
      END IF;
      
      -- Correction ici : r.id || '-S1-R1' au lieu de r.id || '-R1'
      new_rack_id := r.id || '-S1-R1';
      INSERT INTO public.racks (id, site_id, salle_id, name)
      VALUES (new_rack_id, r.id, new_salle_id, 'R1')
      ON CONFLICT (id) DO NOTHING;
      IF FOUND THEN
        created_entity := 'rack'; created_id := new_rack_id; RETURN NEXT;
      END IF;
    END LOOP;
    PERFORM fn_ensure_min_children('rack');
  ELSIF p_level = 'rack' THEN
    FOR r IN SELECT id FROM public.racks LOOP
      new_odf_id := r.id || '-ODF1';
      INSERT INTO public.odfs (id, rack_id, name, odf_type)
      VALUES (new_odf_id, r.id, 'ODF1', 'EXTERNE')
      ON CONFLICT (id) DO NOTHING;
      IF FOUND THEN
        created_entity := 'odf'; created_id := new_odf_id; RETURN NEXT;
      END IF;
    END LOOP;
    PERFORM fn_ensure_min_children('odf');
  ELSIF p_level = 'odf' THEN
    FOR r IN SELECT id FROM public.odfs LOOP
      new_slot_id := r.id || '_S01';
      INSERT INTO public.slots (id, odf_id, slot_num, name)
      VALUES (new_slot_id, r.id, 1, 'S01')
      ON CONFLICT (id) DO NOTHING;
      IF FOUND THEN
        created_entity := 'slot'; created_id := new_slot_id; RETURN NEXT;
      END IF;
    END LOOP;
    PERFORM fn_ensure_min_children('slot');
  ELSIF p_level = 'slot' THEN
    FOR r IN SELECT id, odf_id, slot_num, name FROM public.slots LOOP
      FOR p IN 1..12 LOOP
        sp := r.name || 'P' || LPAD(p::TEXT, 2, '0');
        INSERT INTO public.ports (id, slot_id, odf_id, slot_port, slot, port, statut)
        VALUES (r.odf_id || '_' || sp, r.id, r.odf_id, sp, r.slot_num, p, 'LIBRE')
        ON CONFLICT (id) DO NOTHING;
        IF FOUND THEN
          created_entity := 'port'; created_id := r.odf_id || '_' || sp; RETURN NEXT;
        END IF;
      END LOOP;
    END LOOP;
  END IF;
END;
$$;

COMMIT;
