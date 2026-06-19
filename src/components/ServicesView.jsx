import React, { useState, useEffect, useCallback } from "react";
import { supabase, getServices, getServiceRoutes, getCablesInterSites, getClients, getFournisseurs, getSites, deleteService } from "../supabase.js";
import { Btn, Confirm, Spinner } from "./common/UI.jsx";

// Import extracted components
import { ServiceCard } from "./services/ServiceCard.jsx";
import { ServiceWizard } from "./services/ServiceWizard.jsx";
import { ServiceEditModal } from "./services/ServiceEditModal.jsx";
import { PortPicker } from "./services/PortPicker.jsx";

// Re-export PortPicker for backward compatibility
export { PortPicker };

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SERVICES VIEW
// ═══════════════════════════════════════════════════════════════════════════
export default function ServicesView({ t, TH }) {
  const [services, setServices] = useState([]);
  const [routes, setRoutes] = useState({});
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [confirm, setConfirm] = useState(null);

  // Edit state
  const [editingService, setEditingService] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editClient, setEditClient] = useState("");
  const [editFourn, setEditFourn] = useState("");
  const [editStatut, setEditStatut] = useState("ACTIF");

  const [cablesInterSites, setCablesInterSites] = useState([]);
  const [clients, setClients] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [sitesList, setSitesList] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      getServices(),
      getServiceRoutes(),
    ]).then(([s, r]) => {
      setServices(s.data || []);
      const m = {};
      (r.data || []).forEach(x => { m[x.service_id] = x; });
      setRoutes(m);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    getCablesInterSites().then(r => setCablesInterSites(r.data || []));
    getClients().then(r => setClients(r.data || []));
    getFournisseurs().then(r => setFournisseurs(r.data || []));
    getSites().then(r => setSitesList(r.data || []));
  }, [load]);

  const doDelete = async (id) => {
    try {
      const { data: svc } = await supabase.from('services').select('cid').eq('id', id).single();
      await deleteService(id);
      if (svc && svc.cid) {
        await supabase.from('ports').update({ statut: 'LIBRE', cid: null }).eq('cid', svc.cid);
      }
    } catch (e) {
      console.error("Erreur de suppression service :", e);
    }
    setConfirm(null);
    load();
  };

  const startEdit = (s) => {
    setEditingService(s);
    setEditLabel(s.label || "");
    setEditClient(s.client_id || "");
    setEditFourn(s.fournisseur_id || "");
    setEditStatut(s.statut || "ACTIF");
  };

  const handleSaveEdit = async () => {
    if (!editingService) return;
    try {
      const oldStatut = editingService.statut || "ACTIF";
      const newStatut = editStatut;
      const cid = editingService.cid || editingService.id;

      const { error } = await supabase.from('services').update({
        label: editLabel.trim(),
        client_id: editClient || null,
        fournisseur_id: editFourn || null,
        statut: editStatut
      }).eq('id', editingService.id);

      if (error) throw error;

      if (oldStatut !== "RESILIE" && newStatut === "RESILIE") {
        await supabase.from('ports').update({ statut: 'LIBRE', cid: null }).eq('cid', cid);
      } else if (oldStatut === "RESILIE" && newStatut !== "RESILIE") {
        const { data: jons } = await supabase.from('service_jonctions').select('port_entree_id, port_sortie_id').eq('service_id', editingService.id);
        const portsToUpdate = [];
        (jons || []).forEach(j => {
          if (j.port_entree_id) portsToUpdate.push(j.port_entree_id);
          if (j.port_sortie_id) portsToUpdate.push(j.port_sortie_id);
        });
        if (portsToUpdate.length > 0) {
          await supabase.from('ports').update({ statut: 'OCCUPE', cid: cid }).in('id', portsToUpdate);
        }
      }

      setEditingService(null);
      load();
    } catch (e) {
      alert("Erreur de modification : " + e.message);
    }
  };

  const onWizardDone = () => {
    setShowWizard(false);
    load();
    getCablesInterSites().then(r => setCablesInterSites(r.data || []));
  };

  if (loading) return <Spinner TH={TH} />;

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ color: TH.text2, fontSize: "12px" }}>{services.length} service(s)</div>
        <Btn onClick={() => setShowWizard(true)} TH={TH}>+ {t.add} service</Btn>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {services.map(s => (
          <ServiceCard
            key={s.id}
            service={s}
            routeInfo={routes[s.id]}
            onEdit={startEdit}
            onDelete={setConfirm}
            TH={TH}
          />
        ))}
        {!services.length && (
          <div style={{ textAlign: "center", color: TH.text3, paddingTop: "40px" }}>{t.noData}</div>
        )}
      </div>

      <ServiceWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onDone={onWizardDone}
        sites={sitesList}
        cables={cablesInterSites}
        fournisseurs={fournisseurs}
        clients={clients}
        TH={TH}
        t={t}
      />

      {confirm && (
        <Confirm
          message={t.confirmDelete}
          onYes={() => doDelete(confirm)}
          onNo={() => setConfirm(null)}
          TH={TH} t={t}
        />
      )}

      <ServiceEditModal
        editingService={editingService}
        editLabel={editLabel} setEditLabel={setEditLabel}
        editClient={editClient} setEditClient={setEditClient}
        editFourn={editFourn} setEditFourn={setEditFourn}
        editStatut={editStatut} setEditStatut={setEditStatut}
        clients={clients}
        fournisseurs={fournisseurs}
        onClose={() => setEditingService(null)}
        onSave={handleSaveEdit}
        TH={TH}
      />
    </div>
  );
}
