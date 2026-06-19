-- ═══════════════════════════════════════════════════════════════════════════
-- ODF Manager V9e — Intégrité CID ↔ ports : suppression en cascade
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Problèmes identifiés :
--   1. Des ports sont marqués OCCUPE sans avoir de CID
--      → cause : la migration v20260615 marquait OCCUPE tout port relié
--        physiquement à un cables_fibre, sans exiger de CID
--   2. Des ports ont un CID qui n'existe plus dans la table services
--      → cause : le trigger fn_sync_ports_from_jonction (DELETE) fait un
--        SELECT cid FROM services WHERE id = OLD.service_id, mais lorsque
--        service_jonctions est supprimé par CASCADE (suite à DELETE service),
--        la ligne parent est déjà effacée → v_cid = NULL → WHERE cid = NULL
--        ne matche jamais en SQL → ports jamais libérés
--
-- Solution :
--   1. Nettoyage des données incohérentes existantes
--   2. Ajout d'une FK ports.cid → services.cid ON DELETE SET NULL
--      Combinée au trigger trg_ports_sync_statut_from_cid (v9c), cette FK
--      garantit qu'à la suppression d'un service tous ses ports sont libérés
--      automatiquement au niveau base de données (indépendant du code appli)
--   3. Correction du trigger fn_sync_ports_from_jonction : le DELETE libère
--      les ports directement par leur id, sans dépendre du service parent
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. NETTOYAGE DES DONNÉES INCOHÉRENTES
-- ─────────────────────────────────────────────────────────────────────────

-- 1a. Ports OCCUPE sans CID → un port ne peut être OCCUPE que s'il est
--     associé à un service via un CID
UPDATE public.ports
SET statut = 'LIBRE'
WHERE statut = 'OCCUPE'
  AND (cid IS NULL OR cid = '');

-- 1b. Ports avec CID orphelin (CID absent ou supprimé de la table services)
--     → le service a été supprimé mais les ports n'ont pas été nettoyés
UPDATE public.ports
SET statut = 'LIBRE', cid = NULL
WHERE cid IS NOT NULL
  AND cid <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.services s WHERE s.cid = public.ports.cid
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 2. CONTRAINTE FK : ports.cid → services.cid
--    ON DELETE SET NULL  : suppression service → ports.cid = NULL
--    ON UPDATE CASCADE   : si le CID d'un service change → ports mis à jour
--    Le trigger trg_ports_sync_statut_from_cid (v9c) capte le SET NULL
--    et positionne automatiquement statut = 'LIBRE'
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.ports DROP CONSTRAINT IF EXISTS fk_ports_cid_services;

ALTER TABLE public.ports
  ADD CONSTRAINT fk_ports_cid_services
  FOREIGN KEY (cid)
  REFERENCES public.services(cid)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. CORRECTION DU TRIGGER fn_sync_ports_from_jonction
--    Problème original dans le cas DELETE :
--      SELECT cid INTO v_cid FROM services WHERE id = OLD.service_id
--      → si le service parent est déjà supprimé (CASCADE), v_cid = NULL
--      → WHERE cid = NULL est toujours faux en SQL → ports jamais libérés
--    Correction : libérer les ports directement par leur id, sans lookup
--    du service parent.  La FK (étape 2) gère déjà le cid = NULL.
--    Correction aussi du cas UPDATE : utiliser IS DISTINCT FROM au lieu de
--    <> pour éviter les problèmes de comparaison avec NULL.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_sync_ports_from_jonction()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_cid TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT cid INTO v_cid FROM public.services WHERE id = NEW.service_id;

    IF NEW.port_entree_id IS NOT NULL THEN
      UPDATE public.ports SET statut = 'OCCUPE', cid = v_cid WHERE id = NEW.port_entree_id;
    END IF;
    IF NEW.port_sortie_id IS NOT NULL THEN
      UPDATE public.ports SET statut = 'OCCUPE', cid = v_cid WHERE id = NEW.port_sortie_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Libération directe par id : ne dépend pas du service encore existant
    -- (la FK fk_ports_cid_services gère le cid = NULL si le service est supprimé)
    IF OLD.port_entree_id IS NOT NULL THEN
      UPDATE public.ports
      SET statut = 'LIBRE', cid = NULL
      WHERE id = OLD.port_entree_id;
    END IF;
    IF OLD.port_sortie_id IS NOT NULL THEN
      UPDATE public.ports
      SET statut = 'LIBRE', cid = NULL
      WHERE id = OLD.port_sortie_id;
    END IF;
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    SELECT cid INTO v_cid FROM public.services WHERE id = NEW.service_id;

    -- Libérer les anciens ports (IS DISTINCT FROM gère les NULLs)
    IF OLD.port_entree_id IS DISTINCT FROM NEW.port_entree_id
       AND OLD.port_entree_id IS NOT NULL THEN
      UPDATE public.ports SET statut = 'LIBRE', cid = NULL WHERE id = OLD.port_entree_id;
    END IF;
    IF OLD.port_sortie_id IS DISTINCT FROM NEW.port_sortie_id
       AND OLD.port_sortie_id IS NOT NULL THEN
      UPDATE public.ports SET statut = 'LIBRE', cid = NULL WHERE id = OLD.port_sortie_id;
    END IF;

    -- Occuper les nouveaux ports
    IF NEW.port_entree_id IS NOT NULL THEN
      UPDATE public.ports SET statut = 'OCCUPE', cid = v_cid WHERE id = NEW.port_entree_id;
    END IF;
    IF NEW.port_sortie_id IS NOT NULL THEN
      UPDATE public.ports SET statut = 'OCCUPE', cid = v_cid WHERE id = NEW.port_sortie_id;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. DROITS
-- ─────────────────────────────────────────────────────────────────────────

GRANT ALL ON public.ports    TO anon, authenticated, service_role;
GRANT ALL ON public.services TO anon, authenticated, service_role;

COMMIT;
