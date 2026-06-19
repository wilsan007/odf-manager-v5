-- ═══════════════════════════════════════════════════════════════════════════
-- ODF Manager V9f — Suppression de la gestion de capacité + Création de service atomique (RPC)
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. SUPPRESSION DE LA GESTION ET VÉRIFICATION DE LA CAPACITÉ
-- ─────────────────────────────────────────────────────────────────────────

-- Suppression des triggers de capacité sur la table services
DROP TRIGGER IF EXISTS trg_service_capacity ON public.services CASCADE;
DROP FUNCTION IF EXISTS public.fn_service_capacity() CASCADE;

-- Supprimer également les contraintes ou colonnes de capacité si nécessaire,
-- mais nous les laissons à 0 ou par défaut pour éviter de casser la compatibilité du modèle.


-- ─────────────────────────────────────────────────────────────────────────
-- 2. NETTOYAGE DES PORTS INCOHÉRENTS (OCCUPE sans CID)
-- ─────────────────────────────────────────────────────────────────────────

-- Tout port à l'état OCCUPE qui n'a pas de CID valide ou vide doit être libéré
UPDATE public.ports
SET statut = 'LIBRE', cid = NULL
WHERE statut = 'OCCUPE' AND (cid IS NULL OR cid = '');


-- ─────────────────────────────────────────────────────────────────────────
-- 3. CRÉATION DU SERVICE ATOMIQUE (RPC)
--    Pour éviter les échecs partiels (Étape 4) où le service est créé puis
--    supprimé mais laisse les ports occupés ou vice-versa.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_service_with_jonctions_atomic(
  p_service_id TEXT,
  p_cid TEXT,
  p_label TEXT,
  p_cable_id TEXT,
  p_client_id TEXT,
  p_fournisseur_id TEXT,
  p_port_id TEXT,
  p_jonctions JSONB,
  p_history_action TEXT
) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_jonction RECORD;
  v_final_cid TEXT := p_cid;
BEGIN
  -- A. Générer un CID si non fourni
  IF v_final_cid IS NULL OR v_final_cid = '' THEN
    v_final_cid := 'DJT-' || to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISS');
    WHILE EXISTS (SELECT 1 FROM public.services WHERE cid = v_final_cid) LOOP
      v_final_cid := 'DJT-' || to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISS')
                     || LPAD((floor(random()*100))::INT::TEXT, 2, '0');
    END LOOP;
  END IF;

  -- B. Créer le Service
  INSERT INTO public.services (id, cid, label, cable_id, client_id, fournisseur_id, port_id, capacite_gbps, statut)
  VALUES (
    p_service_id, 
    v_final_cid, 
    p_label, 
    p_cable_id, 
    p_client_id, 
    p_fournisseur_id, 
    p_port_id, 
    0, -- Capacité forcée à 0 (gestion capacité supprimée)
    'ACTIF'
  );

  -- C. Insérer les Jonctions de Service (s'il y en a)
  IF p_jonctions IS NOT NULL AND jsonb_array_length(p_jonctions) > 0 THEN
    FOR v_jonction IN SELECT * FROM jsonb_to_recordset(p_jonctions) 
      AS x(ordre INT, cable_id TEXT, port_entree_id TEXT, port_sortie_id TEXT)
    LOOP
      INSERT INTO public.service_jonctions (service_id, ordre, cable_id, port_entree_id, port_sortie_id)
      VALUES (p_service_id, v_jonction.ordre, v_jonction.cable_id, v_jonction.port_entree_id, v_jonction.port_sortie_id);
      
      -- D. Occuper les ports de la jonction avec le bon CID
      IF v_jonction.port_entree_id IS NOT NULL THEN
        UPDATE public.ports SET statut = 'OCCUPE', cid = v_final_cid WHERE id = v_jonction.port_entree_id;
      END IF;
      IF v_jonction.port_sortie_id IS NOT NULL THEN
        UPDATE public.ports SET statut = 'OCCUPE', cid = v_final_cid WHERE id = v_jonction.port_sortie_id;
      END IF;
    END LOOP;
  END IF;

  -- E. Assurer l'occupation du port d'entrée principal avec le bon CID
  IF p_port_id IS NOT NULL THEN
    UPDATE public.ports SET statut = 'OCCUPE', cid = v_final_cid WHERE id = p_port_id;
  END IF;

  -- F. Ajouter l'historique
  IF p_history_action IS NOT NULL AND p_history_action <> '' THEN
    INSERT INTO public.history (action, entity_type, entity_id)
    VALUES (p_history_action, 'service', p_service_id);
  END IF;

  RETURN p_service_id;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur de n'importe quelle instruction, toute la transaction SQL est annulée (rollback)
    -- Aucun service n'est créé et aucun port n'est modifié de manière incohérente.
    RAISE EXCEPTION 'Erreur de transaction lors de la création du service : %', SQLERRM;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────
-- 4. DROITS ET PERMISSIONS
-- ─────────────────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.create_service_with_jonctions_atomic(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO anon, authenticated, service_role;

COMMIT;
