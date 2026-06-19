-- ═══════════════════════════════════════════════════════════════════════════
-- ODF Manager V9b — Vue agrégée des statistiques par site
--
-- Remplace l'usage de getPortsFlat() dans le dashboard, qui était limité
-- à 1000 lignes par PostgREST (max_rows), causant des comptages tronqués
-- pour les sites Epsilon et Zeta.
-- Cette vue retourne 1 ligne par site (agrégation serveur) et contourne
-- donc entièrement la limite max_rows.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.vue_stats_par_site AS
SELECT
  s.id          AS site_id,
  s.name        AS site_name,
  s.description AS site_description,
  COUNT(DISTINCT r.id)                                              AS nb_racks,
  COUNT(DISTINCT o.id)                                             AS nb_odfs,
  COUNT(DISTINCT p.id)                                             AS nb_ports,
  COUNT(DISTINCT CASE WHEN p.statut = 'OCCUPE' THEN p.id END)     AS nb_actifs
FROM public.sites s
LEFT JOIN public.racks r  ON r.site_id  = s.id
LEFT JOIN public.odfs  o  ON o.rack_id  = r.id
LEFT JOIN public.ports p  ON p.odf_id   = o.id
GROUP BY s.id, s.name, s.description;

GRANT SELECT ON public.vue_stats_par_site TO anon, authenticated;
