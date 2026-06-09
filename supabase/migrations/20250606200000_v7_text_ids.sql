-- ═══════════════════════════════════════════════════════════════════════════
--  ODF Manager V7 — Schéma complet avec IDs lisibles + Génération automatique
--  Hiérarchie : Sites → Racks → ODFs → Slots → Ports
--  Convention IDs :
--    site  : 'RDK'
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

-- RACKS
-- id  : '{site_id}-{name}', ex. 'RDK-R1'
CREATE TABLE public.racks (
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
               CHECK (statut IN ('ACTIF','INTERNE','INCONNU','RÉSERVÉ','LIBRE')),
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

-- ───────────────────────────────────────────────────────────────────────────
-- 3. TRIGGERS : updated_at automatique sur ports
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ports_updated_at
  BEFORE UPDATE ON public.ports
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- 4. TRIGGERS : câble fibre → ports en ACTIF
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_auto_port_actif()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.ports SET statut = 'ACTIF', updated_at = NOW()
  WHERE id IN (NEW.port_source_id, NEW.port_dest_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cables_fibre_insert
  AFTER INSERT ON public.cables_fibre
  FOR EACH ROW EXECUTE FUNCTION fn_auto_port_actif();

-- ───────────────────────────────────────────────────────────────────────────
-- 5. TRIGGERS : génération automatique en cascade
--   site  → rack R1
--   rack  → ODF1
--   ODF   → slot S01
--   slot  → 12 ports
-- ───────────────────────────────────────────────────────────────────────────

-- 5a. Slot → 12 ports
CREATE OR REPLACE FUNCTION fn_after_slot_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  p INT;
  sp TEXT;
BEGIN
  FOR p IN 1..12 LOOP
    sp := NEW.name || 'P' || LPAD(p::TEXT, 2, '0');
    INSERT INTO public.ports (id, slot_id, odf_id, slot_port, slot, port, statut)
    VALUES (NEW.odf_id || '_' || sp, NEW.id, NEW.odf_id, sp, NEW.slot_num, p, 'LIBRE')
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_after_slot_insert
  AFTER INSERT ON public.slots
  FOR EACH ROW EXECUTE FUNCTION fn_after_slot_insert();

-- 5b. ODF → slot S01  (cascade → ports via 5a)
CREATE OR REPLACE FUNCTION fn_after_odf_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.slots (id, odf_id, slot_num, name)
  VALUES (NEW.id || '_S01', NEW.id, 1, 'S01')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_after_odf_insert
  AFTER INSERT ON public.odfs
  FOR EACH ROW EXECUTE FUNCTION fn_after_odf_insert();

-- 5c. Rack → ODF1  (cascade → slot via 5b → ports via 5a)
CREATE OR REPLACE FUNCTION fn_after_rack_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.odfs (id, rack_id, name, odf_type)
  VALUES (NEW.id || '-ODF1', NEW.id, 'ODF1', 'EXTERNE')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_after_rack_insert
  AFTER INSERT ON public.racks
  FOR EACH ROW EXECUTE FUNCTION fn_after_rack_insert();

-- 5d. Site → rack R1  (cascade → ODF via 5c → slot via 5b → ports via 5a)
CREATE OR REPLACE FUNCTION fn_after_site_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.racks (id, site_id, name)
  VALUES (NEW.id || '-R1', NEW.id, 'R1')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_after_site_insert
  AFTER INSERT ON public.sites
  FOR EACH ROW EXECUTE FUNCTION fn_after_site_insert();

-- ───────────────────────────────────────────────────────────────────────────
-- 5e. TRIGGER : gestion automatique de la capacité des câbles
--   INSERT service  → capacite_disponible -= capacite_gbps (bloque si < 0)
--   DELETE service  → capacite_disponible += capacite_gbps (plafonné à totale)
--   UPDATE service  → réajuste (changement de capacité et/ou de câble)
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_service_capacity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_dispo NUMERIC;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT capacite_disponible_gbps INTO v_dispo
      FROM public.cables_fibre WHERE id = NEW.cable_id FOR UPDATE;
    IF v_dispo IS NULL THEN
      RAISE EXCEPTION 'Câble % introuvable', NEW.cable_id;
    END IF;
    IF NEW.capacite_gbps > v_dispo THEN
      RAISE EXCEPTION 'Capacité insuffisante sur le câble % : demandé % Gbps, disponible % Gbps',
        NEW.cable_id, NEW.capacite_gbps, v_dispo;
    END IF;
    UPDATE public.cables_fibre
      SET capacite_disponible_gbps = capacite_disponible_gbps - NEW.capacite_gbps
      WHERE id = NEW.cable_id;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.cables_fibre
      SET capacite_disponible_gbps = LEAST(capacite_totale_gbps,
                                           capacite_disponible_gbps + OLD.capacite_gbps)
      WHERE id = OLD.cable_id;
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.cable_id = NEW.cable_id THEN
      -- même câble : on restitue l'ancienne conso puis on applique la nouvelle
      SELECT capacite_disponible_gbps + OLD.capacite_gbps INTO v_dispo
        FROM public.cables_fibre WHERE id = NEW.cable_id FOR UPDATE;
      IF NEW.capacite_gbps > v_dispo THEN
        RAISE EXCEPTION 'Capacité insuffisante sur le câble % : demandé % Gbps, disponible % Gbps',
          NEW.cable_id, NEW.capacite_gbps, v_dispo;
      END IF;
      UPDATE public.cables_fibre
        SET capacite_disponible_gbps = v_dispo - NEW.capacite_gbps
        WHERE id = NEW.cable_id;
    ELSE
      -- changement de câble : restituer sur l'ancien, consommer sur le nouveau
      UPDATE public.cables_fibre
        SET capacite_disponible_gbps = LEAST(capacite_totale_gbps,
                                             capacite_disponible_gbps + OLD.capacite_gbps)
        WHERE id = OLD.cable_id;
      SELECT capacite_disponible_gbps INTO v_dispo
        FROM public.cables_fibre WHERE id = NEW.cable_id FOR UPDATE;
      IF v_dispo IS NULL THEN
        RAISE EXCEPTION 'Câble % introuvable', NEW.cable_id;
      END IF;
      IF NEW.capacite_gbps > v_dispo THEN
        RAISE EXCEPTION 'Capacité insuffisante sur le câble % : demandé % Gbps, disponible % Gbps',
          NEW.cable_id, NEW.capacite_gbps, v_dispo;
      END IF;
      UPDATE public.cables_fibre
        SET capacite_disponible_gbps = v_dispo - NEW.capacite_gbps
        WHERE id = NEW.cable_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_service_capacity
  BEFORE INSERT OR UPDATE OR DELETE ON public.services
  FOR EACH ROW EXECUTE FUNCTION fn_service_capacity();

-- ───────────────────────────────────────────────────────────────────────────
-- 5f. TRIGGER : génération automatique du CID des services
--   Format harmonisé avec le reste de l'app : 'DJT-' || YYYYMMDDHH24MISS
--   (cf. src/components/ServicesManager.jsx → openNew()).
--   Si l'id du service n'est pas fourni, il prend la valeur du CID.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_service_cid()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_cid TEXT;
BEGIN
  IF NEW.cid IS NULL OR NEW.cid = '' THEN
    v_cid := 'DJT-' || to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISS');
    -- garantit l'unicité même en cas d'insertions dans la même seconde
    WHILE EXISTS (SELECT 1 FROM public.services WHERE cid = v_cid) LOOP
      v_cid := 'DJT-' || to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISS')
               || LPAD((floor(random()*100))::INT::TEXT, 2, '0');
    END LOOP;
    NEW.cid := v_cid;
  END IF;
  IF NEW.id IS NULL OR NEW.id = '' THEN
    NEW.id := NEW.cid;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_service_cid
  BEFORE INSERT ON public.services
  FOR EACH ROW EXECUTE FUNCTION fn_service_cid();

-- ───────────────────────────────────────────────────────────────────────────
-- 6. FONCTION utilitaire : garantir les enfants minimaux pour existants
--    Usage : SELECT fn_ensure_min_children('site'); -- ou 'rack', 'odf', 'slot'
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_ensure_min_children(p_level TEXT DEFAULT 'site')
RETURNS TABLE(created_entity TEXT, created_id TEXT) LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
  new_rack_id TEXT;
  new_odf_id  TEXT;
  new_slot_id TEXT;
  sp TEXT;
  p  INT;
BEGIN
  IF p_level = 'site' THEN
    FOR r IN SELECT id FROM public.sites LOOP
      new_rack_id := r.id || '-R1';
      INSERT INTO public.racks (id, site_id, name)
      VALUES (new_rack_id, r.id, 'R1')
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

-- ───────────────────────────────────────────────────────────────────────────
-- 7. VUE interconnexions
-- ───────────────────────────────────────────────────────────────────────────
CREATE VIEW public.vue_interconnexions AS
SELECT
  c.id            AS cable_id,
  c.cable_reference,
  c.type_fibre,
  src_si.name || '/' || src_ra.name || '/' || src_od.name || '/' ||
    src_sl.name || '/' || src_p.slot_port AS chemin_source,
  '⇌'::TEXT AS liaison,
  dst_si.name || '/' || dst_ra.name || '/' || dst_od.name || '/' ||
    dst_sl.name || '/' || dst_p.slot_port AS chemin_destination,
  c.created_at
FROM public.cables_fibre c
JOIN public.ports  src_p  ON c.port_source_id = src_p.id
JOIN public.slots  src_sl ON src_p.slot_id    = src_sl.id
JOIN public.odfs   src_od ON src_p.odf_id     = src_od.id
JOIN public.racks  src_ra ON src_od.rack_id   = src_ra.id
JOIN public.sites  src_si ON src_ra.site_id   = src_si.id
JOIN public.ports  dst_p  ON c.port_dest_id   = dst_p.id
JOIN public.slots  dst_sl ON dst_p.slot_id    = dst_sl.id
JOIN public.odfs   dst_od ON dst_p.odf_id     = dst_od.id
JOIN public.racks  dst_ra ON dst_od.rack_id   = dst_ra.id
JOIN public.sites  dst_si ON dst_ra.site_id   = dst_si.id;

-- ───────────────────────────────────────────────────────────────────────────
-- 7b. ROUTAGE DES SERVICES (route dynamique, retracée à la lecture)
-- ───────────────────────────────────────────────────────────────────────────

-- Étiquette lisible d'un port : ex. 'RDK/ODF1/S01P05'
CREATE OR REPLACE FUNCTION fn_port_label(p_port TEXT)
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT si.name || '/' || o.name || '/' || p.slot_port
  FROM public.ports p
  JOIN public.odfs  o  ON p.odf_id  = o.id
  JOIN public.racks r  ON o.rack_id = r.id
  JOIN public.sites si ON r.site_id = si.id
  WHERE p.id = p_port;
$$;

-- Route complète d'un service, reconstruite depuis ses jonctions ordonnées :
--   port_entree(hop1) → port_sortie(hop1) → port_sortie(hop2) → … → client final
CREATE OR REPLACE FUNCTION fn_service_route(p_service TEXT)
RETURNS TEXT LANGUAGE sql STABLE AS $$
  WITH ordered AS (
    SELECT ordre, port_entree_id, port_sortie_id
    FROM public.service_jonctions
    WHERE service_id = p_service
    ORDER BY ordre
  )
  SELECT COALESCE(
    (SELECT fn_port_label(port_entree_id) FROM ordered ORDER BY ordre LIMIT 1)
    || COALESCE(' → ' || (
         SELECT string_agg(fn_port_label(port_sortie_id), ' → ' ORDER BY ordre)
         FROM ordered
       ), ''),
    '—'
  );
$$;

-- Vue : une route lisible par service
CREATE OR REPLACE VIEW public.vue_routes_service AS
SELECT
  s.id            AS service_id,
  s.cid,
  s.label,
  s.capacite_gbps,
  cl.nom          AS client,
  fo.nom          AS fournisseur,
  fn_service_route(s.id) AS route,
  (SELECT COUNT(*) FROM public.service_jonctions j WHERE j.service_id = s.id) AS nb_jonctions,
  s.statut,
  s.created_at
FROM public.services s
LEFT JOIN public.clients      cl ON s.client_id      = cl.id
LEFT JOIN public.fournisseurs fo ON s.fournisseur_id = fo.id;

-- ───────────────────────────────────────────────────────────────────────────
-- 8. RLS (Row Level Security)
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.fournisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.racks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odfs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cables_fibre ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_jonctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON public.fournisseurs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.clients      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.sites        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.racks        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.odfs         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.slots        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.ports        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.cables_fibre FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.services     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.service_jonctions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.history      FOR ALL USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────────────────────────────────────
-- 9. DONNÉES DÉMO
-- ATTENTION : on insère uniquement les sites ; les triggers créent
--             automatiquement R1, ODF1, S01 et les 12 ports pour chacun.
--             Ensuite on insère les ODFs supplémentaires de Ras-Dika
--             et on peuple les ports réels via UPDATE.
-- ───────────────────────────────────────────────────────────────────────────

-- Fournisseurs (propriétaires de capacité)
INSERT INTO public.fournisseurs (id, nom, type, pays) VALUES
  ('SEACOM', 'SEACOM',  'Câble sous-marin', 'Afrique de l''Est'),
  ('AAE1',   'AAE1',    'Câble sous-marin', 'Asie-Afrique-Europe'),
  ('WIOCC',  'WIOCC',   'Opérateur de gros','Afrique'),
  ('EIG',    'EIG',     'Câble sous-marin', 'Europe-Inde')
ON CONFLICT (id) DO NOTHING;

-- Clients (à qui le service est vendu)
INSERT INTO public.clients (id, nom, type) VALUES
  ('MTN',    'MTN',       'Opérateur'),
  ('AIRTEL', 'Airtel',    'Opérateur'),
  ('VF',     'Vodafone',  'Opérateur'),
  ('CMI',    'CMI',       'Entreprise'),
  ('WINGU',  'Wingu',     'Data Center')
ON CONFLICT (id) DO NOTHING;

-- Sites (les triggers créent RDK-R1, RDK-R1-ODF1, RDK-R1-ODF1_S01, P01..P12)
INSERT INTO public.sites (id, name, description) VALUES
  ('RDK', 'Ras-Dika',  'Cable Landing Station (côté Mosquée)'),
  ('YAC', 'YAC',       'Site YAC — bâtiment côté ville'),
  ('HAR', 'Haramous',  'Station Haramous (via Siesta)'),
  ('DDC', 'DDC',       'Data Center Djibouti')
ON CONFLICT (id) DO NOTHING;

-- ODFs supplémentaires pour Ras-Dika (ODF2..ODF8 sur rack RDK-R1)
-- ODF1 a déjà été créé par le trigger du rack RDK-R1, on ajoute les autres
INSERT INTO public.odfs (id, rack_id, name, odf_type, route) VALUES
  ('RDK-R1-ODF1', 'RDK-R1', 'ODF1', 'EXTERNE', 'Ras-Dika ↔ YAC (côté Mosquée)'),
  ('RDK-R1-ODF2', 'RDK-R1', 'ODF2', 'EXTERNE', 'Ras-Dika → YAC — IODF CIENA'),
  ('RDK-R1-ODF3', 'RDK-R1', 'ODF3', 'INTERNE', 'Ras-Dika MMR ↔ ODF L2'),
  ('RDK-R1-ODF4', 'RDK-R1', 'ODF4', 'EXTERNE', 'Ras-Dika → YAC (BACK, Mosquée)'),
  ('RDK-R1-ODF5', 'RDK-R1', 'ODF5', 'EXTERNE', 'Ras-Dika ↔ Haramous (Siesta)'),
  ('RDK-R1-ODF6', 'RDK-R1', 'ODF6', 'EXTERNE', 'Ras-Dika → YAC-B (BACK cable)'),
  ('RDK-R1-ODF7', 'RDK-R1', 'ODF7', 'EXTERNE', 'Ras-Dika → YAC — Backhaul TEJAS'),
  ('RDK-R1-ODF8', 'RDK-R1', 'ODF8', 'EXTERNE', 'Ras-Dika ↔ Haramous — CIENA 2')
ON CONFLICT (id) DO UPDATE SET route = EXCLUDED.route, odf_type = EXCLUDED.odf_type;

-- Slots supplémentaires pour les ODFs Ras-Dika (S02..S06 pour chaque ODF)
-- S01 a été créé automatiquement par le trigger fn_after_odf_insert
INSERT INTO public.slots (id, odf_id, slot_num, name)
SELECT
  o.id || '_S' || LPAD(n::TEXT, 2, '0'),
  o.id,
  n,
  'S' || LPAD(n::TEXT, 2, '0')
FROM public.odfs o
CROSS JOIN generate_series(2, 6) AS n
WHERE o.rack_id = 'RDK-R1'
ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 10. PORTS RÉELS — mises à jour ODF1..ODF8
-- ───────────────────────────────────────────────────────────────────────────

-- ODF1
UPDATE public.ports SET statut='INTERNE', cid='LAN 1',         owner='DTT'                             WHERE id='RDK-R1-ODF1_S01P01';
UPDATE public.ports SET statut='INCONNU'                                                                WHERE id='RDK-R1-ODF1_S01P02';
UPDATE public.ports SET statut='INCONNU'                                                                WHERE id='RDK-R1-ODF1_S01P03';
UPDATE public.ports SET statut='INTERNE', cid='ISP-IP/DATA',   owner='DTT'                             WHERE id='RDK-R1-ODF1_S01P04';
UPDATE public.ports SET statut='ACTIF',   cid='DJT-22072025091210', ot_num='615', capacite='100G', owner='2AF/MTN',     destination='SEACOM' WHERE id='RDK-R1-ODF1_S01P05';
UPDATE public.ports SET statut='ACTIF',   cid='DJT-18092025114423', ot_num='621', capacite='100G', owner='VF/WIOCC',   destination='AAE1'  WHERE id='RDK-R1-ODF1_S01P06';
UPDATE public.ports SET statut='ACTIF',   cid='DJT-08092025103023', ot_num='627', capacite='100G', owner='VF',         destination='SEACOM' WHERE id='RDK-R1-ODF1_S01P07';
UPDATE public.ports SET statut='INTERNE', cid='IXP-DDC 100G',  owner='DTT'                             WHERE id='RDK-R1-ODF1_S01P08';
UPDATE public.ports SET statut='ACTIF',   cid='DJT-05112025155228', ot_num='632', capacite='100G', owner='2AF/AIRTEL', destination='SEACOM' WHERE id='RDK-R1-ODF1_S02P11';
UPDATE public.ports SET statut='ACTIF',   cid='DJT-16102025092520', ot_num='623', capacite='100G', owner='2AF/VF',     destination='SEACOM' WHERE id='RDK-R1-ODF1_S04P01';

-- ODF2
UPDATE public.ports SET statut='ACTIF', cid='DJT-03122024085532', ot_num='554', capacite='100G', owner='VF/WIOCC',  destination='DDC'    WHERE id='RDK-R1-ODF2_S01P01';
UPDATE public.ports SET statut='ACTIF', cid='DJT-05112025155741', ot_num='633', capacite='100G', owner='2AF/AIRTEL',destination='SEACOM' WHERE id='RDK-R1-ODF2_S01P02';
UPDATE public.ports SET statut='ACTIF', cid='DJT-06032025104529', ot_num='529', capacite='100G', owner='VF/WINGU',  destination='WINGU'  WHERE id='RDK-R1-ODF2_S01P03';
UPDATE public.ports SET statut='ACTIF', cid='DJT-27022025100033', ot_num='530', capacite='100G', owner='VF/WINGU',  destination='WINGU'  WHERE id='RDK-R1-ODF2_S01P04';
UPDATE public.ports SET statut='ACTIF', cid='DJT-03122024092607', ot_num='531', capacite='100G', owner='VF/WIOCC',  destination='DDC'    WHERE id='RDK-R1-ODF2_S01P05';
UPDATE public.ports SET statut='ACTIF', cid='DJT-09072024172147', ot_num='424', capacite='100G', owner='VF',        destination='WINGU'  WHERE id='RDK-R1-ODF2_S01P07';
UPDATE public.ports SET statut='ACTIF', cid='DJT-09072024172628', ot_num='425', capacite='100G', owner='VF',        destination='WINGU'  WHERE id='RDK-R1-ODF2_S01P08';
UPDATE public.ports SET statut='ACTIF', cid='DJT-20082024092642', ot_num='433', capacite='10G',  owner='VF/SILVER', destination='DDC'    WHERE id='RDK-R1-ODF2_S02P01';
UPDATE public.ports SET statut='ACTIF', cid='DJT-20082024092952', ot_num='434', capacite='10G',  owner='VF/SILVER', destination='DDC'    WHERE id='RDK-R1-ODF2_S02P02';
UPDATE public.ports SET statut='ACTIF', cid='DJT-15012025153824', ot_num='536', capacite='10G',  owner='AIRTEL',    destination='EIG'    WHERE id='RDK-R1-ODF2_S02P07';
UPDATE public.ports SET statut='ACTIF', cid='DJT-28012025145313', ot_num='541', capacite='10G',  owner='MTN',       destination='DDC'    WHERE id='RDK-R1-ODF2_S03P01';
UPDATE public.ports SET statut='ACTIF', cid='DJT-19052025144325', ot_num='583', capacite='10G',  owner='MTN',       destination='DDC'    WHERE id='RDK-R1-ODF2_S03P02';

-- ODF3 (INTERNE)
UPDATE public.ports SET statut='INTERNE', cid='BACKBONE-1',  owner='DTT' WHERE id='RDK-R1-ODF3_S01P01';
UPDATE public.ports SET statut='INTERNE', cid='BACKBONE-2',  owner='DTT' WHERE id='RDK-R1-ODF3_S01P02';
UPDATE public.ports SET statut='INTERNE', cid='CIENA-RDK-1', owner='DTT' WHERE id='RDK-R1-ODF3_S01P03';
UPDATE public.ports SET statut='INTERNE', cid='CIENA-RDK-2', owner='DTT' WHERE id='RDK-R1-ODF3_S01P04';
UPDATE public.ports SET statut='INCONNU'                                  WHERE id='RDK-R1-ODF3_S01P05';
UPDATE public.ports SET statut='INCONNU'                                  WHERE id='RDK-R1-ODF3_S01P06';

-- ODF8
UPDATE public.ports SET statut='ACTIF', cid='DJT-03033035101141', ot_num='OT-000565', capacite='100G', owner='2AF/VF/WIOCC', destination='DDC'  WHERE id='RDK-R1-ODF8_S01P01';
UPDATE public.ports SET statut='ACTIF', cid='DJT-22052025122110', ot_num='OT-000563', capacite='100G', owner='2AF/MTN'                          WHERE id='RDK-R1-ODF8_S01P02';
UPDATE public.ports SET statut='ACTIF', cid='DJT-22072025090632', ot_num='OT-000586',                  owner='2AF/MTN'                          WHERE id='RDK-R1-ODF8_S01P03';
UPDATE public.ports SET statut='ACTIF', cid='DJT-12012023143045', ot_num='OT-000552',                  owner='2AF/CMCC'                         WHERE id='RDK-R1-ODF8_S01P04';
UPDATE public.ports SET statut='ACTIF', cid='OT-000679',          ot_num='OT-000679',                  owner='2AF/WIOCC'                        WHERE id='RDK-R1-ODF8_S01P05';
UPDATE public.ports SET statut='ACTIF', cid='OT-000680',          ot_num='OT-000680',                  owner='2AF/WIOCC'                        WHERE id='RDK-R1-ODF8_S01P06';
UPDATE public.ports SET statut='ACTIF', cid='OT-000681',          ot_num='OT-000681',                  owner='2AF/WIOCC'                        WHERE id='RDK-R1-ODF8_S01P07';
UPDATE public.ports SET statut='ACTIF', cid='OT-000682',          ot_num='OT-000682',                  owner='2AF/WIOCC'                        WHERE id='RDK-R1-ODF8_S01P08';
UPDATE public.ports SET statut='ACTIF', cid='DJT-03082025150002', ot_num='OT-000594',                  owner='2AF/VF/CTG'                       WHERE id='RDK-R1-ODF8_S02P01';
UPDATE public.ports SET statut='ACTIF', cid='DJT-11112025085042', ot_num='OT-000639',                  owner='2AF/CMI'                          WHERE id='RDK-R1-ODF8_S02P04';
UPDATE public.ports SET statut='ACTIF', cid='DJT-22012026090237', ot_num='OT-000683',                  owner='2AF/WIOCC'                        WHERE id='RDK-R1-ODF8_S02P05';
UPDATE public.ports SET statut='ACTIF', cid='DJT-10022026013546', ot_num='OT-000715',                  owner='2AF/MTN'                          WHERE id='RDK-R1-ODF8_S02P06';
UPDATE public.ports SET statut='ACTIF', cid='DJT-14042026135807', ot_num='OT-000717',                  owner='2AF/CMI'                          WHERE id='RDK-R1-ODF8_S02P07';
UPDATE public.ports SET statut='ACTIF', cid='DJT-14042026140240', ot_num='OT-000718',                  owner='2AF/CCMC'                         WHERE id='RDK-R1-ODF8_S02P08';

-- ───────────────────────────────────────────────────────────────────────────
-- 10b. CÂBLES FIBRE (capacité) + liens ODF/PORT
--   On initialise capacite_disponible = capacite_totale ; les services
--   décrémenteront automatiquement la capacité disponible via le trigger.
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO public.cables_fibre
  (id, cable_reference, nom, fournisseur_id, type_fibre, nombre_fibres, route,
   capacite_totale_gbps, capacite_disponible_gbps, port_source_id) VALUES
  ('CBL-SEACOM-01', 'CBL-RDK-SEACOM-01', 'Ras-Dika ↔ SEACOM', 'SEACOM', 'Monomode', 144, 'Ras-Dika → SEACOM', 400, 400, 'RDK-R1-ODF1_S01P05'),
  ('CBL-AAE1-01',   'CBL-RDK-AAE1-01',   'Ras-Dika ↔ AAE1',   'AAE1',   'Monomode', 96,  'Ras-Dika → AAE1',   300, 300, 'RDK-R1-ODF1_S01P06'),
  ('CBL-WIOCC-01',  'CBL-RDK-WIOCC-01',  'Ras-Dika ↔ DDC',    'WIOCC',  'Monomode', 48,  'Ras-Dika → DDC',    200, 200, 'RDK-R1-ODF2_S01P01')
ON CONFLICT (id) DO NOTHING;

-- Lier les ODFs et ports concernés aux câbles physiques (FK)
UPDATE public.odfs  SET cable_id = 'CBL-SEACOM-01' WHERE id = 'RDK-R1-ODF1';
UPDATE public.odfs  SET cable_id = 'CBL-WIOCC-01'  WHERE id = 'RDK-R1-ODF2';
UPDATE public.ports SET cable_id = 'CBL-SEACOM-01' WHERE id = 'RDK-R1-ODF1_S01P05';
UPDATE public.ports SET cable_id = 'CBL-AAE1-01'   WHERE id = 'RDK-R1-ODF1_S01P06';
UPDATE public.ports SET cable_id = 'CBL-WIOCC-01'  WHERE id = 'RDK-R1-ODF2_S01P01';

-- Liens de routage pour la démo multi-sites (RDK → YAC → HAR)
--   2 liens EXTERNE (porteurs de capacité) + 1 JARRETIERE interne à YAC (capacité 0)
INSERT INTO public.cables_fibre
  (id, cable_reference, nom, type_lien, fournisseur_id, type_fibre, route,
   capacite_totale_gbps, capacite_disponible_gbps, port_source_id, port_dest_id) VALUES
  ('CBL-RDK-YAC', 'CBL-RDK-YAC-01', 'Ras-Dika ↔ YAC', 'EXTERNE', 'WIOCC', 'Monomode', 'Ras-Dika → YAC',
     200, 200, 'RDK-R1-ODF1_S01P07', 'YAC-R1-ODF1_S01P01'),
  ('JAR-YAC-01',  'JAR-YAC-01',     'Brassage YAC ODF1', 'JARRETIERE', NULL, 'Monomode', 'Brassage interne YAC',
     0, 0, 'YAC-R1-ODF1_S01P01', 'YAC-R1-ODF1_S01P02'),
  ('CBL-YAC-HAR', 'CBL-YAC-HAR-01', 'YAC ↔ Haramous', 'EXTERNE', 'AAE1', 'Monomode', 'YAC → Haramous',
     200, 200, 'YAC-R1-ODF1_S01P02', 'HAR-R1-ODF1_S01P01')
ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 10c. SERVICES démo (déclenchent la soustraction de capacité)
--   SEACOM : 400 - 100 = 300 dispo
--   AAE1   : 300 - 100 = 200 dispo
--   WIOCC  : 200 - 10  = 190 dispo
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO public.services
  (id, label, cable_id, client_id, fournisseur_id, port_id, capacite_gbps, cid, ot_num, statut) VALUES
  ('SVC-0001', 'Transit IP SEACOM 100G', 'CBL-SEACOM-01', 'MTN',    'SEACOM', 'RDK-R1-ODF1_S01P05', 100, 'DJT-22072025091210', '615', 'ACTIF'),
  ('SVC-0002', 'Capacité AAE1 100G',     'CBL-AAE1-01',   'VF',     'AAE1',   'RDK-R1-ODF1_S01P06', 100, 'DJT-18092025114423', '621', 'ACTIF'),
  ('SVC-0003', 'Liaison DDC 10G',        'CBL-WIOCC-01',  'AIRTEL', 'WIOCC',  'RDK-R1-ODF2_S01P01', 10,  'DJT-03122024085532', '554', 'ACTIF')
ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 10d. SERVICE MULTI-SITES + JONCTIONS (démo du routage dynamique)
--   Service traversant RDK → YAC → HAR. La capacité (40G) est débitée sur le
--   câble primaire (cable_id = CBL-RDK-YAC). Les jonctions décrivent le chemin
--   complet jusqu'au client final ; fn_service_route() le reconstruit à la lecture.
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO public.services
  (id, label, cable_id, client_id, fournisseur_id, port_id, capacite_gbps, cid, ot_num, statut) VALUES
  ('SVC-0004', 'Liaison MTN multi-sites RDK→HAR', 'CBL-RDK-YAC', 'MTN', 'WIOCC', 'RDK-R1-ODF1_S01P07', 40, 'DJT-06062026043300', '700', 'ACTIF')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.service_jonctions (service_id, ordre, cable_id, port_entree_id, port_sortie_id) VALUES
  ('SVC-0004', 1, 'CBL-RDK-YAC', 'RDK-R1-ODF1_S01P07', 'YAC-R1-ODF1_S01P01'),
  ('SVC-0004', 2, 'JAR-YAC-01',  'YAC-R1-ODF1_S01P01', 'YAC-R1-ODF1_S01P02'),
  ('SVC-0004', 3, 'CBL-YAC-HAR', 'YAC-R1-ODF1_S01P02', 'HAR-R1-ODF1_S01P01')
ON CONFLICT (service_id, ordre) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 11. VÉRIFICATION
-- ───────────────────────────────────────────────────────────────────────────
SELECT 'fournisseurs' AS tbl, COUNT(*)::TEXT AS valeur FROM public.fournisseurs
UNION ALL SELECT 'clients',  COUNT(*)::TEXT FROM public.clients
UNION ALL SELECT 'sites',    COUNT(*)::TEXT FROM public.sites
UNION ALL SELECT 'racks',    COUNT(*)::TEXT FROM public.racks
UNION ALL SELECT 'odfs',     COUNT(*)::TEXT FROM public.odfs
UNION ALL SELECT 'slots',    COUNT(*)::TEXT FROM public.slots
UNION ALL SELECT 'ports',    COUNT(*)::TEXT FROM public.ports
UNION ALL SELECT 'cables',   COUNT(*)::TEXT FROM public.cables_fibre
UNION ALL SELECT 'services', COUNT(*)::TEXT FROM public.services
UNION ALL SELECT 'jonctions',COUNT(*)::TEXT FROM public.service_jonctions
ORDER BY 1;

-- Vérification capacité des câbles après services démo
SELECT id, type_lien, capacite_totale_gbps, capacite_disponible_gbps,
       (capacite_totale_gbps - capacite_disponible_gbps) AS capacite_utilisee
FROM public.cables_fibre ORDER BY id;

-- Vérification du routage dynamique des services (route reconstruite)
SELECT service_id, cid, label, client, route, nb_jonctions
FROM public.vue_routes_service ORDER BY service_id;
