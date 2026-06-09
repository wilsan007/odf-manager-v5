import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─── Auth helpers ────────────────────────────────────────────────────────────
export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

// ─── Sites ───────────────────────────────────────────────────────────────────
// id  : 'RDK', 'YAC', ...
export const getSites = () =>
  supabase.from('sites').select('*').order('name')

export const createSite = (data) =>
  supabase.from('sites').insert(data).select().single()

export const deleteSite = (id) =>
  supabase.from('sites').delete().eq('id', id)

// ─── Racks ───────────────────────────────────────────────────────────────────
// id  : 'RDK-R1', ...
export const getRacks = (siteId) => {
  let q = supabase.from('racks').select('*, sites(name)').order('name')
  if (siteId) q = q.eq('site_id', siteId)
  return q
}

export const createRack = (data) =>
  supabase.from('racks').insert(data).select().single()

export const deleteRack = (id) =>
  supabase.from('racks').delete().eq('id', id)

// ─── ODFs ────────────────────────────────────────────────────────────────────
// id  : 'RDK-R1-ODF1', ...
export const getOdfs = (rackId) => {
  let q = supabase.from('odfs')
    .select('*, racks(name, sites(name)), cables_fibre(id, cable_reference, nom, nombre_fibres, capacite_totale_gbps, capacite_disponible_gbps)')
    .order('name')
  if (rackId) q = q.eq('rack_id', rackId)
  return q
}

export const createOdf = (data) =>
  supabase.from('odfs').insert(data).select().single()

export const deleteOdf = (id) =>
  supabase.from('odfs').delete().eq('id', id)

// ─── Slots ───────────────────────────────────────────────────────────────────
// id  : 'RDK-R1-ODF1_S01', ...
// name: 'S01', 'S02', ...
export const getSlots = (odfId) => {
  let q = supabase.from('slots').select('*').order('slot_num')
  if (odfId) q = q.eq('odf_id', odfId)
  return q
}

export const createSlot = (data) =>
  supabase.from('slots').insert(data).select().single()

export const deleteSlot = (id) =>
  supabase.from('slots').delete().eq('id', id)

// ─── Ports ───────────────────────────────────────────────────────────────────
// id        : 'RDK-R1-ODF1_S01P01', ...
// slot_port : 'S01P01'
export const getPorts = (slotId) => {
  let q = supabase.from('ports').select(`
    *,
    slots(name, odf_id,
      odfs(name, rack_id,
        racks(name, site_id,
          sites(name))))
  `).order('slot_port')
  if (slotId) q = q.eq('slot_id', slotId)
  return q
}

export const getPortsByOdf = (odfId) =>
  supabase.from('ports').select('*, slots(name, odf_id)')
    .eq('odf_id', odfId).order('slot_port')

export const updatePort = (id, data) =>
  supabase.from('ports').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single()

export const getPortsFlat = () =>
  supabase.from('ports').select(`
    id, slot_port, statut, cid, ot_num, owner, capacite, destination, remarques, updated_at, odf_id,
    slots(id, name, odf_id,
      odfs(id, name, rack_id,
        racks(id, name, site_id,
          sites(id, name))))
  `).order('updated_at', { ascending: false })

// ─── Fournisseurs ─────────────────────────────────────────────────────────────
// id : 'SEACOM', 'AAE1', ...
export const getFournisseurs = () =>
  supabase.from('fournisseurs').select('*').order('nom')

export const createFournisseur = (data) =>
  supabase.from('fournisseurs').insert(data).select().single()

export const deleteFournisseur = (id) =>
  supabase.from('fournisseurs').delete().eq('id', id)

// ─── Clients ──────────────────────────────────────────────────────────────────
// id : 'MTN', 'AIRTEL', ...
export const getClients = () =>
  supabase.from('clients').select('*').order('nom')

export const createClient = (data) =>
  supabase.from('clients').insert(data).select().single()

export const deleteClient = (id) =>
  supabase.from('clients').delete().eq('id', id)

// ─── Câbles Fibre (capacité) ───────────────────────────────────────────────────
export const getCables = () =>
  supabase.from('cables_fibre').select(`
    *,
    fournisseurs(id, nom),
    port_source:ports!cables_fibre_port_source_id_fkey(id, slot_port, slots(name, odfs(name, racks(name, sites(name))))),
    port_dest:ports!cables_fibre_port_dest_id_fkey(id, slot_port, slots(name, odfs(name, racks(name, sites(name)))))
  `).order('cable_reference')

