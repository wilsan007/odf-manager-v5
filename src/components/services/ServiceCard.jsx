import React from "react";
import { Btn } from "../common/UI.jsx";

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE CARD — affichage d'un service dans la liste
// ═══════════════════════════════════════════════════════════════════════════

export function ServiceCard({ service, routeInfo, onEdit, onDelete, TH }) {
  const st = service.statut || "ACTIF";
  const SC_SVC = { ACTIF: TH.green, SUSPENDU: TH.gold, RESILIE: TH.red };
  const col = SC_SVC[st] || TH.text2;
  const route = routeInfo?.route;
  const nb = routeInfo?.nb_jonctions ?? (service.service_jonctions?.length || 0);

  return (
    <div style={{
      background: TH.bgCard, border: `1px solid ${TH.border}`,
      borderRadius: "12px", padding: "16px"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
        <span className="font-mono" style={{ fontWeight: 700, color: TH.cyan, fontSize: "13px" }}>
          {service.cid || service.id}
        </span>
        <span style={{
          fontSize: "10px", fontWeight: 700, color: col,
          border: `1px solid ${col}`, borderRadius: "6px", padding: "2px 8px"
        }}>{st}</span>
        <span style={{ color: TH.text1, fontSize: "13px", fontWeight: 600, flex: 1 }}>{service.label}</span>
        <div style={{ display: "flex", gap: "6px" }}>
          <Btn onClick={() => onEdit(service)} size="sm" TH={TH}>✏️</Btn>
          <Btn onClick={() => onDelete(service.id)} variant="danger" size="sm" TH={TH}>✕</Btn>
        </div>
      </div>
      <div style={{ display: "flex", gap: "14px", fontSize: "11px", color: TH.text2, marginBottom: "6px" }}>
        <span>Client : <b style={{ color: TH.text1 }}>{service.clients?.nom || "—"}</b></span>
        <span>Fournisseur : <b style={{ color: TH.text1 }}>{service.fournisseurs?.nom || "—"}</b></span>
        <span>Jonctions : <b style={{ color: TH.text1 }}>{nb}</b></span>
      </div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: TH.text1,
        background: TH.bgInput, borderRadius: "8px", padding: "8px 10px", lineHeight: 1.5
      }}>
        {route || "— (aucune route définie)"}
      </div>
    </div>
  );
}
