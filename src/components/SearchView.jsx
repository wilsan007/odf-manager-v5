import React, { useState, useMemo } from "react";
import { NAVY, BLUE } from "../utils/constants";
import { Btn, Sel, Badge } from "./UI";
import Papa from "papaparse";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function SearchView({ db, odfList, services, sites, user }) {
  const [searchCID, setSearchCID] = useState("");
  const [exportTarget, setExportTarget] = useState(""); // SITE, ODF, CID
  const [exportSite, setExportSite] = useState("");
  const [exportODF, setExportODF] = useState("");

  const isTech = user.role === "technicien";
  const allPorts = useMemo(() => odfList.flatMap(o => Object.values(db[o.id] || {})), [db, odfList]);

  const searchResults = useMemo(() => {
    if (!searchCID) return [];
    return allPorts.filter(p => p.cid?.toLowerCase().includes(searchCID.toLowerCase()));
  }, [allPorts, searchCID]);

  const doExport = (format) => {
    let dataToExport = [];
    let title = "Export ODF Manager";

    if (isTech || exportTarget === "CID") {
      if (searchResults.length === 0) return alert("Aucun résultat à exporter.");
      dataToExport = searchResults;
      title = `Export_CID_${searchCID}`;
    } else if (exportTarget === "SITE" && exportSite) {
      const siteOdfs = odfList.filter(o => o.site_a === exportSite);
      dataToExport = siteOdfs.flatMap(o => Object.values(db[o.id] || {}));
      title = `Export_Site_${exportSite}`;
    } else if (exportTarget === "ODF" && exportODF) {
      dataToExport = Object.values(db[exportODF] || {});
      title = `Export_ODF_${exportODF}`;
    } else {
      return alert("Sélectionnez une cible valide.");
    }

    const flatData = dataToExport.map(p => ({
      ODF: p.odf_id,
      Slot_Port: p.slot_port,
      Statut: p.statut,
      CID: p.cid,
      Capacité: p.capacite,
      Client_Source: p.source_client || p.owner,
      Client_Final: p.end_client,
      Peer_ODF: p.peer_odf_id
    }));

    if (format === "CSV") {
      const csv = Papa.unparse(flatData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${title}.csv`;
      link.click();
    } else if (format === "PDF") {
      const doc = new jsPDF("landscape");
      doc.setFontSize(16);
      doc.text(title, 14, 15);
      doc.autoTable({
        startY: 20,
        head: [['ODF', 'Port', 'Statut', 'CID', 'Capacité', 'Source', 'Final', 'Peer']],
        body: flatData.map(d => [d.ODF, d.Slot_Port, d.Statut, d.CID || "", d.Capacité || "", d.Client_Source || "", d.Client_Final || "", d.Peer_ODF || ""]),
        theme: 'grid',
        headStyles: { fillColor: [15, 39, 68] },
        styles: { fontSize: 8 }
      });
      doc.save(`${title}.pdf`);
    }
  };

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 6px rgba(0,0,0,.06)", marginBottom: 14 }}>
        <h2 style={{ color: NAVY, fontSize: 18, margin: "0 0 14px 0" }}>Recherche & Exploitation</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#607D8B", marginBottom: 4 }}>RECHERCHE CID</label>
            <input value={searchCID} onChange={e => setSearchCID(e.target.value)}
              placeholder="Ex: DJT-2026..."
              style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #DDE3EA", borderRadius: 8, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
          </div>
          {(!isTech && searchResults.length === 0) && (
            <>
              <Sel label="Niveau d'Export" value={exportTarget} onChange={setExportTarget} options={[{ value: "SITE", label: "Par Site" }, { value: "ODF", label: "Par ODF" }]} />
              {exportTarget === "SITE" && <Sel label="Site" value={exportSite} onChange={setExportSite} options={sites.map(s => ({ value: s.id, label: s.name }))} />}
              {exportTarget === "ODF" && <Sel label="ODF" value={exportODF} onChange={setExportODF} options={odfList.map(o => ({ value: o.id, label: o.id }))} />}
            </>
          )}
          <div style={{ display: "flex", gap: 5, alignItems: "flex-end" }}>
            <Btn onClick={() => doExport("CSV")} disabled={isTech && searchResults.length === 0}>Export CSV</Btn>
            <Btn onClick={() => doExport("PDF")} disabled={isTech && searchResults.length === 0}>Export PDF</Btn>
          </div>
        </div>
      </div>

      {searchCID && (
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,.06)" }}>
          <div style={{ padding: "12px 16px", background: NAVY, color: "#fff", borderTopLeftRadius: 12, borderTopRightRadius: 12, fontSize: 13, fontWeight: 700 }}>
            Résultats ({searchResults.length})
          </div>
          {searchResults.map((p, i) => (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "100px 100px 100px 1fr 1fr 1fr", padding: "10px 16px", borderBottom: "1px solid #F0F4F8", alignItems: "center", fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: BLUE }}>{p.odf_id}</div>
              <div style={{ fontFamily: "monospace", fontWeight: 700 }}>{p.slot_port}</div>
              <div><Badge st={p.statut} sm /></div>
              <div style={{ fontFamily: "monospace" }}>{p.cid}</div>
              <div>{p.source_client || p.owner || "—"}</div>
              <div>{p.end_client || "—"}</div>
            </div>
          ))}
          {searchResults.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "#90A4AE" }}>Aucun port ne correspond à ce CID.</div>}
        </div>
      )}
    </div>
  );
}
