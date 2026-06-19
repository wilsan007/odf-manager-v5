-- ═══════════════════════════════════════════════════════════════════════════
-- ODF Manager V8b — Vue helper vue_cables_inter_sites
--
-- À exécuter APRÈS la migration V8 corrigée.
-- Crée (ou recrée) la vue utilisée par getCablesInterSites() dans l'app.
-- ═══════════════════════════════════════════════════════════════════════════

-- Vue simplifiée pour le wizard de routage côté application.
-- Expose directement site_source et site_dest en extrayant le préfixe
-- du port_id (convention : port.id = '{site}-...' → split_part(...,'-',1)).
CREATE OR REPLACE VIEW public.vue_cables_inter_sites AS
SELECT
  c.id,
  c.cable_reference,
  c.nom,
  c.fournisseur_id,
  f.nom                                        AS fournisseur_nom,
  c.capacite_totale_gbps,
  c.capacite_disponible_gbps,
  c.port_source_id,
  c.port_dest_id,
  split_part(c.port_source_id, '-', 1)         AS site_source,
  split_part(c.port_dest_id,   '-', 1)         AS site_dest,
  src.statut                                   AS statut_source,
  dst.statut                                   AS statut_dest,
  src.slot_port                                AS slot_port_source,
  dst.slot_port                                AS slot_port_dest
FROM public.cables_fibre c
JOIN public.ports src ON c.port_source_id = src.id
JOIN public.ports dst ON c.port_dest_id   = dst.id
LEFT JOIN public.fournisseurs f ON c.fournisseur_id = f.id
WHERE c.type_lien = 'EXTERNE';

-- RLS
ALTER VIEW public.vue_cables_inter_sites OWNER TO postgres;

-- ─── Vérification ────────────────────────────────────────────────────────────
-- SELECT site_source, site_dest, COUNT(*) AS nb_cables,
--        SUM(capacite_disponible_gbps)    AS capacite_dispo_totale
-- FROM   vue_cables_inter_sites
-- GROUP  BY site_source, site_dest
-- ORDER  BY site_source;
--
-- Résultat attendu (anneau RDK-YAC-HAR-DDC) :
--   DDC | RDK | 12 | 4800
--   HAR | DDC | 12 | 4800
--   RDK | YAC | 12 | 4800
--   YAC | HAR | 12 | 4800
