import { useState, useEffect } from "react";
import { getSites, getSalles, getRacks, getOdfs, getSlots, getPortsFlat } from "../supabase.js";

const fmt = d => d 
  ? new Date(d).toLocaleDateString("fr-DJ", { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric", 
      hour: "2-digit", 
      minute: "2-digit" 
    }) 
  : "—";

function Sel({ value, onChange, children, TH, disabled = false, highlight = false, style = {} }) {
  return (
    <select 
      value={value} 
      onChange={e => onChange(e.target.value)} 
      disabled={disabled}
      style={{
        background: TH.bgInput, 
        border: `1px solid ${highlight ? "#3B82F6" : TH.border}`,
        borderRadius: "8px", 
        padding: "7px 10px", 
        color: disabled ? TH.text3 : highlight ? "#3B82F6" : TH.text1,
        fontSize: "12px", 
        cursor: disabled ? "not-allowed" : "pointer", 
        opacity: disabled ? 0.5 : 1, 
        outline: "none",
        ...style
      }}>
      {children}
    </select>
  );
}

function Bdg({ status, TH }) {
  const SC = {
    LIBRE: { 
      bg: "rgba(255,255,255,.04)", 
      tx: "#3D5473", 
      bd: "rgba(255,255,255,.07)", 
      dot: "#3D5473" 
    },
    OCCUPE: { 
      bg: "rgba(16,185,129,.15)", 
      tx: "#34D399", 
      bd: "rgba(52,211,153,.3)", 
      dot: "#10B981" 
    },
    MAUVAIS: { 
      bg: "rgba(248,113,113,.15)", 
      tx: "#F87171", 
      bd: "rgba(248,113,113,.3)", 
      dot: "#EF4444" 
    },
  };
  const c = SC[status] || SC.LIBRE;
  return (
    <span style={{
      display: "inline-flex", 
      alignItems: "center", 
      gap: "5px", 
      background: c.bg, 
      color: c.tx,
      border: `1px solid ${c.bd}`, 
      borderRadius: "20px", 
      padding: "2px 10px", 
      fontSize: "11px", 
      fontWeight: 600
    }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: c.dot }} />
      {status}
    </span>
  );
}

function ItemCard({ icon, title, subtitle, badge, badgeColor, TH, onClick }) {
  return (
    <div onClick={onClick}
      style={{
        background: TH.bgCard, 
        border: `1px solid ${TH.border}`, 
        borderRadius: "12px",
        padding: "16px 20px", 
        display: "flex", 
        alignItems: "center", 
        gap: "14px",
        cursor: onClick ? "pointer" : "default", 
        transition: "border-color .15s, background .15s"
      }}
      onMouseEnter={e => { 
        if (onClick) { 
          e.currentTarget.style.borderColor = "#3B82F6"; 
          e.currentTarget.style.background = TH.bgHover; 
        } 
      }}
      onMouseLeave={e => { 
        if (onClick) { 
          e.currentTarget.style.borderColor = TH.border; 
          e.currentTarget.style.background = TH.bgCard; 
        } 
      }}>
      <span style={{ fontSize: "22px" }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontFamily: "'Syne',sans-serif", 
          fontWeight: 700, 
          color: TH.text1, 
          fontSize: "14px" 
        }}>{title}</div>
        {subtitle && (
          <div style={{ color: TH.text3, fontSize: "11px", marginTop: "2px" }}>
            {subtitle}
          </div>
        )}
      </div>
      {badge !== undefined && (
        <span style={{
          background: `${badgeColor || "#3B82F6"}22`, 
          color: badgeColor || "#3B82F6",
          border: `1px solid ${badgeColor || "#3B82F6"}44`, 
          borderRadius: "8px",
          padding: "4px 12px", 
          fontSize: "13px", 
          fontWeight: 700, 
          fontFamily: "'JetBrains Mono',monospace"
        }}>
          {badge}
        </span>
      )}
    </div>
  );
}

