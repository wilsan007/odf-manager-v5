import React from "react";
import { SC, NAVY, BLUE } from "../utils/constants";
import { Badge, TypeBadge, ODFNumberBadge } from "./UI";

export default function Dashboard({ stats, odfList, sites, racks, db, setView, setActiveODF }) {
  const { s, byOdf } = stats;
  const totalOdfs = odfList.length;
  const activOdfs = odfList.filter(o => o.is_active).length;
  const extOdfs = odfList.filter(o => o.odf_type === "EXTERNE").length;
  const intOdfs = odfList.filter(o => o.odf_type === "INTERNE").length;
  return (
    <div style={{ maxWidth: 1060 }}>
      {/* KPIs ports */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 14 }}>
        {[["ACTIF", "Circuits actifs"], ["INTERNE", "Usages internes"],
        ["INCONNU", "À auditer"], ["LIBRE", "Disponibles"]].map(([st, lbl]) => {
          const c = SC[st];
          return (
            <div key={st}
              style={{
                background: "#fff", borderRadius: 12, padding: "14px 16px",
                boxShadow: "0 1px 6px rgba(0,0,0,.06)", borderTop: `3px solid ${c.dot}`
              }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: c.dot, fontFamily: "monospace" }}>{s[st] || 0}</div>
              <div style={{ fontSize: 11, color: "#607D8B", marginTop: 2 }}>{lbl}</div>
              <div style={{ marginTop: 6 }}><Badge st={st} sm /></div>
            </div>
          );
        })}
      </div>
      {/* KPIs ODF */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 14 }}>
        {[[totalOdfs, "ODFs total", "#607D8B"], [activOdfs, "ODFs activés", "#27AE60"],
        [extOdfs, "EXTERNE", "#1565C0"], [intOdfs, "INTERNE (iODF)", "#5C6BC0"]].map(([v, l, c]) => (
          <div key={l} style={{
            background: "#fff", borderRadius: 12, padding: "12px 16px",
            boxShadow: "0 1px 6px rgba(0,0,0,.06)", borderLeft: `3px solid ${c}`
          }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: c, fontFamily: "monospace" }}>{v}</div>
            <div style={{ fontSize: 10, color: "#90A4AE", marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
      {/* Sites overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10, marginBottom: 14 }}>
        {sites.map(site => {
          const siteRacks = racks.filter(r => r.site_id === site.id);
          const siteOdfs = odfList.filter(o => siteRacks.some(r => r.id === o.rack_id));
          const sitePorts = siteOdfs.reduce((acc, o) => acc + Object.keys(db[o.id] || {}).length, 0);
          const siteActivated = siteOdfs.filter(o => o.is_active).length;
          return (
            <div key={site.id} style={{
              background: "#fff", borderRadius: 10, padding: "14px",
              boxShadow: "0 1px 4px rgba(0,0,0,.05)", border: "1.5px solid #E8ECF0"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>🌐</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: NAVY }}>{site.name}</div>
                  <div style={{ fontSize: 9, color: "#90A4AE" }}>{site.description}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 10, color: "#607D8B" }}>
                <span>🔲 {siteRacks.length} racks</span>
                <span>◉ {siteOdfs.length} ODFs</span>
                <span>🔌 {sitePorts} ports</span>
                <span style={{ color: siteActivated > 0 ? "#27AE60" : "#AAB4BE" }}>⚡ {siteActivated} actifs</span>
              </div>
            </div>
          );
        })}
      </div>
      {/* Occupation ODFs */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 6px rgba(0,0,0,.06)" }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: "#607D8B", fontWeight: 700, marginBottom: 12 }}>
          OCCUPATION ODFs
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 9 }}>
          {odfList.map(odf => {
            const o = byOdf[odf.id] || {};
            const total = Object.keys(db[odf.id] || {}).length || 1;
            const pct = Math.round((o.ACTIF + o.INTERNE + o.INCONNU + o.RÉSERVÉ) * 100 / total);
            return (
              <div key={odf.id} style={{
                border: "1.5px solid #E8ECF0", borderRadius: 9,
                padding: "11px", cursor: "pointer", background: "#FAFBFC", transition: "all .15s"
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.background = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#E8ECF0"; e.currentTarget.style.background = "#FAFBFC"; }}
                onClick={() => { setActiveODF(odf.id); setView("manage"); }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: NAVY, fontFamily: "monospace" }}>
                    {odf.id.replace("RDK-", "")}
                  </span>
                  <TypeBadge type={odf.odf_type} />
                </div>
                <ODFNumberBadge num={odf.odf_number} />
                <div style={{ height: 4, background: "#F0F4F8", borderRadius: 3, overflow: "hidden", margin: "5px 0 3px" }}>
                  {[["ACTIF", o.ACTIF], ["INTERNE", o.INTERNE], ["INCONNU", o.INCONNU]].map(([st, v]) => (
                    <div key={st} style={{
                      display: "inline-block", width: `${(v || 0) * 100 / total}%`,
                      height: "100%", background: SC[st]?.dot
                    }} />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#AAB4BE" }}>
                  <span>{total} ports</span>
                  <span style={{ fontWeight: 700, color: pct > 70 ? "#E74C3C" : pct > 40 ? "#F39C12" : "#27AE60" }}>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
