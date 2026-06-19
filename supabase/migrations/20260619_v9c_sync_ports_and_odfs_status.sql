-- ═══════════════════════════════════════════════════════════════════════════
-- ODF Manager V9c — Synchronisation automatique Port statut <-> CID et ODF is_active
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Fonction pour synchroniser le statut du port à partir du CID (avant insertion/mise à jour)
CREATE OR REPLACE FUNCTION public.fn_ports_sync_statut_from_cid()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.cid IS NOT NULL AND NEW.cid <> '' THEN
    NEW.statut := 'OCCUPE';
  ELSE
    -- Si le CID est NULL ou vide, le statut redevient 'LIBRE' (sauf s'il était marqué 'MAUVAIS')
    IF NEW.statut = 'OCCUPE' OR NEW.statut IS NULL THEN
      NEW.statut := 'LIBRE';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ports_sync_statut_from_cid ON public.ports;

CREATE TRIGGER trg_ports_sync_statut_from_cid
  BEFORE INSERT OR UPDATE OF cid, statut ON public.ports
  FOR EACH ROW EXECUTE FUNCTION public.fn_ports_sync_statut_from_cid();


-- 2. Fonction pour synchroniser l'ODF parent à partir de ses ports (après insertion/mise à jour/suppression d'un port)
CREATE OR REPLACE FUNCTION public.fn_ports_sync_parent_odf()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_odf_id TEXT;
  v_latest_cid TEXT;
  v_has_occupied BOOLEAN;
BEGIN
  -- Déterminer quel ODF ID on traite
  IF TG_OP = 'DELETE' THEN
    v_odf_id := OLD.odf_id;
  ELSE
    v_odf_id := NEW.odf_id;
  END IF;

  IF v_odf_id IS NOT NULL THEN
    -- Récupérer le CID le plus récent d'un port de cet ODF
    SELECT cid INTO v_latest_cid
    FROM public.ports
    WHERE odf_id = v_odf_id AND cid IS NOT NULL AND cid <> ''
    ORDER BY updated_at DESC
    LIMIT 1;

    -- Vérifier s'il reste des ports occupés dans cet ODF
    SELECT EXISTS (
      SELECT 1 FROM public.ports
      WHERE odf_id = v_odf_id AND (statut = 'OCCUPE' OR (cid IS NOT NULL AND cid <> ''))
    ) INTO v_has_occupied;

    -- Mettre à jour l'état de l'ODF parent
    UPDATE public.odfs
    SET 
      is_active = v_has_occupied,
      cid = v_latest_cid
    WHERE id = v_odf_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_ports_sync_parent_odf ON public.ports;

CREATE TRIGGER trg_ports_sync_parent_odf
  AFTER INSERT OR UPDATE OF cid, statut, odf_id OR DELETE ON public.ports
  FOR EACH ROW EXECUTE FUNCTION public.fn_ports_sync_parent_odf();


-- 3. Synchronisation initiale des données existantes dans la base de données
-- 3.1. S'assurer que le statut de tous les ports concorde avec leur CID actuel
UPDATE public.ports
SET statut = CASE 
               WHEN cid IS NOT NULL AND cid <> '' THEN 'OCCUPE'::TEXT
               ELSE 'LIBRE'::TEXT
             END
WHERE (statut = 'OCCUPE' AND (cid IS NULL OR cid = '')) 
   OR (statut = 'LIBRE' AND cid IS NOT NULL AND cid <> '');

-- 3.2. Synchroniser les ODFs existants avec l'état de leurs ports
UPDATE public.odfs o
SET 
  is_active = COALESCE(t.has_occupied, FALSE),
  cid = t.latest_cid
FROM (
  SELECT 
    odf_id,
    EXISTS (
      SELECT 1 FROM public.ports p2
      WHERE p2.odf_id = p.odf_id AND (p2.statut = 'OCCUPE' OR (p2.cid IS NOT NULL AND p2.cid <> ''))
    ) AS has_occupied,
    (
      SELECT p3.cid FROM public.ports p3
      WHERE p3.odf_id = p.odf_id AND p3.cid IS NOT NULL AND p3.cid <> ''
      ORDER BY p3.updated_at DESC
      LIMIT 1
    ) AS latest_cid
  FROM public.ports p
  GROUP BY odf_id
) t
WHERE o.id = t.odf_id;

-- Réinitialiser les ODFs sans aucun port connecté ou vide
UPDATE public.odfs
SET is_active = FALSE, cid = NULL
WHERE id NOT IN (SELECT DISTINCT odf_id FROM public.ports WHERE odf_id IS NOT NULL);

GRANT ALL ON public.ports TO anon, authenticated, service_role;
GRANT ALL ON public.odfs TO anon, authenticated, service_role;