export default function SearchView({ t, TH }) {
  // Données globales
  const [allPorts, setAllPorts] = useState([]);
  const [sites, setSites] = useState([]);
  const [salles, setSalles] = useState([]);
  const [racks, setRacks] = useState([]);
  const [odfs, setOdfs] = useState([]);
  const [slots, setSlots] = useState([]);

  // Sélections
  const [selSite, setSelSite] = useState("");
  const [selSalle, setSelSalle] = useState("");
  const [selRack, setSelRack] = useState("");
  const [selOdf, setSelOdf] = useState("");
  const [selSlot, setSelSlot] = useState("");
  const [selPort, setSelPort] = useState("");

  // Filtres globaux / terminaux toujours disponibles
  const [selStatut, setSelStatut] = useState("");
  const [txtCid, setTxtCid] = useState("");

  const STATUTS = Array.from(new Set(allPorts.map(p => p.statut).filter(Boolean))).sort();

  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const PER = 25;

  // Chargement initial des sites et de tous les ports pour recherche globale
  useEffect(() => {
    setLoading(true);
    Promise.all([getSites(), getPortsFlat()])
      .then(([sitesRes, portsRes]) => {
        setSites(sitesRes.data || []);
        setAllPorts(portsRes.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // CASCADE site → salles
  useEffect(() => {
    setSalles([]); 
    setRacks([]); 
    setOdfs([]); 
    setSlots([]); 
    setSelPort("");
    setSelSalle(""); 
    setSelRack(""); 
    setSelOdf(""); 
    setSelSlot("");
    if (selSite) {
      setLoading(true);
      getSalles(selSite).then(r => { 
        setSalles(r.data || []); 
        setLoading(false); 
      });
    }
  }, [selSite]);

  // CASCADE salle → racks
  useEffect(() => {
    setRacks([]); 
    setOdfs([]); 
    setSlots([]); 
    setSelPort("");
    setSelRack(""); 
    setSelOdf(""); 
    setSelSlot("");
    if (selSalle) {
      setLoading(true);
      getRacks(selSite, selSalle).then(r => { 
        setRacks(r.data || []); 
        setLoading(false); 
      });
    }
  }, [selSalle]);

  // CASCADE rack → ODFs
  useEffect(() => {
    setOdfs([]); 
    setSlots([]); 
    setSelPort("");
    setSelOdf(""); 
    setSelSlot("");
    if (selRack) {
      setLoading(true);
      getOdfs(selRack).then(r => { 
        setOdfs(r.data || []); 
        setLoading(false); 
      });
    }
  }, [selRack]);

  // CASCADE ODF → slots
  useEffect(() => {
    setSlots([]); 
    setSelPort("");
    setSelSlot("");
    if (selOdf) {
      setLoading(true);
      getSlots(selOdf).then(r => { 
        setSlots(r.data || []); 
        setLoading(false); 
      });
    }
  }, [selOdf]);

  // Ports disponibles dans le slot sélectionné (pour le select Port)
  const portsInSlot = selSlot
    ? allPorts.filter(p => p.slots?.id === selSlot || p.slot_id === selSlot)
    : [];

  // Déterminer si nous faisons une recherche par mot-clé globale
  const isSearchActive = txtCid.trim() !== "" || selStatut !== "";

  // Filtrage global des ports en fonction de la cascade + filtres textuels
  const filteredPorts = allPorts.filter(p => {
    const rack = p.slots?.odfs?.racks;
    const site = rack?.sites;
    const salle = rack?.salles;
    const odf = p.slots?.odfs;
    const slot = p.slots;

    // Filtres cascade
    if (selSite && site?.id !== selSite) return false;
    if (selSalle && salle?.id !== selSalle) return false;
    if (selRack && rack?.id !== selRack) return false;
    if (selOdf && odf?.id !== selOdf) return false;
    if (selSlot && slot?.id !== selSlot) return false;
    if (selPort && p.id !== selPort) return false;

    // Filtres textuels / globaux
    if (selStatut && p.statut !== selStatut) return false;
    if (txtCid && !(p.cid || "").toLowerCase().includes(txtCid.toLowerCase())) {
      return false;
    }

    return true;
  });

  const paginatedPorts = filteredPorts.slice(page * PER, (page + 1) * PER);
  const totalPages = Math.ceil(filteredPorts.length / PER);

  // Déterminer le niveau d'affichage de l'explorateur (si pas de recherche globale)
  const explorerLevel = selSlot 
    ? "ports" 
    : selOdf 
      ? "slots" 
      : selRack 
        ? "odfs" 
        : selSalle 
          ? "racks" 
          : selSite 
            ? "salles" 
            : "sites";

  const inp = {
    background: TH.bgInput, 
    border: `1px solid ${TH.border}`, 
    borderRadius: "8px",
    padding: "7px 10px", 
    color: TH.text1, 
    fontSize: "12px", 
    outline: "none"
  };

  const reset = () => {
    setSelSite(""); 
    setSelSalle(""); 
    setSelRack(""); 
    setSelOdf(""); 
    setSelSlot(""); 
    setSelPort("");
    setSelStatut(""); 
    setTxtCid(""); 
    setPage(0);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: "center", padding: "60px", color: TH.text3 }}>
          Chargement…
        </div>
      );
    }

    // ── MODE RECHERCHE ACTIVÉ (CID ou Capacité saisi) ──
    if (isSearchActive) {
      return (
        <div>
          <div style={{ 
            padding: "14px 20px", 
            color: TH.text3, 
            fontSize: "12px", 
            fontWeight: 600, 
            letterSpacing: "1px", 
            textTransform: "uppercase", 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center" 
          }}>
            <span>Résultats de recherche ({filteredPorts.length} port(s) trouvé(s))</span>
            {filteredPorts.length > 0 && (
              <button 
                onClick={() => {
                  const h = [
                    "Site", 
                    "Salle", 
                    "Rack", 
                    "ODF", 
                    "Slot", 
                    "Port", 
                    "Statut", 
                    "CID", 
                    "Owner", 
                    "OT#", 
                    "Destination", 
                    "Modifié"
                  ];
                  const rows = filteredPorts.map(p => [
                    p.slots?.odfs?.racks?.sites?.name || "",
                    p.slots?.odfs?.racks?.salles?.name || "",
                    p.slots?.odfs?.racks?.name || "",
                    p.slots?.odfs?.name || "",
                    p.slots?.name || "",
                    p.slot_port || "",
                    p.statut || "",
                    p.cid || "", 
                    p.owner || "", 
                    p.ot_num || "", 
                    p.destination || "", 
                    fmt(p.updated_at)
                  ]);
                  const csv = [h, ...rows]
                    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
                    .join("\n");
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(
                    new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" })
                  );
                  a.download = `recherche_globale_${new Date().toISOString().slice(0, 10)}.csv`; 
                  a.click();
                }} 
                style={{ 
                  background: TH.blue, 
                  border: "none", 
                  borderRadius: "8px", 
                  padding: "5px 12px", 
                  color: "#fff", 
                  fontSize: "11px", 
                  fontWeight: 600, 
                  cursor: "pointer" 
                }}>
                ⬇ CSV
              </button>
            )}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
              <tr style={{ background: TH.bgSurface, borderBottom: `2px solid ${TH.border}` }}>
                {[
                  "Site", 
                  "Salle", 
                  "Rack", 
                  "ODF", 
                  "Slot", 
                  "Port", 
                  "Statut", 
                  "CID", 
                  "Owner", 
                  "OT#", 
                  "Destination", 
                  "Modifié"
                ].map(h => (
                  <th 
                    key={h} 
                    style={{ 
                      padding: "10px 12px", 
                      textAlign: "left", 
                      color: TH.text3, 
                      fontWeight: 600, 
                      fontSize: "11px", 
                      letterSpacing: "0.5px", 
                      whiteSpace: "nowrap" 
                    }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedPorts.map((p, i) => {
                const rk = p.slots?.odfs?.racks;
                return (
                  <tr 
                    key={p.id} 
                    style={{ 
                      borderBottom: `1px solid ${TH.border}`, 
                      background: i % 2 === 0 ? "transparent" : TH.bgHover 
                    }}>
                    <td style={{ padding: "9px 12px", color: TH.blue, fontWeight: 600 }}>
                      {rk?.sites?.name || "—"} ({rk?.sites?.id || ""})
                    </td>
                    <td style={{ padding: "9px 12px", color: TH.text2 }}>
                      {rk?.salles?.name || "—"}
                    </td>
                    <td style={{ padding: "9px 12px", color: TH.text2 }}>
                      {rk?.name || "—"}
                    </td>
                    <td style={{ padding: "9px 12px", color: TH.text2 }}>
                      {p.slots?.odfs?.name || "—"}
                    </td>
                    <td style={{ padding: "9px 12px", color: TH.text2 }}>
                      {p.slots?.name || "—"}
                    </td>
                    <td style={{ 
                      padding: "9px 12px", 
                      fontFamily: "'JetBrains Mono',monospace", 
                      color: TH.text1, 
                      fontWeight: 600 
                    }}>
                      {p.slot_port}
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      <Bdg status={p.statut} TH={TH} />
                    </td>
                    <td style={{ 
                      padding: "9px 12px", 
                      fontFamily: "'JetBrains Mono',monospace", 
                      color: TH.cyan, 
                      fontSize: "11px" 
                    }}>
                      {p.cid || "—"}
                    </td>
                    <td style={{ padding: "9px 12px", color: TH.text2 }}>
                      {p.owner || "—"}
                    </td>
                    <td style={{ padding: "9px 12px", color: TH.text2 }}>
                      {p.ot_num || "—"}
                    </td>
                    <td style={{ padding: "9px 12px", color: TH.text2 }}>
                      {p.destination || "—"}
                    </td>
                    <td style={{ padding: "9px 12px", color: TH.text3, fontSize: "11px" }}>
                      {fmt(p.updated_at)}
                    </td>
                  </tr>
                );
              })}
              {!paginatedPorts.length && (
                <tr>
                  <td 
                    colSpan={13} 
                    style={{ padding: "50px", textAlign: "center", color: TH.text3 }}>
                    Aucun port correspondant aux critères globaux
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              gap: "8px", 
              padding: "10px", 
              borderTop: `1px solid ${TH.border}` 
            }}>
              <button 
                onClick={() => setPage(p => Math.max(0, p - 1))} 
                disabled={page === 0} 
                style={{ 
                  ...inp, 
                  cursor: page === 0 ? "not-allowed" : "pointer", 
                  opacity: page === 0 ? 0.4 : 1 
                }}>
                ‹
              </button>
              <span style={{ color: TH.text2, fontSize: "12px" }}>
                Page {page + 1} / {totalPages} — {filteredPorts.length} résultats
              </span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} 
                disabled={page === totalPages - 1} 
                style={{ 
                  ...inp, 
                  cursor: page === totalPages - 1 ? "not-allowed" : "pointer", 
                  opacity: page === totalPages - 1 ? 0.4 : 1 
                }}>
                ›
              </button>
            </div>
          )}
        </div>
      );
    }

    // ── MODE EXPLORATEUR HIÉRARCHIQUE ──
    if (explorerLevel === "sites") {
      return (
        <div>
          <div style={{ 
            padding: "14px 20px", 
            color: TH.text3, 
            fontSize: "12px", 
            fontWeight: 600, 
            letterSpacing: "1px", 
            textTransform: "uppercase" 
          }}>
            {sites.length} site(s) disponible(s)
          </div>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", 
            gap: "12px", 
            padding: "0 20px 20px" 
          }}>
            {sites.map(s => (
              <ItemCard 
                key={s.id} 
                icon="🌐" 
                title={s.name} 
                subtitle={s.description || s.id} 
                badge={s.id} 
                badgeColor="#3B82F6" 
                TH={TH} 
                onClick={() => setSelSite(s.id)} 
              />
            ))}
          </div>
        </div>
      );
    }

    if (explorerLevel === "salles") {
      const currentSiteName = sites.find(s => s.id === selSite)?.name || selSite;
      return (
        <div>
          <div style={{ 
            padding: "14px 20px", 
            color: TH.text3, 
            fontSize: "12px", 
            fontWeight: 600, 
            letterSpacing: "1px", 
            textTransform: "uppercase" 
          }}>
            {salles.length} salle(s) dans {currentSiteName}
          </div>
          {!salles.length && (
            <div style={{ textAlign: "center", padding: "40px", color: TH.text3 }}>
              Aucune salle dans ce site
            </div>
          )}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", 
            gap: "12px", 
            padding: "0 20px 20px" 
          }}>
            {salles.map(s => (
              <ItemCard 
                key={s.id} 
                icon="🏢" 
                title={`Salle ${s.name}`} 
                subtitle={s.id} 
                badge={s.name} 
                badgeColor="#22D3EE" 
                TH={TH} 
                onClick={() => setSelSalle(s.id)} 
              />
            ))}
          </div>
        </div>
      );
    }

    if (explorerLevel === "racks") {
      const currentSalleName = salles.find(s => s.id === selSalle)?.name || selSalle;
      return (
        <div>
          <div style={{ 
            padding: "14px 20px", 
            color: TH.text3, 
            fontSize: "12px", 
            fontWeight: 600, 
            letterSpacing: "1px", 
            textTransform: "uppercase" 
          }}>
            {racks.length} rack(s) dans Salle {currentSalleName}
          </div>
          {!racks.length && (
            <div style={{ textAlign: "center", padding: "40px", color: TH.text3 }}>
              Aucun rack dans cette salle
            </div>
          )}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", 
            gap: "12px", 
            padding: "0 20px 20px" 
          }}>
            {racks.map(r => (
              <ItemCard 
                key={r.id} 
                icon="🔲" 
                title={r.name} 
                subtitle={r.id} 
                badge={r.name} 
                badgeColor="#A78BFA" 
                TH={TH} 
                onClick={() => setSelRack(r.id)} 
              />
            ))}
          </div>
        </div>
      );
    }

    if (explorerLevel === "odfs") {
      const currentRackName = racks.find(r => r.id === selRack)?.name || selRack;
      return (
        <div>
          <div style={{ 
            padding: "14px 20px", 
            color: TH.text3, 
            fontSize: "12px", 
            fontWeight: 600, 
            letterSpacing: "1px", 
            textTransform: "uppercase" 
          }}>
            {odfs.length} ODF(s) dans Rack {currentRackName}
          </div>
          {!odfs.length && (
            <div style={{ textAlign: "center", padding: "40px", color: TH.text3 }}>
              Aucun ODF dans ce rack
            </div>
          )}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", 
            gap: "12px", 
            padding: "0 20px 20px" 
          }}>
            {odfs.map(o => (
              <ItemCard 
                key={o.id} 
                icon="◉" 
                title={o.name} 
                subtitle={`${o.odf_type || "EXTERNE"} — ${o.id}`} 
                badge={o.odf_type || "EXT"} 
                badgeColor={o.odf_type === "INTERNE" ? "#A78BFA" : "#3B82F6"} 
                TH={TH} 
                onClick={() => setSelOdf(o.id)} 
              />
            ))}
          </div>
        </div>
      );
    }

    if (explorerLevel === "slots") {
      const currentOdfName = odfs.find(o => o.id === selOdf)?.name || selOdf;
      return (
        <div>
          <div style={{ 
            padding: "14px 20px", 
            color: TH.text3, 
            fontSize: "12px", 
            fontWeight: 600, 
            letterSpacing: "1px", 
            textTransform: "uppercase" 
          }}>
            {slots.length} slot(s) dans ODF {currentOdfName}
          </div>
          {!slots.length && (
            <div style={{ textAlign: "center", padding: "40px", color: TH.text3 }}>
              Aucun slot dans cet ODF
            </div>
          )}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", 
            gap: "12px", 
            padding: "0 20px 20px" 
          }}>
            {slots.map(s => (
              <ItemCard 
                key={s.id} 
                icon="📦" 
                title={s.name} 
                subtitle={s.id} 
                badge={`Slot ${s.slot_num}`} 
                badgeColor="#FBBF24" 
                TH={TH} 
                onClick={() => setSelSlot(s.id)} 
              />
            ))}
          </div>
        </div>
      );
    }

    if (explorerLevel === "ports") {
      // Niveau terminal de l'explorateur : affiche les ports de ce slot spécifique
      const ctxCols = [
        selSite && { 
          label: "Site", 
          val: sites.find(s => s.id === selSite)?.name, 
          color: "#3B82F6" 
        },
        selSalle && { 
          label: "Salle", 
          val: salles.find(s => s.id === selSalle)?.name, 
          color: "#22D3EE" 
        },
        selRack && { 
          label: "Rack", 
          val: racks.find(r => r.id === selRack)?.name, 
          color: "#A78BFA" 
        },
        selOdf && { 
          label: "ODF", 
          val: odfs.find(o => o.id === selOdf)?.name, 
          color: "#FBBF24" 
        },
        selSlot && { 
          label: "Slot", 
          val: slots.find(s => s.id === selSlot)?.name, 
          color: "#10B981" 
        },
      ].filter(Boolean);

      return (
        <div>
          <div style={{ 
            padding: "12px 20px", 
            borderBottom: `1px solid ${TH.border}`, 
            display: "flex", 
            gap: "8px", 
            flexWrap: "wrap", 
            alignItems: "center" 
          }}>
            <Sel value={selPort} onChange={setSelPort} TH={TH} highlight={!!selPort}>
              <option value="">🔌 Tous ports ({portsInSlot.length})</option>
              {portsInSlot.map(p => {
                const labelText = `${p.slot_port} — ${p.statut}${p.cid ? ` — ${p.cid}` : ""}`;
                return (
                  <option key={p.id} value={p.id}>
                    {labelText}
                  </option>
                );
              })}
            </Sel>
            <span style={{ 
              color: TH.text3, 
              fontSize: "11px", 
              marginLeft: "auto" 
            }}>
              {filteredPorts.length}/{portsInSlot.length} port(s)
            </span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
              <tr style={{ background: TH.bgSurface, borderBottom: `2px solid ${TH.border}` }}>
                {ctxCols.map(c => (
                  <th 
                    key={c.label} 
                    style={{ 
                      padding: "10px 12px", 
                      textAlign: "left", 
                      color: c.color, 
                      fontWeight: 700, 
                      fontSize: "11px", 
                      letterSpacing: "0.5px", 
                      whiteSpace: "nowrap" 
                    }}>
                    {c.label}
                  </th>
                ))}
                {[
                  "Port", 
                  "Statut", 
                  "CID", 
                  "Owner", 
                  "OT#", 
                  "Destination", 
                  "Modifié"
                ].map(h => (
                  <th 
                    key={h} 
                    style={{ 
                      padding: "10px 12px", 
                      textAlign: "left", 
                      color: TH.text3, 
                      fontWeight: 600, 
                      fontSize: "11px", 
                      letterSpacing: "0.5px", 
                      whiteSpace: "nowrap" 
                    }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPorts.map((p, i) => (
                <tr 
                  key={p.id} 
                  style={{ 
                    borderBottom: `1px solid ${TH.border}`, 
                    background: i % 2 === 0 ? "transparent" : TH.bgHover 
                  }}>
                  {ctxCols.map(c => (
                    <td 
                      key={c.label} 
                      style={{ 
                        padding: "9px 12px", 
                        color: c.color, 
                        fontWeight: 600, 
                        fontSize: "11px", 
                        whiteSpace: "nowrap" 
                      }}>
                      {c.val}
                    </td>
                  ))}
                  <td style={{ 
                    padding: "9px 12px", 
                    fontFamily: "'JetBrains Mono',monospace", 
                    color: TH.text1, 
                    fontWeight: 600 
                  }}>
                    {p.slot_port}
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    <Bdg status={p.statut} TH={TH} />
                  </td>
                  <td style={{ 
                    padding: "9px 12px", 
                    fontFamily: "'JetBrains Mono',monospace", 
                    color: TH.cyan, 
                    fontSize: "11px" 
                  }}>
                    {p.cid || "—"}
                  </td>
                  <td style={{ padding: "9px 12px", color: TH.text2 }}>
                    {p.owner || "—"}
                  </td>
                  <td style={{ padding: "9px 12px", color: TH.text2 }}>
                    {p.ot_num || "—"}
                  </td>
                  <td style={{ padding: "9px 12px", color: TH.text2 }}>
                    {p.destination || "—"}
                  </td>
                  <td style={{ padding: "9px 12px", color: TH.text3, fontSize: "11px" }}>
                    {fmt(p.updated_at)}
                  </td>
                </tr>
              ))}
              {!filteredPorts.length && (
                <tr>
                  <td 
                    colSpan={ctxCols.length + 8} 
                    style={{ padding: "40px", textAlign: "center", color: TH.text3 }}>
                    Aucun port correspondant aux critères
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }
  };

  // Fil d'Ariane
  const crumbs = [
    selSite && { 
      label: sites.find(s => s.id === selSite)?.name || selSite, 
      clear: () => setSelSite(""), 
      color: "#3B82F6" 
    },
    selSalle && { 
      label: `Salle ${salles.find(s => s.id === selSalle)?.name || selSalle}`, 
      clear: () => setSelSalle(""), 
      color: "#22D3EE" 
    },
    selRack && { 
      label: racks.find(r => r.id === selRack)?.name || selRack, 
      clear: () => setSelRack(""), 
      color: "#A78BFA" 
    },
    selOdf && { 
      label: odfs.find(o => o.id === selOdf)?.name || selOdf, 
      clear: () => setSelOdf(""), 
      color: "#FBBF24" 
    },
    selSlot && { 
      label: slots.find(s => s.id === selSlot)?.name || selSlot, 
      clear: () => setSelSlot(""), 
      color: "#10B981" 
    },
  ].filter(Boolean);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* ── Barre de Recherche Globale (Toujours Disponible) ── */}
      <div style={{ 
        padding: "12px 20px", 
        borderBottom: `1px solid ${TH.border}`, 
        background: TH.bgCard, 
        display: "flex", 
        gap: "8px", 
        flexWrap: "wrap", 
        alignItems: "center", 
        flexShrink: 0 
      }}>
        <input 
          value={txtCid} 
          onChange={e => { setTxtCid(e.target.value); setPage(0); }}
          placeholder="🔑 Rechercher globalement par CID…" 
          style={{ ...inp, flex: 2, minWidth: "200px" }} 
        />
        <Sel 
          value={selStatut} 
          onChange={v => { setSelStatut(v); setPage(0); }} 
          TH={TH} 
          highlight={!!selStatut} 
          style={{ flex: 1, minWidth: "120px" }}>
          <option value="">Statut global</option>
          {STATUTS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Sel>
        {(selSite || isSearchActive) && (
          <button 
            onClick={reset}
            style={{
              background: "transparent", 
              border: `1px solid ${TH.border}`, 
              borderRadius: "8px",
              padding: "7px 12px", 
              color: TH.text2, 
              fontSize: "11px", 
              cursor: "pointer", 
              transition: "all 0.15s"
            }}>
            ✕ Réinitialiser filtres
          </button>
        )}
      </div>

      {/* ── Sélecteurs de navigation par cascade ── */}
      <div style={{ 
        padding: "10px 20px", 
        borderBottom: `1px solid ${TH.border}`, 
        background: TH.bgSurface, 
        display: "flex", 
        alignItems: "center", 
        gap: "8px", 
        flexWrap: "wrap", 
        flexShrink: 0 
      }}>
        <span style={{ 
          fontFamily: "'Syne',sans-serif", 
          fontWeight: 700, 
          color: TH.text1, 
          fontSize: "12px", 
          marginRight: "4px" 
        }}>
          Filtrer par hiérarchie :
        </span>
        {/* Site */}
        <Sel value={selSite} onChange={setSelSite} TH={TH} highlight={!!selSite}>
          <option value="">🌐 Tous les sites ({sites.length})</option>
          {sites.map(s => (
            <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
          ))}
        </Sel>
        {/* Salle */}
        {selSite && (
          <Sel value={selSalle} onChange={setSelSalle} TH={TH} highlight={!!selSalle}>
            <option value="">🏢 Toutes salles ({salles.length})</option>
            {salles.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Sel>
        )}
        {/* Rack */}
        {selSalle && (
          <Sel value={selRack} onChange={setSelRack} TH={TH} highlight={!!selRack}>
            <option value="">🔲 Tous racks ({racks.length})</option>
            {racks.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </Sel>
        )}
        {/* ODF */}
        {selRack && (
          <Sel value={selOdf} onChange={setSelOdf} TH={TH} highlight={!!selOdf}>
            <option value="">◉ Tous ODFs ({odfs.length})</option>
            {odfs.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </Sel>
        )}
        {/* Slot */}
        {selOdf && (
          <Sel value={selSlot} onChange={setSelSlot} TH={TH} highlight={!!selSlot}>
            <option value="">📦 Tous slots ({slots.length})</option>
            {slots.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Sel>
        )}
      </div>

      {/* ── Fil d'Ariane (Breadcrumbs) ── */}
      {crumbs.length > 0 && (
        <div style={{ 
          padding: "8px 20px", 
          borderBottom: `1px solid ${TH.border}`, 
          background: TH.bgSurface, 
          display: "flex", 
          alignItems: "center", 
          gap: "6px", 
          flexWrap: "wrap", 
          flexShrink: 0 
        }}>
          <span style={{ color: TH.text3, fontSize: "11px" }}>📍</span>
          {crumbs.map((c, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              {i > 0 && <span style={{ color: TH.text3, fontSize: "11px" }}>›</span>}
              <span style={{
                background: `${c.color}22`, 
                color: c.color, 
                border: `1px solid ${c.color}44`,
                borderRadius: "6px", 
                padding: "2px 8px", 
                fontSize: "11px", 
                fontWeight: 600
              }}>
                {c.label}
              </span>
              <button 
                onClick={c.clear} 
                style={{ 
                  background: "transparent", 
                  border: "none", 
                  color: TH.text3, 
                  fontSize: "11px", 
                  cursor: "pointer", 
                  padding: "0 2px" 
                }}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── Zone d'Affichage Principale ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {renderContent()}
      </div>
    </div>
  );
}
