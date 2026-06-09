import React, { useState } from "react";
import { NAVY, BLUE } from "../utils/constants";
import { Btn, Inp, Sel, Modal, ConfirmModal } from "./UI";

export default function InfraManager({ sites, racks, odfs, db, onAddSite, onAddRack, onAddODF }) {
  const [tab, setTab] = useState("sites");
  const [modal, setModal] = useState(null);

  // Auto-creation function
  const handleCreateSite = (f) => {
    const site = { id: f.id, name: f.name, description: f.description };
    const rack = { id: `${f.id}-R1`, site_id: f.id, name: "R1", description: "Main Rack" };
    const odf = { id: `${f.id}-R1-ODF1`, rack_id: rack.id, site_a: f.id, site_b: f.id, odf_type: "INTERNE", route: "Default", cable: "", slots: 1, ports_per_slot: 12, is_active: false, odf_number: null, activated_at: null };
    onAddSite(site, rack, odf);
    setModal(null);
  };

  const handleCreateRack = (f) => {
    const rack = { id: `${f.site_id}-${f.name}`, site_id: f.site_id, name: f.name, description: f.description };
    const odf = { id: `${rack.id}-ODF1`, rack_id: rack.id, site_a: f.site_id, site_b: f.site_id, odf_type: "INTERNE", route: "Default", cable: "", slots: 1, ports_per_slot: 12, is_active: false, odf_number: null, activated_at: null };
    onAddRack(rack, odf);
    setModal(null);
  };

  const handleCreateODF = (f) => {
    const odfNum = odfs.filter(o => o.rack_id === f.rack_id).length + 1;
    const odf = { ...f, id: `${f.rack_id}-ODF${odfNum}`, slots: 1, ports_per_slot: 12, is_active: false };
    onAddODF(odf);
    setModal(null);
  };

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ color: NAVY, fontSize: 18, margin: 0 }}>Gestion des Infrastructures</h2>
        <div style={{ display: "flex", gap: 6 }}>
          <Btn sm onClick={() => setModal({ t: "addSite" })}>+ Site</Btn>
          <Btn sm onClick={() => setModal({ t: "addRack" })}>+ Rack</Btn>
          <Btn sm onClick={() => setModal({ t: "addODF" })}>+ ODF</Btn>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 6px rgba(0,0,0,.06)" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          {["sites", "racks", "odfs"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 12px", borderRadius: 8, background: tab === t ? NAVY : "#F0F4F8", color: tab === t ? "#fff" : "#607D8B", border: "none", cursor: "pointer", fontWeight: tab === t ? 700 : 400 }}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {tab === "sites" && sites.map(s => (
          <div key={s.id} style={{ padding: 10, borderBottom: "1px solid #F0F4F8" }}>
            <span style={{ fontWeight: 800, color: BLUE }}>{s.name} ({s.id})</span> — {s.description}
          </div>
        ))}

        {tab === "racks" && racks.map(r => (
          <div key={r.id} style={{ padding: 10, borderBottom: "1px solid #F0F4F8" }}>
            <span style={{ fontWeight: 800, color: BLUE }}>{r.name}</span> — Site: {r.site_id}
          </div>
        ))}

        {tab === "odfs" && odfs.map(o => (
          <div key={o.id} style={{ padding: 10, borderBottom: "1px solid #F0F4F8" }}>
            <span style={{ fontWeight: 800, color: BLUE }}>{o.id}</span> — {o.odf_type} — {o.route}
          </div>
        ))}
      </div>

      {modal?.t === "addSite" && <SiteForm onSave={handleCreateSite} onClose={() => setModal(null)} />}
      {modal?.t === "addRack" && <RackForm sites={sites} onSave={handleCreateRack} onClose={() => setModal(null)} />}
      {modal?.t === "addODF" && <ODFForm sites={sites} racks={racks} onSave={handleCreateODF} onClose={() => setModal(null)} />}
    </div>
  );
}

function SiteForm({ onSave, onClose }) {
  const [f, setF] = useState({ id: "", name: "", description: "" });
  const upd = k => v => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal title="Nouveau Site" icon="🌐" onClose={onClose} footer={<><Btn variant="ghost" onClick={onClose}>Annuler</Btn><Btn onClick={() => onSave(f)}>Créer (Auto Rack+ODF+Ports)</Btn></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Inp label="ID Site" value={f.id} onChange={upd("id")} required />
        <Inp label="Nom" value={f.name} onChange={upd("name")} required />
        <Inp label="Description" value={f.description} onChange={upd("description")} />
      </div>
    </Modal>
  );
}

function RackForm({ sites, onSave, onClose }) {
  const [f, setF] = useState({ site_id: "", name: "", description: "" });
  const upd = k => v => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal title="Nouveau Rack" icon="🔲" onClose={onClose} footer={<><Btn variant="ghost" onClick={onClose}>Annuler</Btn><Btn onClick={() => onSave(f)}>Créer (Auto ODF+Ports)</Btn></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Sel label="Site" value={f.site_id} onChange={upd("site_id")} options={sites.map(s => ({ value: s.id, label: s.name }))} required />
        <Inp label="Nom Rack" value={f.name} onChange={upd("name")} required />
        <Inp label="Description" value={f.description} onChange={upd("description")} />
      </div>
    </Modal>
  );
}

function ODFForm({ sites, racks, onSave, onClose }) {
  const [f, setF] = useState({ rack_id: "", site_a: "", site_b: "", odf_type: "INTERNE", route: "" });
  const upd = k => v => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal title="Nouvel ODF" icon="◉" onClose={onClose} footer={<><Btn variant="ghost" onClick={onClose}>Annuler</Btn><Btn onClick={() => onSave(f)}>Créer (Auto 12 Ports)</Btn></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Sel label="Site A" value={f.site_a} onChange={v => { upd("site_a")(v); upd("site_b")(f.odf_type === "INTERNE" ? v : ""); }} options={sites.map(s => ({ value: s.id, label: s.name }))} required />
        <Sel label="Rack" value={f.rack_id} onChange={upd("rack_id")} options={racks.filter(r => r.site_id === f.site_a).map(r => ({ value: r.id, label: r.name }))} required />
        <Sel label="Type" value={f.odf_type} onChange={v => { upd("odf_type")(v); upd("site_b")(v === "INTERNE" ? f.site_a : ""); }} options={[{ value: "INTERNE", label: "INTERNE" }, { value: "EXTERNE", label: "EXTERNE" }]} />
        <Sel label="Site B" value={f.site_b} onChange={upd("site_b")} options={sites.map(s => ({ value: s.id, label: s.name }))} disabled={f.odf_type === "INTERNE"} required />
        <Inp label="Route" value={f.route} onChange={upd("route")} required />
      </div>
    </Modal>
  );
}
