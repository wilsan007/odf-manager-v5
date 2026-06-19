-- ───────────────────────────────────────────────────────────────────────────
-- 1. TRIGGERS : Synchronisation automatique des ports avec les services
-- ───────────────────────────────────────────────────────────────────────────

-- Trigger sur la table services
CREATE OR REPLACE FUNCTION fn_sync_ports_from_service()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.ports
    SET statut = 'OCCUPE', cid = NEW.cid
    WHERE id = NEW.port_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.ports
    SET statut = 'LIBRE', cid = NULL
    WHERE cid = OLD.cid;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.port_id <> NEW.port_id OR OLD.cid <> NEW.cid THEN
      -- Libérer l'ancien port
      UPDATE public.ports
      SET statut = 'LIBRE', cid = NULL
      WHERE id = OLD.port_id AND cid = OLD.cid;
      
      -- Occuper le nouveau port
      UPDATE public.ports
      SET statut = 'OCCUPE', cid = NEW.cid
      WHERE id = NEW.port_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ports_from_service ON public.services;
CREATE TRIGGER trg_sync_ports_from_service
  AFTER INSERT OR UPDATE OR DELETE ON public.services
  FOR EACH ROW EXECUTE FUNCTION fn_sync_ports_from_service();


-- Trigger sur la table service_jonctions
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
    SELECT cid INTO v_cid FROM public.services WHERE id = OLD.service_id;
    
    IF OLD.port_entree_id IS NOT NULL THEN
      UPDATE public.ports SET statut = 'LIBRE', cid = NULL WHERE id = OLD.port_entree_id AND cid = v_cid;
    END IF;
    IF OLD.port_sortie_id IS NOT NULL THEN
      UPDATE public.ports SET statut = 'LIBRE', cid = NULL WHERE id = OLD.port_sortie_id AND cid = v_cid;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT cid INTO v_cid FROM public.services WHERE id = NEW.service_id;
    
    -- Libérer les anciens ports
    IF OLD.port_entree_id <> NEW.port_entree_id AND OLD.port_entree_id IS NOT NULL THEN
      UPDATE public.ports SET statut = 'LIBRE', cid = NULL WHERE id = OLD.port_entree_id AND cid = v_cid;
    END IF;
    IF OLD.port_sortie_id <> NEW.port_sortie_id AND OLD.port_sortie_id IS NOT NULL THEN
      UPDATE public.ports SET statut = 'LIBRE', cid = NULL WHERE id = OLD.port_sortie_id AND cid = v_cid;
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

DROP TRIGGER IF EXISTS trg_sync_ports_from_jonction ON public.service_jonctions;
CREATE TRIGGER trg_sync_ports_from_jonction
  AFTER INSERT OR UPDATE OR DELETE ON public.service_jonctions
  FOR EACH ROW EXECUTE FUNCTION fn_sync_ports_from_jonction();

-- ───────────────────────────────────────────────────────────────────────────
-- 2. NETTOYAGE ET RECALCUL DU STATUT ET DU CID DES PORTS (One-Time Execution)
-- ───────────────────────────────────────────────────────────────────────────

-- Réinitialisation par défaut
UPDATE public.ports SET statut = 'LIBRE', cid = NULL;

-- Occuper les ports reliés par un câble physique (inter-sites ou jarretières)
UPDATE public.ports p
SET statut = 'OCCUPE'
FROM public.cables_fibre c
WHERE p.id = c.port_source_id OR p.id = c.port_dest_id;

-- Mettre à jour les ports associés directement à des services
UPDATE public.ports p
SET statut = 'OCCUPE', cid = s.cid
FROM public.services s
WHERE p.id = s.port_id;

-- Mettre à jour les ports associés à des jonctions de services
UPDATE public.ports p
SET statut = 'OCCUPE', cid = s.cid
FROM public.service_jonctions j
JOIN public.services s ON j.service_id = s.id
WHERE p.id = j.port_entree_id OR p.id = j.port_sortie_id;
