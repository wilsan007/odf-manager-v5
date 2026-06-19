-- ═══════════════════════════════════════════════════════════════════════════
--  ODF Manager V7 — Schéma complet avec IDs lisibles + Génération automatique
--  Hiérarchie : Sites → Salles → Racks → ODFs → Slots → Ports
--  Convention IDs :
--    site  : 'RDK'
--    salle : 'RDK-S1'
--    rack  : 'RDK-R1'
--    odf   : 'RDK-R1-ODF1'
--    slot  : 'RDK-R1-ODF1_S01'
--    port  : 'RDK-R1-ODF1_S01P01'
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. NETTOYAGE (sécurisé : vérifie l'existence des tables avant DROP TRIGGER)
-- ───────────────────────────────────────────────────────────────────────────

-- 1a. DROP TRIGGERS conditionnels (ON table échoue si la table n'existe pas)
DO $$
DECLARE
  tbl TEXT;
  trg TEXT;
BEGIN
  FOR tbl, trg IN VALUES
    ('sites',       'trg_after_site_insert'),
    ('racks',       'trg_after_rack_insert'),
    ('odfs',        'trg_after_odf_insert'),
    ('slots',       'trg_after_slot_insert'),
    ('ports',       'trg_ports_updated_at'),
    ('cables_fibre','trg_cables_fibre_insert'),
    ('services',    'trg_service_capacity'),
    ('services',    'trg_service_cid')
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', trg, tbl);
    END IF;
  END LOOP;
END $$;

-- 1b. DROP FUNCTIONS CASCADE (supprime aussi les triggers restants)
DROP FUNCTION IF EXISTS fn_after_site_insert()       CASCADE;
DROP FUNCTION IF EXISTS fn_after_rack_insert()       CASCADE;
DROP FUNCTION IF EXISTS fn_after_odf_insert()        CASCADE;
DROP FUNCTION IF EXISTS fn_after_slot_insert()       CASCADE;
DROP FUNCTION IF EXISTS fn_set_updated_at()          CASCADE;
DROP FUNCTION IF EXISTS fn_auto_port_actif()         CASCADE;
DROP FUNCTION IF EXISTS fn_ensure_min_children(TEXT) CASCADE;
DROP FUNCTION IF EXISTS fn_service_capacity()        CASCADE;
DROP FUNCTION IF EXISTS fn_service_cid()             CASCADE;
DROP FUNCTION IF EXISTS fn_port_label(TEXT)          CASCADE;
DROP FUNCTION IF EXISTS fn_service_route(TEXT)       CASCADE;

-- 1c. DROP VIEW + TABLES (ordre inverse des FK)
DROP VIEW  IF EXISTS public.vue_routes_service  CASCADE;
DROP VIEW  IF EXISTS public.vue_interconnexions CASCADE;
DROP TABLE IF EXISTS public.history          CASCADE;
DROP TABLE IF EXISTS public.service_jonctions CASCADE;
DROP TABLE IF EXISTS public.services      CASCADE;
DROP TABLE IF EXISTS public.cables_fibre  CASCADE;
DROP TABLE IF EXISTS public.ports         CASCADE;
DROP TABLE IF EXISTS public.slots         CASCADE;
DROP TABLE IF EXISTS public.cassettes     CASCADE;
DROP TABLE IF EXISTS public.odfs          CASCADE;
DROP TABLE IF EXISTS public.racks         CASCADE;
DROP TABLE IF EXISTS public.salles        CASCADE;
DROP TABLE IF EXISTS public.sites         CASCADE;
DROP TABLE IF EXISTS public.clients       CASCADE;
DROP TABLE IF EXISTS public.fournisseurs  CASCADE;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. TABLES
-- ───────────────────────────────────────────────────────────────────────────

-- FOURNISSEURS  (opérateurs/propriétaires de capacité — ex. SEACOM, AAE1, WIOCC)
-- id  : code court, ex. 'SEACOM'
CREATE TABLE public.fournisseurs (
  id          TEXT PRIMARY KEY,
  nom         TEXT NOT NULL,
  type        TEXT,                 -- ex. 'Câble sous-marin', 'Terrestre'
  pays        TEXT,
  contact     TEXT,
  email       TEXT,
  telephone   TEXT,
  remarques   TEXT,
  cid         TEXT,                 -- dernier CID rattaché (propagé à la création d'un service)
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  TEXT,
  raison      TEXT
);

-- CLIENTS  (à qui le service est vendu — ex. MTN, Airtel, Vodafone)
-- id  : code court, ex. 'MTN'
CREATE TABLE public.clients (
  id          TEXT PRIMARY KEY,
  nom         TEXT NOT NULL,
  type        TEXT,                 -- ex. 'Opérateur', 'Entreprise', 'Data Center'
  contact     TEXT,
  email       TEXT,
  telephone   TEXT,
  remarques   TEXT,
  cid         TEXT,                 -- dernier CID rattaché (propagé à la création d'un service)
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  TEXT,
  raison      TEXT
);

-- SITES
-- id  : code court, ex. 'RDK', 'YAC'
CREATE TABLE public.sites (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  TEXT,
  raison      TEXT
);

-- SALLES
-- id  : '{site_id}-{name}', ex. 'RDK-S1'
CREATE TABLE public.salles (
  id          TEXT PRIMARY KEY,
  site_id     TEXT NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  TEXT,
  raison      TEXT,
  UNIQUE (site_id, name)
);

-- RACKS
-- id  : '{site_id}-{name}', ex. 'RDK-R1'
CREATE TABLE public.racks (
  id          TEXT PRIMARY KEY,
  site_id     TEXT NOT NULL REFERENCES public.sites(id)  ON DELETE CASCADE,
  salle_id    TEXT REFERENCES public.salles(id)          ON DELETE SET NULL,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  TEXT,
  raison      TEXT,
  UNIQUE (site_id, name)
);

-- ODFs
-- id  : '{rack_id}-{name}', ex. 'RDK-R1-ODF1'
CREATE TABLE public.odfs (
  id             TEXT PRIMARY KEY,
  rack_id        TEXT NOT NULL REFERENCES public.racks(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  odf_type       TEXT NOT NULL DEFAULT 'EXTERNE'
                   CHECK (odf_type IN ('EXTERNE','INTERNE')),
  is_active      BOOLEAN NOT NULL DEFAULT FALSE,
  odf_number     TEXT,
  route          TEXT,
  slots          INT  DEFAULT 6,
  ports_per_slot INT  DEFAULT 12,
  cid            TEXT,                 -- dernier CID traversant cet ODF
  activated_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_by     TEXT,
  raison         TEXT,
  UNIQUE (rack_id, name)
);

-- SLOTS  (= ancienne "cassette" V6, = groupement physique de 12 ports)
-- id  : '{odf_id}_S{NN}', ex. 'RDK-R1-ODF1_S01'
-- name: 'S01', 'S02', …
CREATE TABLE public.slots (
  id         TEXT PRIMARY KEY,
  odf_id     TEXT NOT NULL REFERENCES public.odfs(id) ON DELETE CASCADE,
  slot_num   INT  NOT NULL,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT,
  raison     TEXT,
  UNIQUE (odf_id, slot_num)
);

-- PORTS
-- id        : '{odf_id}_{slot_port}', ex. 'RDK-R1-ODF1_S01P01'
-- slot_port : 'S01P01' (slot + port)
-- slot      : numéro de slot (int)
-- port      : numéro de port dans le slot (int)
CREATE TABLE public.ports (
  id         TEXT PRIMARY KEY,
  slot_id    TEXT NOT NULL REFERENCES public.slots(id) ON DELETE CASCADE,
  odf_id     TEXT NOT NULL REFERENCES public.odfs(id)  ON DELETE CASCADE,
  slot_port  TEXT NOT NULL,
  slot       INT  NOT NULL,
  port       INT  NOT NULL,
  statut     TEXT NOT NULL DEFAULT 'LIBRE'
               CHECK (statut IN ('LIBRE','OCCUPE','MAUVAIS')),
  cid        TEXT,
  ot_num     TEXT,
  capacite   TEXT,
  owner      TEXT,
  destination TEXT,
  date_activ  TEXT,
  remarques   TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (odf_id, slot_port)
);

-- CÂBLES FIBRE  (câble physique porteur de capacité)
-- cable_reference         : ex. 'CBL-RDK-SEACOM-01'
-- capacite_totale_gbps    : capacité totale du câble (Gbps)
-- capacite_disponible_gbps: capacité restante, décrémentée par les services
CREATE TABLE public.cables_fibre (
  id                       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  cable_reference          TEXT UNIQUE NOT NULL,
  nom                      TEXT,
  fournisseur_id           TEXT REFERENCES public.fournisseurs(id) ON DELETE SET NULL,
  -- EXTERNE   : fibre inter-sites (porte de la capacité)
  -- JARRETIERE: cordon de brassage interne à un site (capacité 0)
  -- EQUIPEMENT: cross-connect via un équipement (CIENA/TEJAS…)
  type_lien                TEXT NOT NULL DEFAULT 'EXTERNE'
                             CHECK (type_lien IN ('EXTERNE','JARRETIERE','EQUIPEMENT')),
  type_fibre               TEXT DEFAULT 'Monomode'
                             CHECK (type_fibre IN ('Monomode','Multimode')),
  nombre_fibres            INT,
  route                    TEXT,
  capacite_totale_gbps     NUMERIC(12,2) NOT NULL DEFAULT 0,
  capacite_disponible_gbps NUMERIC(12,2) NOT NULL DEFAULT 0,
  port_source_id           TEXT REFERENCES public.ports(id) ON DELETE SET NULL,
  port_dest_id             TEXT REFERENCES public.ports(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_no_self_loop CHECK (port_source_id IS NULL OR port_dest_id IS NULL OR port_source_id <> port_dest_id),
  -- Garantit que la capacité disponible reste cohérente (0 ≤ dispo ≤ totale)
  CONSTRAINT chk_capacite CHECK (capacite_disponible_gbps >= 0 AND capacite_disponible_gbps <= capacite_totale_gbps)
);

-- Liens FK : un ODF / un port appartiennent à un câble physique
ALTER TABLE public.odfs  ADD COLUMN cable_id TEXT REFERENCES public.cables_fibre(id) ON DELETE SET NULL;
ALTER TABLE public.ports ADD COLUMN cable_id TEXT REFERENCES public.cables_fibre(id) ON DELETE SET NULL;

-- SERVICES  (capacité vendue à un client sur un câble, fournie par un fournisseur)
-- La capacité (capacite_gbps) est soustraite automatiquement de
-- cables_fibre.capacite_disponible_gbps via le trigger trg_service_capacity.
CREATE TABLE public.services (
  id              TEXT PRIMARY KEY,
  label           TEXT NOT NULL,
  cable_id        TEXT NOT NULL REFERENCES public.cables_fibre(id) ON DELETE RESTRICT,
  client_id       TEXT REFERENCES public.clients(id)       ON DELETE SET NULL,
  fournisseur_id  TEXT REFERENCES public.fournisseurs(id)  ON DELETE SET NULL,
  port_id         TEXT REFERENCES public.ports(id)         ON DELETE SET NULL,
  capacite_gbps   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (capacite_gbps >= 0),
  cid             TEXT UNIQUE,            -- auto-généré (DJT-YYYYMMDDHHMMSS) par trg_service_cid
  ot_num          TEXT,
  statut          TEXT NOT NULL DEFAULT 'ACTIF'
                    CHECK (statut IN ('ACTIF','SUSPENDU','RESILIE')),
  date_activ      DATE,
  remarques       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- SERVICE_JONCTIONS  (route ordonnée d'un service : liens traversés du départ au client final)
-- Chaque ligne = un saut (hop) : on entre par port_entree_id, on sort par port_sortie_id
-- en empruntant le lien cable_id (EXTERNE, JARRETIERE ou EQUIPEMENT).
-- Ces jonctions sont créées au moment de la création du service.
CREATE TABLE public.service_jonctions (
  id             BIGSERIAL PRIMARY KEY,
  service_id     TEXT NOT NULL REFERENCES public.services(id)     ON DELETE CASCADE,
  ordre          INT  NOT NULL,
  cable_id       TEXT REFERENCES public.cables_fibre(id)          ON DELETE SET NULL,
  port_entree_id TEXT REFERENCES public.ports(id)                 ON DELETE SET NULL,
  port_sortie_id TEXT REFERENCES public.ports(id)                 ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (service_id, ordre)
);

-- HISTORIQUE
CREATE TABLE public.history (
  id          BIGSERIAL PRIMARY KEY,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  user_email  TEXT,
  user_id     UUID,
  details     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
