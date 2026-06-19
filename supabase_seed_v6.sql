-- ═══════════════════════════════════════════════════════════════════════
--  ODF MANAGER V6 — Schema + Demo Data Seed
--  Execute this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- 1. TABLES
create table if not exists public.sites (
  id text primary key,
  name text not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.racks (
  id text primary key,
  site_id text references public.sites(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.odfs (
  id text primary key,
  rack_id text references public.racks(id) on delete cascade,
  site_a text references public.sites(id),
  site_b text references public.sites(id),
  odf_type text not null default 'EXTERNE',
  route text,
  cable text,
  slots int default 6,
  ports_per_slot int default 12,
  is_active boolean default false,
  odf_number text,
  activated_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.ports (
  id text primary key,
  odf_id text references public.odfs(id) on delete cascade,
  slot_port text not null,
  slot int not null,
  port int not null,
  statut text default 'LIBRE',
  cid text,
  ot_num text,
  capacite text,
  owner text,
  source_client text,
  end_client text,
  destination text,
  peer_odf_id text,
  peer_slot_port text,
  date_activ text,
  remarques text,
  updated_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.services (
  id text primary key,
  label text,
  capacite text,
  source_client text,
  end_client text,
  owner text,
  remarques text,
  port_count int default 0,
  created_at timestamptz default now()
);

-- RLS: allow anon read + write for demo purposes
alter table public.sites enable row level security;
alter table public.racks enable row level security;
alter table public.odfs enable row level security;
alter table public.ports enable row level security;
alter table public.services enable row level security;

do $$ begin
  if not exists (select from pg_policies where tablename='sites' and policyname='allow_all') then
    create policy allow_all on public.sites for all using (true) with check (true);
  end if;
  if not exists (select from pg_policies where tablename='racks' and policyname='allow_all') then
    create policy allow_all on public.racks for all using (true) with check (true);
  end if;
  if not exists (select from pg_policies where tablename='odfs' and policyname='allow_all') then
    create policy allow_all on public.odfs for all using (true) with check (true);
  end if;
  if not exists (select from pg_policies where tablename='ports' and policyname='allow_all') then
    create policy allow_all on public.ports for all using (true) with check (true);
  end if;
  if not exists (select from pg_policies where tablename='services' and policyname='allow_all') then
    create policy allow_all on public.services for all using (true) with check (true);
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. DEMO DATA — Sites
-- ═══════════════════════════════════════════════════════════════════════
insert into public.sites (id, name, description) values
  ('RDK', 'Ras-Dika', 'Cable Landing Station (côté Mosquée)'),
  ('YAC', 'YAC', 'Site YAC — bâtiment côté ville'),
  ('HAR', 'Haramous', 'Station Haramous (via Siesta)'),
  ('DDC', 'DDC', 'Data Center Djibouti')
on conflict (id) do nothing;

-- ═══════════════════════════════════════════════════════════════════════
-- 3. DEMO DATA — Racks
-- ═══════════════════════════════════════════════════════════════════════
insert into public.racks (id, site_id, name, description) values
  ('RDK-R1', 'RDK', 'R1', 'Main Management Room'),
  ('RDK-R2', 'RDK', 'R2', 'Rack secondaire'),
  ('YAC-R1', 'YAC', 'R1', 'Salle technique YAC'),
  ('HAR-R1', 'HAR', 'R1', 'Salle technique Haramous')
on conflict (id) do nothing;

-- ═══════════════════════════════════════════════════════════════════════
-- 4. DEMO DATA — ODFs
-- ═══════════════════════════════════════════════════════════════════════
insert into public.odfs (id, rack_id, site_a, site_b, odf_type, route, cable, slots, ports_per_slot, is_active) values
  ('RDK-R1-ODF1', 'RDK-R1', 'RDK', 'YAC', 'EXTERNE', 'Ras-Dika ↔ YAC (côté Mosquée)', 'Câble 144 Fibres', 6, 12, false),
  ('RDK-R1-ODF2', 'RDK-R1', 'RDK', 'YAC', 'EXTERNE', 'Ras-Dika → YAC — IODF CIENA', 'CIENA Shelf', 6, 12, false),
  ('RDK-R1-ODF3', 'RDK-R1', 'RDK', 'RDK', 'INTERNE', 'Ras-Dika MMR ↔ ODF L2', '48 Fibres', 6, 12, false),
  ('RDK-R1-ODF4', 'RDK-R1', 'RDK', 'YAC', 'EXTERNE', 'Ras-Dika → YAC (BACK, Mosquée)', 'Câble 144 Fibres', 6, 12, false),
  ('RDK-R1-ODF5', 'RDK-R1', 'RDK', 'HAR', 'EXTERNE', 'Ras-Dika ↔ Haramous (Siesta)', '96 Fibres', 6, 12, false),
  ('RDK-R1-ODF6', 'RDK-R1', 'RDK', 'YAC', 'EXTERNE', 'Ras-Dika → YAC-B (BACK cable)', 'Câble 144 Fibres', 6, 12, false),
  ('RDK-R1-ODF7', 'RDK-R1', 'RDK', 'YAC', 'EXTERNE', 'Ras-Dika → YAC — Backhaul TEJAS', 'Backhaul TEJAS', 6, 12, false),
  ('RDK-R1-ODF8', 'RDK-R1', 'RDK', 'HAR', 'EXTERNE', 'Ras-Dika ↔ Haramous — CIENA 2', 'CIENA SHELF 2', 6, 12, false)
on conflict (id) do nothing;

-- ═══════════════════════════════════════════════════════════════════════
-- 5. DEMO DATA — Ports (using a function for mass insert)
-- ═══════════════════════════════════════════════════════════════════════
do $$
declare
  odf_ids text[] := array['RDK-R1-ODF1','RDK-R1-ODF2','RDK-R1-ODF3','RDK-R1-ODF4','RDK-R1-ODF5','RDK-R1-ODF6','RDK-R1-ODF7','RDK-R1-ODF8'];
  odf_id text;
  s int; p int; sp text; pid text;
begin
  foreach odf_id in array odf_ids loop
    for s in 1..6 loop
      for p in 1..12 loop
        sp := 'S' || lpad(s::text, 2, '0') || 'P' || lpad(p::text, 2, '0');
        pid := odf_id || '_' || sp;
        insert into public.ports (id, odf_id, slot_port, slot, port, statut)
        values (pid, odf_id, sp, s, p, 'LIBRE')
        on conflict (id) do nothing;
      end loop;
    end loop;
  end loop;
end $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 6. DEMO DATA — Known active ports (ODF1)
-- ═══════════════════════════════════════════════════════════════════════
-- Active ports for Demo Service
update public.ports set statut='ACTIF', cid='DJT-20260531000001', capacite='100G', source_client='2AF / MTN', destination='SEACOM' where id='RDK-R1-ODF1_S01P05';


-- Demo Service
insert into public.services (id, label, capacite, source_client, end_client) values
  ('DJT-20260531000001', 'Transit IP SEACOM', '100G', '2AF / MTN', 'SEACOM')
on conflict (id) do nothing;

select 'V6 Demo Data seeded successfully!' as status;
