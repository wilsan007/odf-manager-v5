-- ═══════════════════════════════════════════════════════════════════════════════
--  MIGRATION : Autoriser la valeur 'INTERNE' pour type_lien dans cables_fibre
--  Objectif : Corriger le type_lien pour les interconnexions locales intersalles.
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Supprimer la contrainte CHECK existante si elle existe
ALTER TABLE public.cables_fibre DROP CONSTRAINT IF EXISTS cables_fibre_type_lien_check;

-- 2. Recréer la contrainte avec la nouvelle valeur 'INTERNE'
ALTER TABLE public.cables_fibre ADD CONSTRAINT cables_fibre_type_lien_check 
  CHECK (type_lien IN ('EXTERNE', 'JARRETIERE', 'EQUIPEMENT', 'INTERNE'));

-- 3. Identifier et mettre à jour toutes les connexions existantes de type 'JARRETIERE'
--    qui connectent en réalité deux ports situés dans des salles différentes (intersalle).
DO $$
DECLARE
  v_count INT;
BEGIN
  -- Compter le nombre de lignes à modifier
  SELECT COUNT(*) INTO v_count
  FROM public.cables_fibre cf
  JOIN public.ports p_src ON cf.port_source_id = p_src.id
  JOIN public.ports p_dst ON cf.port_dest_id = p_dst.id
  JOIN public.slots s_src ON p_src.slot_id = s_src.id
  JOIN public.slots s_dst ON p_dst.slot_id = s_dst.id
  JOIN public.odfs o_src ON s_src.odf_id = o_src.id
  JOIN public.odfs o_dst ON s_dst.odf_id = o_dst.id
  JOIN public.racks r_src ON o_src.rack_id = r_src.id
  JOIN public.racks r_dst ON o_dst.rack_id = r_dst.id
  WHERE cf.type_lien = 'JARRETIERE'
    AND r_src.salle_id IS DISTINCT FROM r_dst.salle_id;

  RAISE NOTICE 'Nombre de connexions intersalles à corriger (JARRETIERE -> INTERNE) : %', v_count;
END $$;

-- Exécuter la mise à jour
WITH intersalle_cables AS (
  SELECT cf.id
  FROM public.cables_fibre cf
  JOIN public.ports p_src ON cf.port_source_id = p_src.id
  JOIN public.ports p_dst ON cf.port_dest_id = p_dst.id
  JOIN public.slots s_src ON p_src.slot_id = s_src.id
  JOIN public.slots s_dst ON p_dst.slot_id = s_dst.id
  JOIN public.odfs o_src ON s_src.odf_id = o_src.id
  JOIN public.odfs o_dst ON s_dst.odf_id = o_dst.id
  JOIN public.racks r_src ON o_src.rack_id = r_src.id
  JOIN public.racks r_dst ON o_dst.rack_id = r_dst.id
  WHERE cf.type_lien = 'JARRETIERE'
    AND r_src.salle_id IS DISTINCT FROM r_dst.salle_id
)
UPDATE public.cables_fibre
SET type_lien = 'INTERNE',
    nom = regexp_replace(nom, '^Jarretière', 'Câble interne intersalle'),
    cable_reference = regexp_replace(cable_reference, '^JAR-', 'INT-')
WHERE id IN (SELECT id FROM intersalle_cables);

COMMIT;

-- ─── Vérification visuelle ───────────────────────────────────────────────────
SELECT 
  id,
  cable_reference,
  nom,
  type_lien
FROM public.cables_fibre
WHERE type_lien = 'INTERNE'
LIMIT 10;
