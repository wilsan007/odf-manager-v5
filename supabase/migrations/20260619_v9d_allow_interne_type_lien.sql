-- ═══════════════════════════════════════════════════════════════════════════════
-- ODF Manager V9d — Autoriser la valeur 'INTERNE' pour type_lien dans cables_fibre
--
-- Cette migration supprime la contrainte CHECK existante sur la table public.cables_fibre 
-- et la recrée pour autoriser 'INTERNE' en plus de 'EXTERNE', 'JARRETIERE' et 'EQUIPEMENT'.
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Supprimer la contrainte CHECK existante si elle existe
ALTER TABLE public.cables_fibre DROP CONSTRAINT IF EXISTS cables_fibre_type_lien_check;

-- 2. Recréer la contrainte avec la nouvelle valeur 'INTERNE'
ALTER TABLE public.cables_fibre ADD CONSTRAINT cables_fibre_type_lien_check 
  CHECK (type_lien IN ('EXTERNE', 'JARRETIERE', 'EQUIPEMENT', 'INTERNE'));

-- 3. Accorder les droits sur la table cables_fibre pour s'assurer du bon fonctionnement
GRANT ALL ON public.cables_fibre TO anon, authenticated, service_role;

COMMIT;