export const createCable = (data) =>
  supabase.from('cables_fibre').insert(data).select().single()

export const updateCable = (id, data) =>
  supabase.from('cables_fibre').update(data).eq('id', id).select().single()

export const deleteCable = (id) =>
  supabase.from('cables_fibre').delete().eq('id', id)

// ─── Jarretières (cordons de brassage internes à un site) ──────────────────────
// L'id est auto-généré ('{site}-JARNN') par le trigger trg_jarretiere_id si omis.
export const getJarretieres = () =>
  supabase.from('jarretieres').select(`
    *,
    sites(id, name),
    port_a:ports!jarretieres_port_a_id_fkey(id, slot_port),
    port_b:ports!jarretieres_port_b_id_fkey(id, slot_port)
  `).order('id')

export const createJarretiere = (data) =>
  supabase.from('jarretieres').insert(data).select().single()

export const updateJarretiere = (id, data) =>
  supabase.from('jarretieres').update(data).eq('id', id).select().single()

export const deleteJarretiere = (id) =>
  supabase.from('jarretieres').delete().eq('id', id)

// ─── Services ──────────────────────────────────────────────────────────────────
// La capacité est gérée automatiquement par le trigger trg_service_capacity.
// createService peut échouer si la capacité disponible du câble est insuffisante.
export const getServices = () =>
  supabase.from('services').select(`
    *,
    cables_fibre(id, cable_reference, nom, type_lien, capacite_totale_gbps, capacite_disponible_gbps),
    clients(id, nom),
    fournisseurs(id, nom),
    ports(id, slot_port),
    service_jonctions(id, ordre, cable_id, jarretiere_id, port_entree_id, port_sortie_id, cid)
  `).order('created_at', { ascending: false })

// Le CID est généré automatiquement par le trigger trg_service_cid si non fourni.
// Peut échouer si la capacité disponible du câble primaire est insuffisante.
export const createService = (data) =>
  supabase.from('services').insert(data).select().single()

export const updateService = (id, data) =>
  supabase.from('services').update(data).eq('id', id).select().single()

export const deleteService = (id) =>
  supabase.from('services').delete().eq('id', id)

// Routes dynamiques (vue calculée : route reconstruite à la lecture)
export const getServiceRoutes = () =>
  supabase.from('vue_routes_service').select('*').order('service_id')

// ─── Jonctions de service (chemin ordonné du service jusqu'au client final) ────
export const getServiceJonctions = (serviceId) =>
  supabase.from('service_jonctions')
    .select('*, cables_fibre(id, cable_reference, nom, type_lien), jarretieres(id, nom)')
    .eq('service_id', serviceId).order('ordre')

// Crée les jonctions d'un service en une fois (tableau ordonné de hops)
export const addServiceJonctions = (rows) =>
  supabase.from('service_jonctions').insert(rows).select()

export const deleteServiceJonctions = (serviceId) =>
  supabase.from('service_jonctions').delete().eq('service_id', serviceId)

// ─── Historique ──────────────────────────────────────────────────────────────
export const addHistory = (data) =>
  supabase.from('history').insert(data)

export const getHistory = (limit = 100) =>
  supabase.from('history').select('*').order('created_at', { ascending: false }).limit(limit)

// ─── Stats dashboard ─────────────────────────────────────────────────────────
export const getStats = async () => {
  const [sites, racks, odfs, ports] = await Promise.all([
    supabase.from('sites').select('id', { count: 'exact' }),
    supabase.from('racks').select('id', { count: 'exact' }),
    supabase.from('odfs').select('id, odf_type, is_active', { count: 'exact' }),
    supabase.from('ports').select('id, statut', { count: 'exact' }),
  ])
  const statusCounts = {}
  ;(ports.data || []).forEach(p => {
    statusCounts[p.statut] = (statusCounts[p.statut] || 0) + 1
  })
  const odfList = odfs.data || []
  return {
    totalSites:       sites.count || 0,
    totalRacks:       racks.count || 0,
    totalOdfs:        odfs.count  || 0,
    totalOdfsActive:  odfList.filter(o => o.is_active).length,
    totalOdfsExterne: odfList.filter(o => o.odf_type === 'EXTERNE').length,
    totalOdfsInterne: odfList.filter(o => o.odf_type === 'INTERNE').length,
    totalPorts:       ports.count || 0,
    statusCounts,
  }
}
