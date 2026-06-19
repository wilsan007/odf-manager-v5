import React, { useState, useEffect } from "react";
import { getStats, getSites, getPortsFlat } from "../supabase.js";
import { Spinner, Bdg } from "./common/UI.jsx";

export default function Dashboard({ t, TH }) {
  const [stats, setStats] = useState(null);
  const [sites, setSites] = useState([]);
  const [byOdf, setByOdf] = useState({});
  const [bySite, setBySite] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [s, si, pr] = await Promise.all([
          getStats(), 
          getSites(), 
          getPortsFlat()
        ]);
        if (!alive) return;
        setStats(s);
        setSites(si.data || []);
        const odfMap = {};
        const siteMap = {};
        (pr.data || []).forEach(p => {
          const site = p.slots?.odfs?.racks?.sites;
          const odf = p.slots?.odfs;
          const siteKey = site?.id;
          const odfKey = odf?.id || p.odf_id;
          if (siteKey) {
            if (!siteMap[siteKey]) {
              siteMap[siteKey] = {
                racks: new Set(),
                odfs: new Set(),
                ports: 0,
                actifs: 0
              };
            }
            siteMap[siteKey].racks.add(p.slots?.odfs?.racks?.id);
            siteMap[siteKey].odfs.add(odfKey);
            siteMap[siteKey].ports++;
            if (p.statut === "OCCUPE") siteMap[siteKey].actifs++;
          }
          if (odfKey) {
            if (!odfMap[odfKey]) {
              odfMap[odfKey] = {
                nom: odf?.name || odfKey,
                type: odf?.odf_type,
                isActive: odf?.is_active,
                total: 0,
                LIBRE: 0,
                OCCUPE: 0,
                MAUVAIS: 0
              };
            }
            odfMap[odfKey].total++;
            odfMap[odfKey][p.statut] = (odfMap[odfKey][p.statut] || 0) + 1;
          }
        });
        if (!alive) return;
        setBySite(siteMap);
        setByOdf(odfMap);
      } catch (e) {
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, []);

  if (loading) return <Spinner TH={TH} />;

  const sc = stats?.statusCounts || {};
  const odfEntries = Object.entries(byOdf);

  const portKpis = [
    { st: "LIBRE",   label: "Disponibles", val: sc.LIBRE || 0,   color: TH.text2,  bc: TH.text3 },
    { st: "OCCUPE",  label: "Occupés",     val: sc.OCCUPE || 0,  color: TH.green,  bc: TH.green },
    { st: "MAUVAIS", label: "Défectueux",  val: sc.MAUVAIS || 0, color: TH.red,    bc: TH.red },
  ];

  const odfKpis = [
    { label: "ODFs total",     val: stats?.totalOdfs || 0,        color: TH.text2,  bc: TH.text3 },
    { label: "ODFs activés",   val: stats?.totalOdfsActive || 0,  color: TH.green,  bc: TH.green },
    { label: "EXTERNE",        val: stats?.totalOdfsExterne || 0, color: TH.blue,   bc: TH.blue },
    { label: "INTERNE (iODF)", val: stats?.totalOdfsInterne || 0, color: TH.purple, bc: TH.purple },
  ];

  const card = { 
    background: TH.bgCard, 
    border: `1px solid ${TH.border}`, 
    borderRadius: "12px", 
    boxShadow: TH.cardShadow 
  };

  return (
    <div className="fade-up" style={{ padding: "24px", overflowY: "auto", height: "100%" }}>

      {/* Row 1 — Port status KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "14px" }}>
        {portKpis.map(k => (
          <div key={k.st} style={{ ...card, borderTop: `3px solid ${k.bc}`, padding: "16px 18px" }}>
            <div className="font-mono" style={{ fontSize: "32px", fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.val}</div>
            <div style={{ fontSize: "12px", color: TH.text2, margin: "6px 0 10px" }}>{k.label}</div>
            <Bdg status={k.st} TH={TH} />
          </div>
        ))}
      </div>

      {/* Row 2 — ODF stat KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginBottom: "20px" }}>
        {odfKpis.map((k, i) => (
          <div key={i} style={{ ...card, borderLeft: `3px solid ${k.bc}`, padding: "14px 18px" }}>
            <div className="font-mono" style={{ fontSize: "26px", fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.val}</div>
            <div style={{ fontSize: "11px", color: TH.text3, marginTop: "5px" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Row 3 — Sites */}
      {sites.length > 0 && (
        <div style={{
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", 
          gap: "12px", 
          marginBottom: "20px"
        }}>
          {sites.map(site => {
            const ss = bySite[site.id] || {};
            return (
              <div key={site.id} style={{ ...card, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <span style={{ fontSize: "20px" }}>🌐</span>
                  <div>
                    <div style={{ 
                      fontSize: "13px", 
                      fontWeight: 700, 
                      color: TH.text1, 
                      lineHeight: 1.2 
                    }}>{site.name}</div>
                    <div style={{ fontSize: "10px", color: TH.text3 }}>{site.description || "Auto-généré"}</div>
                  </div>
                </div>
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "1fr 1fr", 
                  gap: "3px", 
                  fontSize: "11px", 
                  color: TH.text2 
                }}>
                  <span>🔲 {ss.racks?.size || 0} racks</span>
                  <span>◉ {ss.odfs?.size || 0} ODFs</span>
                  <span>🔌 {ss.ports || 0} ports</span>
                  <span style={{ color: (ss.actifs || 0) > 0 ? TH.green : TH.text3 }}>
                    ⚡ {ss.actifs || 0} actifs
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Row 4 — ODF Occupation */}
      {odfEntries.length > 0 && (
        <div style={{ ...card, padding: "18px" }}>
          <div style={{ 
            fontSize: "11px", 
            letterSpacing: "2px", 
            color: TH.text2, 
            fontWeight: 700, 
            marginBottom: "14px" 
          }}>
            OCCUPATION ODFs
          </div>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", 
            gap: "10px" 
          }}>
            {odfEntries.map(([id, o]) => {
              const used = (o.OCCUPE || 0) + (o.MAUVAIS || 0);
              const pct = o.total ? Math.round(used * 100 / o.total) : 0;
              const pctColor = pct > 70 ? TH.red : pct > 40 ? TH.gold : TH.green;
              const isInt = o.type === "INTERNE";
              const typeBg = isInt ? "rgba(167,139,250,0.12)" : "rgba(59,130,246,0.12)";
              const typeTx = isInt ? TH.purple : TH.blue;
              const typeBd = isInt ? "rgba(167,139,250,0.3)" : "rgba(59,130,246,0.3)";
              return (
                <div 
                  key={id} 
                  style={{
                    border: `1px solid ${TH.border}`, 
                    borderRadius: "10px",
                    padding: "12px 14px", 
                    background: TH.bgSurface, 
                    cursor: "pointer", 
                    transition: "border-color .15s"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = TH.blue; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = TH.border; }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    marginBottom: "4px" 
                  }}>
                    <span className="font-mono" style={{ 
                      fontSize: "11px", 
                      fontWeight: 700, 
                      color: TH.text1 
                    }}>{o.nom}</span>
                    <span style={{
                      background: typeBg, 
                      color: typeTx, 
                      border: `1px solid ${typeBd}`,
                      borderRadius: "20px", 
                      padding: "2px 8px", 
                      fontSize: "9px", 
                      fontWeight: 700
                    }}>
                      ODF {o.type || "EXTERNE"}
                    </span>
                  </div>
                  <div style={{ fontSize: "10px", color: TH.text3, marginBottom: "5px" }}>
                    {o.isActive ? "Activé" : "Non activé"}
                  </div>
                  <div style={{ 
                    height: "4px", 
                    background: TH.border, 
                    borderRadius: "2px", 
                    overflow: "hidden", 
                    marginBottom: "4px" 
                  }}>
                    <div style={{ 
                      height: "100%", 
                      borderRadius: "2px", 
                      background: `linear-gradient(90deg,${TH.green},${TH.blue})`,
                      width: `${pct}%`, 
                      transition: "width .5s" 
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                    <span style={{ color: TH.text3 }}>{o.total} ports</span>
                    <span style={{ fontWeight: 700, color: pctColor }}>{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!stats?.totalPorts && sites.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 24px", color: TH.text3 }}>
          <div style={{ fontSize: "36px", marginBottom: "14px" }}>📡</div>
          <div style={{ fontSize: "14px" }}>{t.noData}</div>
        </div>
      )}
    </div>
  );
}
