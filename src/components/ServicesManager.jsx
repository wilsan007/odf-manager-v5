import React, { useState } from "react";
import { NAVY, BLUE } from "../utils/constants";
import { Btn, Inp, Modal } from "./UI";

export default function ServicesManager({ services, onAddService, onDeleteService }) {
  const [modal, setModal] = useState(false);
  const [cid, setCid] = useState("");
  const [label, setLabel] = useState("");
  const [srcClient, setSrcClient] = useState("");
  const [endClient, setEndClient] = useState("");
  const [owner, setOwner] = useState("");
  const [remarques, setRemarques] = useState("");
  const [err, setErr] = useState("");

  const handleCreate = () => {
    if (!cid.trim() || !label.trim()) {
      setErr("CID et Label sont obligatoires.");
      return;
    }
    onAddService({
      id: cid.trim(), label, source_client: srcClient,
      end_client: endClient, owner, remarques, created_at: new Date().toISOString()
    });
    setModal(false);
  };

  const openNew = () => {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const base = `DJT-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    setCid(base); setLabel(""); setSrcClient(""); setEndClient(""); setOwner(""); setRemarques(""); setErr("");
    setModal(true);
  };

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ color: NAVY, fontSize: 18, margin: 0 }}>Gestion des Services</h2>
        <Btn onClick={openNew}>+ Créer un service</Btn>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,.06)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "150px 150px 1fr 1fr 60px", background: NAVY, color: "#fff", padding: "10px 14px", borderTopLeftRadius: 12, borderTopRightRadius: 12, fontSize: 11, fontWeight: 700 }}>
          <div>CID</div>
          <div>LABEL</div>
          <div>CLIENT SOURCE</div>
          <div>CLIENT FINAL</div>
          <div>ACTIONS</div>
        </div>
        {services.map((s, i) => (
          <div key={s.id} style={{ display: "grid", gridTemplateColumns: "150px 150px 1fr 1fr 60px", padding: "10px 14px", borderBottom: "1px solid #F0F4F8", alignItems: "center", fontSize: 12 }}>
            <div style={{ fontFamily: "monospace", fontWeight: 700 }}>{s.id}</div>
            <div>{s.label}</div>
            <div>{s.source_client || "—"}</div>
            <div>{s.end_client || "—"}</div>
            <div>
              <Btn sm variant="danger" onClick={() => onDeleteService(s.id)}>🗑</Btn>
            </div>
          </div>
        ))}
        {services.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "#90A4AE" }}>Aucun service.</div>}
      </div>

      {modal && (
        <Modal title="Nouveau Service" icon="⚡" onClose={() => setModal(false)}
          footer={<><Btn variant="ghost" onClick={() => setModal(false)}>Annuler</Btn><Btn onClick={handleCreate}>Créer</Btn></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Inp label="CID (Auto-généré)" value={cid} onChange={setCid} mono required />
            <Inp label="Label *" value={label} onChange={setLabel} placeholder="Nom du service" required />
            <Inp label="Client Source" value={srcClient} onChange={setSrcClient} />
            <Inp label="Client Final" value={endClient} onChange={setEndClient} />
            <Inp label="Owner" value={owner} onChange={setOwner} />
            <Inp label="Remarques" value={remarques} onChange={setRemarques} />
            {err && <div style={{ color: "#E74C3C", fontSize: 12, background: "#FCE4D6", padding: 8, borderRadius: 6 }}>{err}</div>}
          </div>
        </Modal>
      )}
    </div>
  );
}
