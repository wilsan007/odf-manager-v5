
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
-- 4. TRIGGERS : câble fibre → ports en OCCUPE
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_auto_port_actif()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.ports SET statut = 'OCCUPE', updated_at = NOW()
  WHERE id IN (NEW.port_source_id, NEW.port_dest_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cables_fibre_insert
  AFTER INSERT ON public.cables_fibre
  FOR EACH ROW EXECUTE FUNCTION fn_auto_port_actif();

-- ───────────────────────────────────────────────────────────────────────────
-- 5a. Slot → 12 ports
-- ───────────────────────────────────────────────────────────────────────────
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
-- 4. TRIGGERS : câble fibre → ports en OCCUPE
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_auto_port_actif()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.ports SET statut = 'OCCUPE', updated_at = NOW()
  WHERE id IN (NEW.port_source_id, NEW.port_dest_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cables_fibre_insert
  AFTER INSERT ON public.cables_fibre
  FOR EACH ROW EXECUTE FUNCTION fn_auto_port_actif();

-- ───────────────────────────────────────────────────────────────────────────
-- 5a. Slot → 12 ports
-- ───────────────────────────────────────────────────────────────────────────
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

-- ───────────────────────────────────────────────────────────────────────────
-- 5b. ODF → slot S01  (cascade → ports via 5a)
-- ───────────────────────────────────────────────────────────────────────────
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

-- ───────────────────────────────────────────────────────────────────────────
-- 5c. Rack → ODF1  (cascade → slot via 5b → ports via 5a)
-- ───────────────────────────────────────────────────────────────────────────
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

-- ───────────────────────────────────────────────────────────────────────────
-- 5d. Site → salle S1 → rack R1
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_after_site_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_salle_id TEXT;
BEGIN
  v_salle_id := NEW.id || '-S1';
  INSERT INTO public.salles (id, site_id, name)
  VALUES (v_salle_id, NEW.id, 'S1')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.racks (id, site_id, salle_id, name)
  VALUES (NEW.id || '-S1-R1', NEW.id, v_salle_id, 'R1')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_after_site_insert
  AFTER INSERT ON public.sites
  FOR EACH ROW EXECUTE FUNCTION fn_after_site_insert();

-- ───────────────────────────────────────────────────────────────────────────
-- 5e. Gestion automatique de la capacité des câbles
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
-- 5f. Génération automatique du CID des services
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_service_cid()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_cid TEXT;
BEGIN
  IF NEW.cid IS NULL OR NEW.cid = '' THEN
    v_cid := 'DJT-' || to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISS');
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
-- 6. Fonction utilitaire : garantir les enfants minimaux pour existants
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_ensure_min_children(p_level TEXT DEFAULT 'site')
RETURNS TABLE(created_entity TEXT, created_id TEXT) LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
  new_salle_id TEXT;
  new_rack_id TEXT;
  new_odf_id  TEXT;
  new_slot_id TEXT;
  sp TEXT;
  p  INT;
BEGIN
  IF p_level = 'site' THEN
    FOR r IN SELECT id FROM public.sites LOOP
      new_salle_id := r.id || '-S1';
      INSERT INTO public.salles (id, site_id, name)
      VALUES (new_salle_id, r.id, 'S1')
      ON CONFLICT (id) DO NOTHING;
      IF FOUND THEN
        created_entity := 'salle'; created_id := new_salle_id; RETURN NEXT;
      END IF;
      new_rack_id := r.id || '-S1-R1';
      INSERT INTO public.racks (id, site_id, salle_id, name)
      VALUES (new_rack_id, r.id, new_salle_id, 'R1')
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

  FOR EACH ROW EXECUTE FUNCTION fn_after_slot_insert();

-- ───────────────────────────────────────────────────────────────────────────
-- 5b. ODF → slot S01  (cascade → ports via 5a)
-- ───────────────────────────────────────────────────────────────────────────
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

-- ───────────────────────────────────────────────────────────────────────────
-- 5c. Rack → ODF1  (cascade → slot via 5b → ports via 5a)
-- ───────────────────────────────────────────────────────────────────────────
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

-- ───────────────────────────────────────────────────────────────────────────
-- 5d. Site → salle S1 → rack R1
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_after_site_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_salle_id TEXT;
BEGIN
  v_salle_id := NEW.id || '-S1';
  INSERT INTO public.salles (id, site_id, name)
  VALUES (v_salle_id, NEW.id, 'S1')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.racks (id, site_id, salle_id, name)
  VALUES (NEW.id || '-S1-R1', NEW.id, v_salle_id, 'R1')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_after_site_insert
  AFTER INSERT ON public.sites
  FOR EACH ROW EXECUTE FUNCTION fn_after_site_insert();

-- ───────────────────────────────────────────────────────────────────────────
-- 5e. Gestion automatique de la capacité des câbles
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
-- 5f. Génération automatique du CID des services
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_service_cid()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_cid TEXT;
BEGIN
  IF NEW.cid IS NULL OR NEW.cid = '' THEN
    v_cid := 'DJT-' || to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISS');
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
-- 6. Fonction utilitaire : garantir les enfants minimaux pour existants
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_ensure_min_children(p_level TEXT DEFAULT 'site')
RETURNS TABLE(created_entity TEXT, created_id TEXT) LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
  new_salle_id TEXT;
  new_rack_id TEXT;
  new_odf_id  TEXT;
  new_slot_id TEXT;
  sp TEXT;
  p  INT;
BEGIN
  IF p_level = 'site' THEN
    FOR r IN SELECT id FROM public.sites LOOP
      new_salle_id := r.id || '-S1';
      INSERT INTO public.salles (id, site_id, name)
      VALUES (new_salle_id, r.id, 'S1')
      ON CONFLICT (id) DO NOTHING;
      IF FOUND THEN
        created_entity := 'salle'; created_id := new_salle_id; RETURN NEXT;
      END IF;
      new_rack_id := r.id || '-S1-R1';
      INSERT INTO public.racks (id, site_id, salle_id, name)
      VALUES (new_rack_id, r.id, new_salle_id, 'R1')
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
