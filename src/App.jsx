// ODF Manager V6 — Omega Tech · Djibouti Telecom
// Nouveautés V6 :
//   • Supabase Auth réelle (signIn / signOut / session)
//   • Schéma étendu : Sites → Salles → Racks → ODFs → Cassettes → Ports
//   • Câbles Fibre avec vue d'interconnexion
//   • Export CSV du registre filtré
//   • Export PDF étiquettes ports (impression navigateur)
//   • Historique persistant Supabase
//   • Règle immuable V5 : zéro === dans JSX style props → THEMES[theme].xxx

import { useState, useEffect, useCallback, useRef } from "react";
import {
  supabase, signIn, signOut, getSession,
  getSites, createSite, deleteSite,
  getRacks, createRack, deleteRack,
  getOdfs, createOdf, deleteOdf,
  getSlots, createSlot, deleteSlot,
  getPorts, updatePort, getPortsFlat,
  getCables, createCable, deleteCable,
  getClients, getFournisseurs, getJarretieres,
  getServices, createService, deleteService,
  addServiceJonctions, getServiceRoutes,
  addHistory, getHistory, getStats,
} from "./supabase.js";

// ═══════════════════════════════════════════════════════════════════════════
// THEMES  (règle V5 : zéro theme=== dans JSX style props)
// ═══════════════════════════════════════════════════════════════════════════
const THEMES = {
  dark: {
    bgBase:"#0B1427", bgSurface:"#111C30", bgCard:"#152036",
    bgHover:"rgba(255,255,255,0.04)", bgInput:"rgba(255,255,255,0.06)",
    border:"rgba(255,255,255,0.08)", border2:"rgba(255,255,255,0.15)",
    text1:"#E8F0FE", text2:"#7A9BBF", text3:"#3D5473",
    blue:"#3B82F6", blueGlow:"rgba(59,130,246,0.2)",
    cyan:"#22D3EE", gold:"#FBBF24", green:"#10B981",
    red:"#F87171", orange:"#FB923C", purple:"#A78BFA",
    sidebarBg:"#08111E",
    cardShadow:"0 2px 16px rgba(0,0,0,0.35)",
    glassShadow:"0 8px 32px rgba(0,0,0,0.55)",
    activeGlow:"0 0 20px rgba(59,130,246,0.4)",
    statusGlow: true,
    backdropFilter:"blur(20px)",
    topbarShadow:"0 1px 0 rgba(255,255,255,0.05)",
    modalHeaderBg:"rgba(59,130,246,0.06)",
    drawerShadow:"-8px 0 40px rgba(0,0,0,0.6)",
    loginCardBg:"rgba(11,20,39,0.98)",
    sc:{
      ACTIF:   {bg:"rgba(16,185,129,.15)",tx:"#34D399",bd:"rgba(52,211,153,.3)",  dot:"#10B981"},
      INTERNE: {bg:"rgba(59,130,246,.15)",tx:"#60A5FA",bd:"rgba(96,165,250,.3)",  dot:"#3B82F6"},
      INCONNU: {bg:"rgba(248,113,113,.15)",tx:"#F87171",bd:"rgba(248,113,113,.3)",dot:"#EF4444"},
      RÉSERVÉ: {bg:"rgba(251,191,36,.15)", tx:"#FBBF24",bd:"rgba(251,191,36,.3)", dot:"#F59E0B"},
      LIBRE:   {bg:"rgba(255,255,255,.04)",tx:"#3D5473",bd:"rgba(255,255,255,.07)",dot:"#3D5473"},
    },
  },
  light: {
    bgBase:"#F0F5FF", bgSurface:"#FFFFFF", bgCard:"#FFFFFF",
    bgHover:"rgba(0,0,0,0.03)", bgInput:"rgba(0,0,0,0.04)",
    border:"#E2E8F0", border2:"#CBD5E1",
    text1:"#0F172A", text2:"#475569", text3:"#94A3B8",
    blue:"#1D4ED8", blueGlow:"rgba(29,78,216,0.12)",
    cyan:"#0891B2", gold:"#D97706", green:"#059669",
    red:"#DC2626", orange:"#EA580C", purple:"#7C3AED",
    sidebarBg:"#0F172A",
    cardShadow:"0 2px 12px rgba(15,23,42,0.08)",
    glassShadow:"0 4px 20px rgba(15,23,42,0.12)",
    activeGlow:"0 0 12px rgba(29,78,216,0.2)",
    statusGlow: false,
    backdropFilter:"none",
    topbarShadow:"0 1px 8px rgba(15,23,42,0.06)",
    modalHeaderBg:"rgba(0,0,0,0.03)",
    drawerShadow:"-4px 0 20px rgba(15,23,42,0.12)",
    loginCardBg:"rgba(255,255,255,0.97)",
    sc:{
      ACTIF:   {bg:"#D1FAE5",tx:"#065F46",bd:"#6EE7B7",dot:"#10B981"},
      INTERNE: {bg:"#DBEAFE",tx:"#1E40AF",bd:"#93C5FD",dot:"#3B82F6"},
      INCONNU: {bg:"#FEE2E2",tx:"#991B1B",bd:"#FCA5A5",dot:"#EF4444"},
      RÉSERVÉ: {bg:"#FEF3C7",tx:"#92400E",bd:"#FCD34D",dot:"#F59E0B"},
      LIBRE:   {bg:"#F1F5F9",tx:"#94A3B8",bd:"#CBD5E1",dot:"#475569"},
    },
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// TRADUCTIONS
// ═══════════════════════════════════════════════════════════════════════════
const T = {
  fr: {
    appName:"ODF Manager", appSub:"Omega Tech · Djibouti Telecom",
    login:"Connexion", logout:"Déconnexion",
    email:"Email", password:"Mot de passe", signin:"Se connecter",
    dashboard:"Tableau de bord", registry:"Registre", odfPanel:"Panneau ODF",
    cables:"Câbles Fibre", services:"Services", manage:"Gérer Infra", history:"Historique", alerts:"Alertes",
    sites:"Sites", racks:"Racks", odfs:"ODFs", slots:"Slots", ports:"Ports",
    totalPorts:"Total Ports", free:"Libres", active:"Actifs", internal:"Internes",
    unknown:"Inconnus", reserved:"Réservés",
    search:"Rechercher…", filter:"Filtrer", export:"Exporter",
    exportCSV:"Export CSV", exportPDF:"Export PDF Étiquettes",
    add:"Ajouter", save:"Enregistrer", cancel:"Annuler", delete:"Supprimer", edit:"Modifier",
    confirmDelete:"Confirmer la suppression ?", yes:"Oui", no:"Non",
    siteName:"Nom du site", salleName:"Nom de la salle", rackName:"Nom du rack",
    odfName:"Nom de l'ODF", slotName:"Nom du slot",
    portName:"Nom du port", status:"Statut", client:"Client (OT)", cid:"CID",
    operator:"Owner", capacity:"Capacité", destination:"Destination",
    notes:"Remarques", updatedAt:"Modifié le",
    cableRef:"Référence câble", fiberType:"Type fibre", source:"Source", dest:"Destination",
    pathSource:"Chemin source", pathDest:"Chemin destination",
    monomode:"Monomode", multimode:"Multimode",
    noData:"Aucune donnée", loading:"Chargement…", saving:"Enregistrement…",
    saved:"Sauvegardé ✓", error:"Erreur",
    history_empty:"Aucun historique", history_action:"Action",
    selectSite:"Sélectionner un site",
    selectRack:"Sélectionner un rack", selectOdf:"Sélectionner un ODF",
    selectSlot:"Sélectionner un slot",
    allSites:"Tous les sites", allStatuses:"Tous les statuts",
    portDrawerTitle:"Détails du port", close:"Fermer",
    infraTabs:["Sites","Racks","ODFs","Slots"],
    welcome:"Bienvenue",
  },
  en: {
    appName:"ODF Manager", appSub:"Omega Tech · Djibouti Telecom",
    login:"Login", logout:"Logout",
    email:"Email", password:"Password", signin:"Sign in",
    dashboard:"Dashboard", registry:"Registry", odfPanel:"ODF Panel",
    cables:"Fiber Cables", services:"Services", manage:"Manage Infra", history:"History", alerts:"Alerts",
    sites:"Sites", racks:"Racks", odfs:"ODFs", slots:"Slots", ports:"Ports",
    totalPorts:"Total Ports", free:"Free", active:"Active", internal:"Internal",
    unknown:"Unknown", reserved:"Reserved",
    search:"Search…", filter:"Filter", export:"Export",
    exportCSV:"Export CSV", exportPDF:"Export PDF Labels",
    add:"Add", save:"Save", cancel:"Cancel", delete:"Delete", edit:"Edit",
    confirmDelete:"Confirm deletion?", yes:"Yes", no:"No",
    siteName:"Site name", salleName:"Room name", rackName:"Rack name",
    odfName:"ODF name", slotName:"Slot name",
    portName:"Port name", status:"Status", client:"Client (OT)", cid:"CID",
    operator:"Owner", capacity:"Capacity", destination:"Destination",
    notes:"Remarks", updatedAt:"Updated at",
    cableRef:"Cable reference", fiberType:"Fiber type", source:"Source", dest:"Destination",
    pathSource:"Source path", pathDest:"Destination path",
    monomode:"Single-mode", multimode:"Multi-mode",
    noData:"No data", loading:"Loading…", saving:"Saving…",
    saved:"Saved ✓", error:"Error",
    history_empty:"No history", history_action:"Action",
    selectSite:"Select a site",
    selectRack:"Select a rack", selectOdf:"Select an ODF",
    selectSlot:"Select a slot",
    allSites:"All sites", allStatuses:"All statuses",
    portDrawerTitle:"Port details", close:"Close",
    infraTabs:["Sites","Racks","ODFs","Slots"],
    welcome:"Welcome",
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// CSS GLOBAL INJECTÉ
// ═══════════════════════════════════════════════════════════════════════════
const BASE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'DM Sans',sans-serif;overflow:hidden;}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.3);border-radius:2px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideR{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
  @keyframes glow{0%,100%{box-shadow:0 0 4px currentColor}50%{box-shadow:0 0 12px currentColor}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  .fade-up{animation:fadeUp .35s ease both;}
  .slide-r{animation:slideR .3s ease both;}
  .font-syne{font-family:'Syne',sans-serif;}
  .font-mono{font-family:'JetBrains Mono',monospace;}
  input,select,textarea{outline:none;font-family:'DM Sans',sans-serif;}
  button{cursor:pointer;font-family:'DM Sans',sans-serif;}
  table{border-collapse:collapse;width:100%;}
  @media print{
    body{overflow:auto;}
    .no-print{display:none!important;}
    .print-label{break-inside:avoid;page-break-inside:avoid;}
  }
`;

// ═══════════════════════════════════════════════════════════════════════════
// STATUTS
// ═══════════════════════════════════════════════════════════════════════════
const STATUTS = ["ACTIF","INTERNE","INCONNU","RÉSERVÉ","LIBRE"];
const CODE_TO_ST = {A:"ACTIF",I:"INTERNE",N:"INCONNU",R:"RÉSERVÉ",L:"LIBRE"};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════
const fmt = (d) => d ? new Date(d).toLocaleDateString("fr-DJ",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
const uid = () => Math.random().toString(36).slice(2,9);

// Export CSV
const exportCSV = (rows, filename) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${(r[h]??'').toString().replace(/"/g,'""')}"`).join(","))].join("\n");
  const blob = new Blob(["\ufeff"+csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
};

// Export PDF labels (impression navigateur)
const exportPDFLabels = (ports) => {
  const win = window.open("","_blank");
  if (!win) return;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Étiquettes Ports ODF</title>
    <style>
      body{font-family:monospace;background:#fff;padding:20px;}
      .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
      .label{border:1px solid #333;padding:8px;font-size:9px;break-inside:avoid;}
      .label-id{font-weight:bold;font-size:10px;margin-bottom:4px;background:#1e3a5f;color:#fff;padding:2px 4px;}
      .label-row{display:flex;justify-content:space-between;}
      .st{display:inline-block;padding:1px 4px;border-radius:2px;font-weight:bold;}
      .ACTIF{background:#d1fae5;color:#065f46;}
      .INTERNE{background:#dbeafe;color:#1e40af;}
      .INCONNU{background:#fee2e2;color:#991b1b;}
      .RÉSERVÉ{background:#fef3c7;color:#92400e;}
      .LIBRE{background:#f1f5f9;color:#94a3b8;}
      @media print{body{padding:0;}button{display:none;}}
    </style></head><body>
    <button onclick="window.print()" style="margin-bottom:16px;padding:8px 16px;background:#1e3a5f;color:#fff;border:none;cursor:pointer;border-radius:4px;">🖨 Imprimer</button>
    <div class="grid">
    ${ports.map(p => {
      const path = [
        p.slots?.odfs?.racks?.sites?.name,
        p.slots?.odfs?.racks?.name,
        p.slots?.odfs?.name,
        p.slots?.name,
        p.slot_port
      ].filter(Boolean).join("/");
      return `<div class="label print-label">
        <div class="label-id">${p.slot_port||p.id}</div>
        <div class="label-row"><span>${p.owner||'—'}</span><span class="st ${p.statut}">${p.statut}</span></div>
        <div>CID: ${p.cid||'—'}</div>
        <div>OT: ${p.ot_num||'—'}</div>
        <div style="font-size:7px;color:#666;margin-top:4px;">${path}</div>
      </div>`;
    }).join("")}
    </div></body></html>`;
  win.document.write(html);
  win.document.close();
};

// ═══════════════════════════════════════════════════════════════════════════
// MICRO-COMPOSANTS (règle: aucun theme=== dans style props)
// ═══════════════════════════════════════════════════════════════════════════
function Btn({children, onClick, variant="primary", disabled, size="md", TH}){
  const base = {
    border:"none", borderRadius:"8px", cursor:disabled?"not-allowed":"pointer",
    fontFamily:"'DM Sans',sans-serif", fontWeight:600, transition:"all .2s",
    opacity: disabled ? 0.5 : 1,
    padding: size==="sm" ? "6px 12px" : size==="lg" ? "12px 24px" : "8px 16px",
    fontSize: size==="sm" ? "12px" : size==="lg" ? "15px" : "13px",
  };
  const variants = {
    primary: {background:TH.blue, color:"#fff"},
    outline: {background:"transparent", color:TH.blue, border:`1px solid ${TH.blue}`},
    danger:  {background:"transparent", color:TH.red, border:`1px solid ${TH.red}`},
    ghost:   {background:TH.bgHover, color:TH.text2},
    success: {background:"transparent", color:TH.green, border:`1px solid ${TH.green}`},
  };
  return <button onClick={onClick} disabled={disabled} style={{...base,...variants[variant]}}>{children}</button>;
}

function Inp({value, onChange, placeholder, type="text", TH, style={}}){
  return <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    style={{background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:"8px",
      padding:"8px 12px", color:TH.text1, fontSize:"13px", width:"100%", ...style}} />;
}

function Sel({value, onChange, children, TH, style={}}){
  return <select value={value} onChange={e=>onChange(e.target.value)}
    style={{background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:"8px",
      padding:"8px 12px", color:TH.text1, fontSize:"13px", width:"100%", ...style}}>
    {children}
  </select>;
}

function Bdg({status, TH}){
  const c = TH.sc[status] || TH.sc.LIBRE;
  return <span style={{display:"inline-flex", alignItems:"center", gap:"5px",
    background:c.bg, color:c.tx, border:`1px solid ${c.bd}`,
    borderRadius:"20px", padding:"2px 10px", fontSize:"11px", fontWeight:600}}>
    <span style={{width:"6px", height:"6px", borderRadius:"50%", background:c.dot,
      boxShadow: TH.statusGlow ? `0 0 6px ${c.dot}` : "none"}} />
    {status}
  </span>;
}

function Spinner({TH}){
  return <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"40px"}}>
    <div style={{width:"28px",height:"28px",borderRadius:"50%",
      border:`3px solid ${TH.border}`, borderTopColor:TH.blue, animation:"spin 0.8s linear infinite"}} />
  </div>;
}

function Modal({title, children, onClose, TH, width="500px"}){
  return <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",
    background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:TH.bgCard, border:`1px solid ${TH.border}`,
      borderRadius:"16px", width, maxWidth:"95vw", maxHeight:"85vh", overflow:"auto",
      boxShadow:TH.glassShadow}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"20px 24px", borderBottom:`1px solid ${TH.border}`, background:TH.modalHeaderBg}}>
        <span style={{fontFamily:"'Syne',sans-serif", fontWeight:700, color:TH.text1, fontSize:"16px"}}>{title}</span>
        <button onClick={onClose} style={{background:"none",border:"none",color:TH.text2,fontSize:"20px",cursor:"pointer"}}>×</button>
      </div>
      <div style={{padding:"24px"}}>{children}</div>
    </div>
  </div>;
}

function Confirm({message, onYes, onNo, TH, t}){
  return <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",
    background:"rgba(0,0,0,0.7)"}}>
    <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:"12px",
      padding:"32px", textAlign:"center", boxShadow:TH.glassShadow}}>
      <div style={{color:TH.text1, marginBottom:"20px", fontSize:"15px"}}>{message}</div>
      <div style={{display:"flex",gap:"12px",justifyContent:"center"}}>
        <Btn onClick={onYes} variant="danger" TH={TH}>{t.yes}</Btn>
        <Btn onClick={onNo} variant="ghost" TH={TH}>{t.no}</Btn>
      </div>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEMO USERS (bypass Supabase Auth pour les comptes de démonstration)
// ═══════════════════════════════════════════════════════════════════════════
const DEMO_USERS = [
  { email:"admin@demo.dj", password:"admin123", name:"Administrateur", role:"admin" },
  { email:"tech@demo.dj",  password:"tech123",  name:"Technicien",     role:"technicien" },
];

// ═══════════════════════════════════════════════════════════════════════════
// AUTH SCREEN
// ═══════════════════════════════════════════════════════════════════════════
function AuthScreen({lang, setLang, theme, setTheme, t, TH, onLogin}){
  const [email, setEmail] = useState("admin@demo.dj");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const doLogin = async () => {
    setLoading(true); setError("");
    const demo = DEMO_USERS.find(u => u.email===email && u.password===password);
    if (demo) { onLogin(demo); setLoading(false); return; }
    const {error:err} = await signIn(email, password);
    if (err) setError(err.message);
    else onLogin(null);
    setLoading(false);
  };

  return <div style={{height:"100vh", background:TH.bgBase, display:"flex", flexDirection:"column",
    alignItems:"center", justifyContent:"center", position:"relative"}}>
    {/* BG decoration */}
    <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
      <div style={{position:"absolute",top:"-20%",right:"-10%",width:"600px",height:"600px",
        borderRadius:"50%",background:TH.blueGlow,filter:"blur(80px)"}} />
      <div style={{position:"absolute",bottom:"-20%",left:"-10%",width:"400px",height:"400px",
        borderRadius:"50%",background:"rgba(34,211,238,0.06)",filter:"blur(60px)"}} />
    </div>

    {/* Toggle lang/theme */}
    <div style={{position:"absolute",top:"20px",right:"20px",display:"flex",gap:"8px"}}>
      <button onClick={()=>setLang(lang==="fr"?"en":"fr")} style={{background:TH.bgInput,
        border:`1px solid ${TH.border}`,borderRadius:"8px",padding:"6px 12px",
        color:TH.text2,fontSize:"12px",cursor:"pointer"}}>
        {lang==="fr"?"🇫🇷 FR":"🇬🇧 EN"}
      </button>
      <button onClick={()=>setTheme(theme==="dark"?"light":"dark")} style={{background:TH.bgInput,
        border:`1px solid ${TH.border}`,borderRadius:"8px",padding:"6px 12px",
        color:TH.text2,fontSize:"13px",cursor:"pointer"}}>
        {theme==="dark"?"☀️":"🌙"}
      </button>
    </div>

    {/* Card */}
    <div className="fade-up" style={{background:TH.loginCardBg, border:`1px solid ${TH.border2}`,
      borderRadius:"20px", padding:"40px", width:"380px", boxShadow:TH.glassShadow,
      backdropFilter:TH.backdropFilter, position:"relative"}}>
      <div style={{textAlign:"center", marginBottom:"32px"}}>
        <div style={{fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"26px", color:TH.text1}}>
          {t.appName}
        </div>
        <div style={{color:TH.blue, fontSize:"12px", marginTop:"4px"}}>{t.appSub}</div>
        <div style={{width:"40px",height:"3px",background:TH.blue,borderRadius:"2px",margin:"12px auto 0"}} />
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
        <div>
          <label style={{color:TH.text2,fontSize:"12px",fontWeight:600,display:"block",marginBottom:"6px"}}>{t.email}</label>
          <Inp value={email} onChange={setEmail} placeholder={t.email} type="email" TH={TH} />
        </div>
        <div>
          <label style={{color:TH.text2,fontSize:"12px",fontWeight:600,display:"block",marginBottom:"6px"}}>{t.password}</label>
          <Inp value={password} onChange={setPassword} placeholder={t.password} type="password" TH={TH} />
        </div>
        {error && <div style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",
          borderRadius:"8px",padding:"8px 12px",color:TH.red,fontSize:"12px"}}>{error}</div>}
        <Btn onClick={doLogin} disabled={loading} size="lg" TH={TH}>
          {loading ? t.loading : t.signin}
        </Btn>
      </div>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════
const NAV_ITEMS = [
  {key:"dashboard", icon:"▦"},
  {key:"manage",    icon:"🏗"},
  {key:"odfPanel",  icon:"⬡"},
  {key:"registry",  icon:"🔍"},
  {key:"cables",    icon:"⇌"},
  {key:"services",  icon:"⚡"},
  {key:"history",   icon:"⧖"},
  {key:"alerts",    icon:"⚠"},
];

function Sidebar({view, setView, col, setCol, lang, setLang, theme, setTheme, t, TH, user, onLogout, alertCount}){
  return <div style={{width:col?"60px":"200px", minWidth:col?"60px":"200px", height:"100vh",
    background:"#08111E", borderRight:"1px solid rgba(255,255,255,0.06)",
    display:"flex", flexDirection:"column", transition:"width .25s ease", overflow:"hidden", flexShrink:0}}>

    {/* Logo */}
    <div style={{padding:"20px 16px 14px", borderBottom:"1px solid rgba(255,255,255,0.06)", minHeight:"72px"}}>
      {!col && <>
        <div className="font-syne" style={{fontWeight:800, color:"#E8F0FE", fontSize:"15px", letterSpacing:"-0.2px", lineHeight:1.2}}>
          ODF Manager <span style={{color:"#3B82F6"}}>V6</span>
        </div>
        {user && <div style={{fontSize:"11px", color:"#5A7A9A", marginTop:"5px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
          {user.name || user.email}&nbsp;
          <span style={{color:"#3B82F6", fontWeight:600}}>({user.role || "user"})</span>
        </div>}
      </>}
      <button onClick={()=>setCol(!col)} style={{
        marginTop: col ? "0" : "10px",
        background:"rgba(255,255,255,0.07)", border:"none", borderRadius:"6px",
        width:"28px", height:"28px", cursor:"pointer", color:"#5A7A9A",
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px",
        transition:"background .15s"
      }} onMouseEnter={e=>e.currentTarget.style.background="rgba(59,130,246,0.2)"}
         onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.07)"}>
        {col ? "›" : "‹"}
      </button>
    </div>

    {/* Nav */}
    <nav style={{flex:1, overflowY:"auto", padding:"10px 0"}}>
      {NAV_ITEMS.map(({key, icon}) => {
        const active = view===key;
        return <button key={key} onClick={()=>setView(key)} title={t[key]}
          style={{
            width:"100%", display:"flex", alignItems:"center", gap:"10px",
            padding: col ? "12px 0" : "9px 0 9px 16px",
            justifyContent: col ? "center" : "flex-start",
            background: active ? "rgba(59,130,246,0.14)" : "transparent",
            borderLeft: active ? "3px solid #3B82F6" : "3px solid transparent",
            border:"none", cursor:"pointer", transition:"background .12s",
            position:"relative"
          }}
          onMouseEnter={e=>{ if(!active) e.currentTarget.style.background="rgba(255,255,255,0.04)"; }}
          onMouseLeave={e=>{ if(!active) e.currentTarget.style.background="transparent"; }}>
          <span style={{fontSize:"15px", width:"20px", textAlign:"center", flexShrink:0}}>{icon}</span>
          {!col && <span style={{
            fontSize:"13px", fontWeight: active ? 600 : 400,
            color: active ? "#E8F0FE" : "#5A7A9A",
            whiteSpace:"nowrap"
          }}>{t[key]}</span>}
          {key==="alerts" && alertCount>0 && <span style={{
            background:"#EF4444", color:"#fff", borderRadius:"10px",
            fontSize:"10px", fontWeight:700, padding:"1px 6px", lineHeight:"16px",
            position: col ? "absolute" : "static",
            top: col ? "6px" : "auto", right: col ? "6px" : "auto",
            marginLeft: col ? "0" : "auto", marginRight: col ? "0" : "12px"
          }}>{alertCount}</span>}
        </button>;
      })}
    </nav>

    {/* Footer */}
    <div style={{borderTop:"1px solid rgba(255,255,255,0.06)", padding:"12px 12px 14px"}}>
      {!col && <div style={{display:"flex", gap:"6px", marginBottom:"8px"}}>
        <button onClick={()=>setLang(lang==="fr"?"en":"fr")} style={{
          background:"rgba(255,255,255,0.07)", border:"none", borderRadius:"6px",
          padding:"4px 8px", color:"#5A7A9A", fontSize:"11px", cursor:"pointer"
        }}>{lang==="fr"?"🇫🇷 FR":"🇬🇧 EN"}</button>
        <button onClick={()=>setTheme(theme==="dark"?"light":"dark")} style={{
          background:"rgba(255,255,255,0.07)", border:"none", borderRadius:"6px",
          padding:"4px 8px", color:"#5A7A9A", fontSize:"11px", cursor:"pointer"
        }}>{theme==="dark"?"☀️":"🌙"}</button>
      </div>}
      {col && <div style={{display:"flex",flexDirection:"column",gap:"4px",alignItems:"center",marginBottom:"8px"}}>
        <button onClick={()=>setLang(lang==="fr"?"en":"fr")} style={{background:"rgba(255,255,255,0.07)",border:"none",borderRadius:"6px",padding:"4px",color:"#5A7A9A",fontSize:"11px",cursor:"pointer",width:"28px",height:"24px"}}>{lang==="fr"?"🇫🇷":"🇬🇧"}</button>
        <button onClick={()=>setTheme(theme==="dark"?"light":"dark")} style={{background:"rgba(255,255,255,0.07)",border:"none",borderRadius:"6px",padding:"4px",color:"#5A7A9A",fontSize:"11px",cursor:"pointer",width:"28px",height:"24px"}}>{theme==="dark"?"☀️":"🌙"}</button>
      </div>}
      <Btn onClick={onLogout} variant="ghost" size="sm" TH={TH}>{col ? "⏻" : t.logout}</Btn>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// TOPBAR
// ═══════════════════════════════════════════════════════════════════════════
function Topbar({title, search, setSearch, t, TH, saved, rightSlot}){
  return <div style={{height:"56px", display:"flex",alignItems:"center", gap:"12px",
    padding:"0 24px", borderBottom:`1px solid ${TH.border}`,
    background:TH.bgSurface, boxShadow:TH.topbarShadow, flexShrink:0}}>
    <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:TH.text1,fontSize:"16px",flexShrink:0}}>
      {title}
    </span>
    {setSearch && <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.search}
      style={{flex:1, maxWidth:"320px", background:TH.bgInput, border:`1px solid ${TH.border}`,
        borderRadius:"8px",padding:"7px 12px", color:TH.text1, fontSize:"13px"}} />}
    <div style={{flex:1}} />
    {saved && <span style={{color:TH.green,fontSize:"12px",animation:"fadeUp .3s"}}>{t.saved}</span>}
    {rightSlot}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
function Dashboard({t, TH}){
  const [stats,   setStats]   = useState(null);
  const [sites,   setSites]   = useState([]);
  const [byOdf,   setByOdf]   = useState({});
  const [bySite,  setBySite]  = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    let alive = true;
    const load = async () => {
      try {
        const [s, si, pr] = await Promise.all([getStats(), getSites(), getPortsFlat()]);
        if(!alive) return;
        setStats(s);
        setSites(si.data || []);
        const odfMap = {};
        const siteMap = {};
        (pr.data || []).forEach(p => {
          const site = p.slots?.odfs?.racks?.sites;
          const odf  = p.slots?.odfs;
          const siteKey = site?.id;
          const odfKey  = odf?.id || p.odf_id;
          if(siteKey){
            if(!siteMap[siteKey]) siteMap[siteKey] = {racks:new Set(),odfs:new Set(),ports:0,actifs:0};
            siteMap[siteKey].racks.add(p.slots?.odfs?.racks?.id);
            siteMap[siteKey].odfs.add(odfKey);
            siteMap[siteKey].ports++;
            if(p.statut==="ACTIF") siteMap[siteKey].actifs++;
          }
          if(odfKey){
            if(!odfMap[odfKey]) odfMap[odfKey]={nom:odf?.name||odfKey,type:odf?.odf_type,isActive:odf?.is_active,total:0,ACTIF:0,INTERNE:0,INCONNU:0,RÉSERVÉ:0,LIBRE:0};
            odfMap[odfKey].total++;
            odfMap[odfKey][p.statut] = (odfMap[odfKey][p.statut]||0)+1;
          }
        });
        if(!alive) return;
        setBySite(siteMap);
        setByOdf(odfMap);
      } catch(e){}
      finally{ if(alive) setLoading(false); }
    };
    load();
    return ()=>{ alive=false; };
  },[]);

  if(loading) return <Spinner TH={TH}/>;

  const sc    = stats?.statusCounts || {};
  const odfEntries = Object.entries(byOdf);

  const portKpis = [
    {st:"ACTIF",   label:"Circuits actifs",  val:sc.ACTIF||0,   color:TH.green,  bc:TH.green},
    {st:"INTERNE", label:"Usages internes",  val:sc.INTERNE||0, color:TH.blue,   bc:TH.blue},
    {st:"INCONNU", label:"À auditer",        val:sc.INCONNU||0, color:TH.red,    bc:TH.red},
    {st:"LIBRE",   label:"Disponibles",      val:sc.LIBRE||0,   color:TH.text2,  bc:TH.text3},
  ];

  const odfKpis = [
    {label:"ODFs total",     val:stats?.totalOdfs||0,         color:TH.text2,  bc:TH.text3},
    {label:"ODFs activés",   val:stats?.totalOdfsActive||0,   color:TH.green,  bc:TH.green},
    {label:"EXTERNE",        val:stats?.totalOdfsExterne||0,  color:TH.blue,   bc:TH.blue},
    {label:"INTERNE (iODF)", val:stats?.totalOdfsInterne||0,  color:TH.purple, bc:TH.purple},
  ];

  const card = {background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:"12px", boxShadow:TH.cardShadow};

  return <div className="fade-up" style={{padding:"24px", overflowY:"auto", height:"100%"}}>

    {/* Row 1 — Port status KPIs */}
    <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"14px", marginBottom:"14px"}}>
      {portKpis.map(k=>(
        <div key={k.st} style={{...card, borderTop:`3px solid ${k.bc}`, padding:"16px 18px"}}>
          <div className="font-mono" style={{fontSize:"32px", fontWeight:800, color:k.color, lineHeight:1}}>{k.val}</div>
          <div style={{fontSize:"12px", color:TH.text2, margin:"6px 0 10px"}}>{k.label}</div>
          <Bdg status={k.st} TH={TH}/>
        </div>
      ))}
    </div>

    {/* Row 2 — ODF stat KPIs */}
    <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"14px", marginBottom:"20px"}}>
      {odfKpis.map((k,i)=>(
        <div key={i} style={{...card, borderLeft:`3px solid ${k.bc}`, padding:"14px 18px"}}>
          <div className="font-mono" style={{fontSize:"26px", fontWeight:800, color:k.color, lineHeight:1}}>{k.val}</div>
          <div style={{fontSize:"11px", color:TH.text3, marginTop:"5px"}}>{k.label}</div>
        </div>
      ))}
    </div>

    {/* Row 3 — Sites */}
    {sites.length>0 && <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:"12px", marginBottom:"20px"}}>
      {sites.map(site=>{
        const ss = bySite[site.id] || {};
        return <div key={site.id} style={{...card, padding:"14px 16px"}}>
          <div style={{display:"flex", alignItems:"center", gap:"8px", marginBottom:"10px"}}>
            <span style={{fontSize:"20px"}}>🌐</span>
            <div>
              <div style={{fontSize:"13px", fontWeight:700, color:TH.text1, lineHeight:1.2}}>{site.name}</div>
              <div style={{fontSize:"10px", color:TH.text3}}>{site.description||"Auto-généré"}</div>
            </div>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"3px", fontSize:"11px", color:TH.text2}}>
            <span>🔲 {ss.racks?.size||0} racks</span>
            <span>◉ {ss.odfs?.size||0} ODFs</span>
            <span>🔌 {ss.ports||0} ports</span>
            <span style={{color:(ss.actifs||0)>0?TH.green:TH.text3}}>⚡ {ss.actifs||0} actifs</span>
          </div>
        </div>;
      })}
    </div>}

    {/* Row 4 — ODF Occupation */}
    {odfEntries.length>0 && <div style={{...card, padding:"18px"}}>
      <div style={{fontSize:"11px", letterSpacing:"2px", color:TH.text2, fontWeight:700, marginBottom:"14px"}}>
        OCCUPATION ODFs
      </div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"10px"}}>
        {odfEntries.map(([id,o])=>{
          const used = (o.ACTIF||0)+(o.INTERNE||0)+(o.INCONNU||0)+(o.RÉSERVÉ||0);
          const pct  = o.total ? Math.round(used*100/o.total) : 0;
          const pctColor = pct>70 ? TH.red : pct>40 ? TH.gold : TH.green;
          const isInt = o.type==="INTERNE";
          const typeBg = isInt?"rgba(167,139,250,0.12)":"rgba(59,130,246,0.12)";
          const typeTx = isInt?TH.purple:TH.blue;
          const typeBd = isInt?"rgba(167,139,250,0.3)":"rgba(59,130,246,0.3)";
          return <div key={id} style={{border:`1px solid ${TH.border}`, borderRadius:"10px",
            padding:"12px 14px", background:TH.bgSurface, cursor:"pointer", transition:"border-color .15s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=TH.blue}
            onMouseLeave={e=>e.currentTarget.style.borderColor=TH.border}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"4px"}}>
              <span className="font-mono" style={{fontSize:"11px", fontWeight:700, color:TH.text1}}>{o.nom}</span>
              <span style={{background:typeBg, color:typeTx, border:`1px solid ${typeBd}`,
                borderRadius:"20px", padding:"2px 8px", fontSize:"9px", fontWeight:700}}>
                ODF {o.type||"EXTERNE"}
              </span>
            </div>
            <div style={{fontSize:"10px", color:TH.text3, marginBottom:"5px"}}>{o.isActive?"Activé":"Non activé"}</div>
            <div style={{height:"4px", background:TH.border, borderRadius:"2px", overflow:"hidden", marginBottom:"4px"}}>
              <div style={{height:"100%", borderRadius:"2px", background:`linear-gradient(90deg,${TH.green},${TH.blue})`,
                width:`${pct}%`, transition:"width .5s"}} />
            </div>
            <div style={{display:"flex", justifyContent:"space-between", fontSize:"10px"}}>
              <span style={{color:TH.text3}}>{o.total} ports</span>
              <span style={{fontWeight:700, color:pctColor}}>{pct}%</span>
            </div>
          </div>;
        })}
      </div>
    </div>}

    {/* Empty state */}
    {!stats?.totalPorts && sites.length===0 && <div style={{textAlign:"center",padding:"60px 24px",color:TH.text3}}>
      <div style={{fontSize:"36px",marginBottom:"14px"}}>📡</div>
      <div style={{fontSize:"14px"}}>{t.noData}</div>
    </div>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRY (table filtrée + export CSV/PDF)
// ═══════════════════════════════════════════════════════════════════════════
function Registry({t, TH, lang}){
  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSite, setFilterSite] = useState("");
  const [sites, setSites] = useState([]);
  const [page, setPage] = useState(0);
  const PER_PAGE = 30;

  useEffect(()=>{
    setLoading(true);
    Promise.all([getPortsFlat(), getSites()]).then(([pr,sr])=>{
      setPorts(pr.data||[]);
      setSites(sr.data||[]);
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  const filtered = ports.filter(p=>{
    const path = [
      p.slots?.odfs?.racks?.sites?.name,
      p.slots?.odfs?.racks?.name,
      p.slots?.odfs?.name,
      p.slots?.name,
      p.slot_port,
      p.owner, p.cid, p.ot_num
    ].filter(Boolean).join(" ").toLowerCase();
    const q = search.toLowerCase();
    return (!q || path.includes(q))
      && (!filterStatus || p.statut===filterStatus)
      && (!filterSite || p.slots?.odfs?.racks?.sites?.name===filterSite);
  });

  const paginated = filtered.slice(page*PER_PAGE, (page+1)*PER_PAGE);
  const totalPages = Math.ceil(filtered.length/PER_PAGE);

  const doExportCSV = () => {
    const rows = filtered.map(p=>({
      Site:        p.slots?.odfs?.racks?.sites?.name||"",
      Rack:        p.slots?.odfs?.racks?.name||"",
      ODF:         p.slots?.odfs?.name||"",
      Slot:        p.slots?.name||"",
      Port_ID:     p.id||"",
      Slot_Port:   p.slot_port||"",
      Statut:      p.statut||"",
      CID:         p.cid||"",
      OT:          p.ot_num||"",
      Owner:       p.owner||"",
      Capacité:   p.capacite||"",
      Destination: p.destination||"",
      Remarques:   p.remarques||"",
      Modifié:    fmt(p.updated_at),
    }));
    exportCSV(rows, `registre_ports_${new Date().toISOString().slice(0,10)}.csv`);
  };

  const doExportPDF = () => exportPDFLabels(filtered);

  if(loading) return <Spinner TH={TH}/>;

  const cols = [
    {k:"site",w:"70px",  label:"Site"},
    {k:"rack",w:"70px",  label:"Rack"},
    {k:"odf",w:"80px",  label:"ODF"},
    {k:"slot",w:"60px",  label:"Slot"},
    {k:"port",w:"100px", label:"Port ID"},
    {k:"st",  w:"100px", label:t.status},
    {k:"own", w:"90px",  label:t.operator},
    {k:"cid", w:"100px", label:t.cid},
    {k:"ot",  w:"80px",  label:"OT#"},
    {k:"cap", w:"60px",  label:t.capacity},
    {k:"dest",w:"100px", label:t.destination},
    {k:"upd", w:"90px",  label:t.updatedAt},
  ];

  return <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
    {/* Topbar */}
    <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"12px 20px",
      borderBottom:`1px solid ${TH.border}`, flexShrink:0, flexWrap:"wrap"}}>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.search}
        style={{flex:1,minWidth:"160px",maxWidth:"280px",background:TH.bgInput,
          border:`1px solid ${TH.border}`,borderRadius:"8px",padding:"7px 12px",
          color:TH.text1,fontSize:"13px"}} />
      <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
        style={{background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:"8px",
          padding:"7px 10px",color:TH.text1,fontSize:"12px"}}>
        <option value="">{t.allStatuses}</option>
        {STATUTS.map(s=><option key={s}>{s}</option>)}
      </select>
      <select value={filterSite} onChange={e=>setFilterSite(e.target.value)}
        style={{background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:"8px",
          padding:"7px 10px",color:TH.text1,fontSize:"12px"}}>
        <option value="">{t.allSites}</option>
        {sites.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
      </select>
      <span style={{color:TH.text2,fontSize:"12px"}}>{filtered.length} ports</span>
      <div style={{marginLeft:"auto",display:"flex",gap:"8px"}}>
        <Btn onClick={doExportCSV} variant="outline" size="sm" TH={TH}>⬇ CSV</Btn>
        <Btn onClick={doExportPDF} variant="ghost" size="sm" TH={TH}>🖨 PDF</Btn>
      </div>
    </div>

    {/* Table */}
    <div style={{flex:1,overflowY:"auto"}}>
      <table style={{fontSize:"12px",borderCollapse:"collapse"}}>
        <thead>
          <tr style={{background:TH.bgCard, position:"sticky",top:0}}>
            {cols.map(c=>(
              <th key={c.k} style={{padding:"10px 12px",textAlign:"left",
                color:TH.text2,fontWeight:600,fontSize:"11px",
                borderBottom:`1px solid ${TH.border}`,whiteSpace:"nowrap",width:c.w}}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginated.map((p,i)=>(
            <tr key={p.id} style={{borderBottom:`1px solid ${TH.border}`,
              background: i%2===0 ? "transparent" : TH.bgHover}}>
              <td style={{padding:"8px 12px",color:TH.text2,fontFamily:"'JetBrains Mono',monospace",fontSize:"11px"}}>
                {p.slots?.odfs?.racks?.sites?.name||"—"}
              </td>
              <td style={{padding:"8px 12px",color:TH.text2,fontFamily:"'JetBrains Mono',monospace",fontSize:"11px"}}>
                {p.slots?.odfs?.racks?.name||"—"}
              </td>
              <td style={{padding:"8px 12px",color:TH.text2,fontFamily:"'JetBrains Mono',monospace",fontSize:"11px"}}>
                {p.slots?.odfs?.name||"—"}
              </td>
              <td style={{padding:"8px 12px",color:TH.text2,fontFamily:"'JetBrains Mono',monospace",fontSize:"11px"}}>
                {p.slots?.name||"—"}
              </td>
              <td style={{padding:"8px 12px",color:TH.text1,fontFamily:"'JetBrains Mono',monospace",fontWeight:600,fontSize:"11px"}}>
                {p.slot_port||p.id}
              </td>
              <td style={{padding:"8px 12px"}}><Bdg status={p.statut||"LIBRE"} TH={TH}/></td>
              <td style={{padding:"8px 12px",color:TH.text2,fontSize:"11px"}}>{p.owner||"—"}</td>
              <td style={{padding:"8px 12px",color:TH.cyan,fontFamily:"'JetBrains Mono',monospace",fontSize:"11px"}}>{p.cid||"—"}</td>
              <td style={{padding:"8px 12px",color:TH.text2,fontSize:"11px"}}>{p.ot_num||"—"}</td>
              <td style={{padding:"8px 12px",color:TH.text2,fontSize:"11px"}}>{p.capacite||"—"}</td>
              <td style={{padding:"8px 12px",color:TH.text2,fontSize:"11px",maxWidth:"100px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.destination||"—"}</td>
              <td style={{padding:"8px 12px",color:TH.text3,fontSize:"10px"}}>{fmt(p.updated_at)}</td>
            </tr>
          ))}
          {!paginated.length && <tr><td colSpan={12} style={{padding:"32px",textAlign:"center",color:TH.text3}}>{t.noData}</td></tr>}
        </tbody>
      </table>
    </div>

    {/* Pagination */}
    {totalPages > 1 && <div style={{display:"flex",alignItems:"center",gap:"8px",
      padding:"10px 20px",borderTop:`1px solid ${TH.border}`,flexShrink:0}}>
      <Btn onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} variant="ghost" size="sm" TH={TH}>←</Btn>
      <span style={{color:TH.text2,fontSize:"12px"}}>{page+1} / {totalPages}</span>
      <Btn onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))} disabled={page===totalPages-1} variant="ghost" size="sm" TH={TH}>→</Btn>
    </div>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// ODF PANEL — grille physique interactive (avec Slots)
// ═══════════════════════════════════════════════════════════════════════════
function ODFPanel({t, TH}){
  const [sites, setSites]   = useState([]);
  const [racks, setRacks]   = useState([]);
  const [odfs, setOdfs]     = useState([]);
  const [slots, setSlots]   = useState([]);
  const [ports, setPorts]   = useState([]);
  const [selSite, setSelSite] = useState("");
  const [selRack, setSelRack] = useState("");
  const [selOdf, setSelOdf]   = useState("");
  const [selSlot, setSelSlot] = useState("");
  const [selPort, setSelPort] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ getSites().then(r=>setSites(r.data||[])); },[]);
  useEffect(()=>{
    if(selSite){ getRacks(selSite).then(r=>setRacks(r.data||[])); setSelRack(""); setSelOdf(""); setSelSlot(""); setPorts([]); }
    else{ setRacks([]); }
  },[selSite]);
  useEffect(()=>{
    if(selRack){ getOdfs(selRack).then(r=>setOdfs(r.data||[])); setSelOdf(""); setSelSlot(""); setPorts([]); }
    else{ setOdfs([]); }
  },[selRack]);
  useEffect(()=>{
    if(selOdf){ getSlots(selOdf).then(r=>setSlots(r.data||[])); setSelSlot(""); setPorts([]); }
    else{ setSlots([]); }
  },[selOdf]);
  useEffect(()=>{
    if(selSlot){
      setLoading(true);
      getPorts(selSlot).then(r=>{setPorts(r.data||[]);setLoading(false);}).catch(()=>setLoading(false));
    }else{ setPorts([]); }
  },[selSlot]);

  const handleSavePort = async (portId, data) => {
    await updatePort(portId, data);
    const r = await getPorts(selSlot);
    setPorts(r.data||[]);
    setSelPort(null);
  };

  const pathBar = [
    sites.find(s=>s.id===selSite)?.name,
    racks.find(r=>r.id===selRack)?.name,
    odfs.find(o=>o.id===selOdf)?.name,
    slots.find(s=>s.id===selSlot)?.name,
  ].filter(Boolean).join(" › ");

  return <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
    {/* Filtres en cascade */}
    <div style={{padding:"14px 20px",borderBottom:`1px solid ${TH.border}`,flexShrink:0}}>
      <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
        {[
          {label:t.selectSite, val:selSite, set:setSelSite, items:sites, idK:"id", nmK:"name"},
          {label:t.selectRack, val:selRack, set:setSelRack, items:racks, idK:"id", nmK:"name"},
          {label:t.selectOdf,  val:selOdf,  set:setSelOdf,  items:odfs,  idK:"id", nmK:"name"},
          {label:t.selectSlot, val:selSlot, set:setSelSlot, items:slots, idK:"id", nmK:"name"},
        ].map((f,i)=>(
          <select key={i} value={f.val} onChange={e=>f.set(e.target.value)}
            style={{flex:1,minWidth:"130px",background:TH.bgInput,border:`1px solid ${TH.border}`,
              borderRadius:"8px",padding:"7px 10px",color:TH.text1,fontSize:"12px"}}>
            <option value="">{f.label}</option>
            {f.items.map(item=><option key={item[f.idK]} value={item[f.idK]}>{item[f.nmK]}</option>)}
          </select>
        ))}
      </div>
      {pathBar && <div style={{marginTop:"8px",color:TH.text2,fontSize:"11px",fontFamily:"'JetBrains Mono',monospace"}}>
        📍 {pathBar}
      </div>}
    </div>

    {/* Grille ports */}
    <div style={{flex:1,overflowY:"auto",padding:"20px"}}>
      {loading && <Spinner TH={TH}/>}
      {!loading && !selSlot && <div style={{textAlign:"center",color:TH.text3,marginTop:"60px",fontSize:"14px"}}>
        Sélectionnez un slot pour afficher les ports
      </div>}
      {!loading && selSlot && <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:"10px"}}>
        {ports.map(p=>{
          const st = p.statut||"LIBRE";
          const c = TH.sc[st]||TH.sc.LIBRE;
          return <div key={p.id} onClick={()=>setSelPort(p)}
            title={`${p.slot_port||p.id} — ${st}`}
            style={{background:c.bg, border:`1px solid ${c.bd}`, borderRadius:"10px",
              padding:"12px 10px", cursor:"pointer", transition:"transform .15s",
              display:"flex",flexDirection:"column",gap:"4px"}}>
            <div className="font-mono" style={{fontSize:"11px",fontWeight:600,color:c.tx}}>{p.slot_port||p.id}</div>
            <Bdg status={st} TH={TH}/>
            {p.owner && <div style={{fontSize:"10px",color:TH.text2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.owner}</div>}
          </div>;
        })}
        {!ports.length && <div style={{gridColumn:"1/-1",textAlign:"center",color:TH.text3,paddingTop:"40px"}}>{t.noData}</div>}
      </div>}
    </div>

    {/* Port Drawer */}
    {selPort && <PortDrawer port={selPort} onClose={()=>setSelPort(null)} onSave={handleSavePort} t={t} TH={TH}/>}
  </div>;
}

// ─── Port Drawer ────────────────────────────────────────────────────────────
function PortDrawer({port, onClose, onSave, t, TH}){
  const [form, setForm] = useState({
    statut:      port.statut||"LIBRE",
    cid:         port.cid||"",
    ot_num:      port.ot_num||"",
    owner:       port.owner||"",
    capacite:    port.capacite||"",
    destination: port.destination||"",
    date_activ:  port.date_activ||"",
    remarques:   port.remarques||"",
  });
  const [saving, setSaving] = useState(false);
  const up = (k,v) => setForm(f=>({...f,[k]:v}));

  const doSave = async () => {
    setSaving(true);
    await onSave(port.id, form);
    setSaving(false);
  };

  return <div className="slide-r" style={{position:"fixed",top:0,right:0,height:"100vh",
    width:"380px",background:TH.bgCard,borderLeft:`1px solid ${TH.border}`,
    boxShadow:TH.drawerShadow,zIndex:150,display:"flex",flexDirection:"column",overflow:"hidden"}}>
    <div style={{padding:"18px 20px",borderBottom:`1px solid ${TH.border}`,
      display:"flex",alignItems:"center",justifyContent:"space-between",background:TH.modalHeaderBg}}>
      <div>
        <div className="font-mono" style={{fontWeight:700,color:TH.text1,fontSize:"14px"}}>{port.slot_port||port.id}</div>
        <div style={{color:TH.text2,fontSize:"11px"}}>{t.portDrawerTitle} — <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px"}}>{port.id}</span></div>
      </div>
      <button onClick={onClose} style={{background:"none",border:"none",color:TH.text2,fontSize:"20px",cursor:"pointer"}}>×</button>
    </div>
    <div style={{flex:1,overflowY:"auto",padding:"20px",display:"flex",flexDirection:"column",gap:"14px"}}>
      {[
        {label:t.status,      k:"statut",      type:"select", opts:STATUTS},
        {label:t.cid,         k:"cid"},
        {label:"OT #",        k:"ot_num"},
        {label:t.operator,    k:"owner"},
        {label:t.capacity,    k:"capacite"},
        {label:t.destination, k:"destination"},
        {label:"Date activ.", k:"date_activ"},
        {label:t.notes,       k:"remarques"},
      ].map(f=>(
        <div key={f.k}>
          <label style={{display:"block",color:TH.text2,fontSize:"11px",fontWeight:600,marginBottom:"5px"}}>{f.label}</label>
          {f.type==="select"
            ? <Sel value={form[f.k]} onChange={v=>up(f.k,v)} TH={TH}>
                {f.opts.map(o=><option key={o}>{o}</option>)}
              </Sel>
            : <Inp value={form[f.k]} onChange={v=>up(f.k,v)} TH={TH}/>}
        </div>
      ))}
    </div>
    <div style={{padding:"16px 20px",borderTop:`1px solid ${TH.border}`,display:"flex",gap:"10px"}}>
      <Btn onClick={doSave} disabled={saving} size="lg" TH={TH}>{saving?t.saving:t.save}</Btn>
      <Btn onClick={onClose} variant="ghost" size="lg" TH={TH}>{t.cancel}</Btn>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// CÂBLES FIBRE
// ═══════════════════════════════════════════════════════════════════════════
function CablesView({t, TH}){
  const [cables, setCables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [ports, setPorts]   = useState([]);
  const [form, setForm] = useState({cable_reference:"",type_fibre:"Monomode",port_source_id:"",port_dest_id:""});

  const load = () => { setLoading(true); getCables().then(r=>{setCables(r.data||[]);setLoading(false);}); };
  useEffect(()=>{ load(); getPortsFlat().then(r=>setPorts(r.data||[])); },[]);

  const doAdd = async () => {
    if(!form.cable_reference||!form.port_source_id||!form.port_dest_id) return;
    await createCable({...form});
    setShowAdd(false); load();
  };

  const doDelete = async (id) => { await deleteCable(id); load(); setConfirm(null); };

  const formatPath = (p) => {
    if(!p) return "—";
    const sl = p.slots;
    return [sl?.odfs?.racks?.sites?.name, sl?.odfs?.racks?.name,
      sl?.odfs?.name, sl?.name, p.slot_port||p.id].filter(Boolean).join("/");
  };

  if(loading) return <Spinner TH={TH}/>;

  return <div style={{height:"100%",overflowY:"auto",padding:"20px"}}>
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"16px"}}>
      <Btn onClick={()=>setShowAdd(true)} TH={TH}>+ {t.add}</Btn>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
      {cables.map(c=>(
        <div key={c.id||c.cable_id} style={{background:TH.bgCard,border:`1px solid ${TH.border}`,
          borderRadius:"12px",padding:"16px",display:"flex",alignItems:"center",gap:"16px"}}>
          <div style={{flex:1}}>
            <div className="font-mono" style={{fontWeight:700,color:TH.cyan,fontSize:"13px",marginBottom:"6px"}}>
              {c.cable_reference}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"8px",fontSize:"12px"}}>
              <span style={{color:TH.text1,fontFamily:"'JetBrains Mono',monospace",fontSize:"11px"}}>{formatPath(c.port_source)}</span>
              <span style={{color:TH.gold}}>⇌</span>
              <span style={{color:TH.text1,fontFamily:"'JetBrains Mono',monospace",fontSize:"11px"}}>{formatPath(c.port_dest)}</span>
            </div>
            <div style={{color:TH.text3,fontSize:"10px",marginTop:"4px"}}>{c.type_fibre}</div>
          </div>
          <Btn onClick={()=>setConfirm(c.id||c.cable_id)} variant="danger" size="sm" TH={TH}>✕</Btn>
        </div>
      ))}
      {!cables.length && <div style={{textAlign:"center",color:TH.text3,paddingTop:"40px"}}>{t.noData}</div>}
    </div>

    {showAdd && <Modal title={t.add+" câble fibre"} onClose={()=>setShowAdd(false)} TH={TH}>
      <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
        {[
          {label:t.cableRef, k:"cable_reference"},
          {label:t.fiberType, k:"type_fibre"},
        ].map(f=>(
          <div key={f.k}>
            <label style={{display:"block",color:TH.text2,fontSize:"11px",fontWeight:600,marginBottom:"5px"}}>{f.label}</label>
            <Inp value={form[f.k]} onChange={v=>setForm(fm=>({...fm,[f.k]:v}))} TH={TH}/>
          </div>
        ))}
        {[
          {label:t.pathSource, k:"port_source_id"},
          {label:t.pathDest, k:"port_dest_id"},
        ].map(f=>(
          <div key={f.k}>
            <label style={{display:"block",color:TH.text2,fontSize:"11px",fontWeight:600,marginBottom:"5px"}}>{f.label}</label>
            <Sel value={form[f.k]} onChange={v=>setForm(fm=>({...fm,[f.k]:v}))} TH={TH}>
              <option value="">— Sélectionner port —</option>
              {ports.map(p=><option key={p.id} value={p.id}>{p.slot_port||p.id} ({p.slots?.odfs?.name||p.odf_id})</option>)}
            </Sel>
          </div>
        ))}
        <Btn onClick={doAdd} TH={TH}>{t.save}</Btn>
      </div>
    </Modal>}

    {confirm && <Confirm message={t.confirmDelete} onYes={()=>doDelete(confirm)} onNo={()=>setConfirm(null)} TH={TH} t={t}/>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// PORT PICKER — sélection en cascade Site → Rack → ODF → Port
// ═══════════════════════════════════════════════════════════════════════════
function PortPicker({value, onChange, ports, TH, accent}){
  const portOf = (id) => ports.find(p=>p.id===id);
  const init = portOf(value);
  const [siteId, setSiteId] = useState(init?.slots?.odfs?.racks?.sites?.id||"");
  const [rackId, setRackId] = useState(init?.slots?.odfs?.racks?.id||"");
  const [odfId,  setOdfId]  = useState(init?.slots?.odfs?.id||"");

  useEffect(()=>{ // resync si value effacée de l'extérieur
    if(!value){ return; }
    const p = portOf(value);
    if(p){ setSiteId(p.slots?.odfs?.racks?.sites?.id||""); setRackId(p.slots?.odfs?.racks?.id||""); setOdfId(p.slots?.odfs?.id||""); }
  },[value]);

  const uniq = (arr, sel) => {
    const m = new Map();
    arr.forEach(p=>{ const o=sel(p); if(o?.id && !m.has(o.id)) m.set(o.id,o); });
    return [...m.values()].sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  };
  const sites = uniq(ports, p=>p.slots?.odfs?.racks?.sites);
  const racks = uniq(ports.filter(p=>p.slots?.odfs?.racks?.sites?.id===siteId), p=>p.slots?.odfs?.racks);
  const odfs  = uniq(ports.filter(p=>p.slots?.odfs?.racks?.id===rackId), p=>p.slots?.odfs);
  const portList = ports.filter(p=>p.slots?.odfs?.id===odfId)
    .sort((a,b)=>String(a.slot_port).localeCompare(String(b.slot_port)));

  const accCol = accent||TH.blue;
  const onSite = v => { setSiteId(v); setRackId(""); setOdfId(""); onChange(""); };
  const onRack = v => { setRackId(v); setOdfId(""); onChange(""); };
  const onOdf  = v => { setOdfId(v); onChange(""); };

  return <div style={{border:`1px solid ${TH.border}`,borderLeft:`3px solid ${accCol}`,
    borderRadius:"10px",padding:"10px",display:"flex",flexDirection:"column",gap:"6px",background:TH.bgInput}}>
    <Sel value={siteId} onChange={onSite} TH={TH} style={{fontSize:"11px"}}>
      <option value="">— Site —</option>
      {sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
    </Sel>
    <Sel value={rackId} onChange={onRack} TH={TH} style={{fontSize:"11px"}}>
      <option value="">{siteId?"— Rack —":"· choisir un site"}</option>
      {racks.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
    </Sel>
    <Sel value={odfId} onChange={onOdf} TH={TH} style={{fontSize:"11px"}}>
      <option value="">{rackId?"— ODF —":"· choisir un rack"}</option>
      {odfs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
    </Sel>
    <Sel value={value||""} onChange={onChange} TH={TH} style={{fontSize:"11px",fontFamily:"'JetBrains Mono',monospace"}}>
      <option value="">{odfId?"— Port —":"· choisir un ODF"}</option>
      {portList.map(p=><option key={p.id} value={p.id}>{p.slot_port||p.id}{p.statut&&p.statut!=="LIBRE"?` · ${p.statut}`:""}</option>)}
    </Sel>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICES — création (CID auto-généré) + constructeur de route (jonctions)
// ═══════════════════════════════════════════════════════════════════════════
const genCid = () => {
  const n = new Date(); const p = x => String(x).padStart(2,'0');
  return `DJT-${n.getFullYear()}${p(n.getMonth()+1)}${p(n.getDate())}${p(n.getHours())}${p(n.getMinutes())}${p(n.getSeconds())}`;
};

function ServicesView({t, TH}){
  const [services, setServices] = useState([]);
  const [routes, setRoutes]     = useState({});   // service_id -> {route, nb_jonctions}
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [confirm, setConfirm]   = useState(null);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState("");

  // données de référence
  const [cables, setCables]           = useState([]);
  const [jarretieres, setJarretieres] = useState([]);
  const [clients, setClients]         = useState([]);
  const [fournisseurs, setFourniss]   = useState([]);
  const [ports, setPorts]             = useState([]);

  const [form, setForm] = useState(null);
  const [hops, setHops] = useState([]);

  const load = () => {
    setLoading(true);
    Promise.all([getServices(), getServiceRoutes()]).then(([s,r])=>{
      setServices(s.data||[]);
      const m={}; (r.data||[]).forEach(x=>{m[x.service_id]=x;});
      setRoutes(m); setLoading(false);
    }).catch(()=>setLoading(false));
  };
  useEffect(()=>{
    load();
    getCables().then(r=>setCables(r.data||[]));
    getJarretieres().then(r=>setJarretieres(r.data||[]));
    getClients().then(r=>setClients(r.data||[]));
    getFournisseurs().then(r=>setFourniss(r.data||[]));
    getPortsFlat().then(r=>setPorts(r.data||[]));
  },[]);

  const portLabel = (id) => {
    const p = ports.find(x=>x.id===id);
    if(!p) return id||"—";
    const site = p.slots?.odfs?.racks?.sites?.name;
    const odf  = p.slots?.odfs?.name;
    return [site, odf, p.slot_port||p.id].filter(Boolean).join("/");
  };

  const openNew = () => {
    setForm({cid:genCid(), label:"", cable_id:"", client_id:"", fournisseur_id:"", port_id:"", capacite_gbps:""});
    setHops([{type:"cable", link_id:"", port_entree_id:"", port_sortie_id:""}]);
    setErr(""); setShowAdd(true);
  };
  const up    = (k,v) => setForm(f=>({...f,[k]:v}));
  const upHop  = (i,k,v) => setHops(hs=>hs.map((h,idx)=>idx===i?{...h,[k]:v}:h));
  const addHop = () => setHops(hs=>{
    const prev = hs[hs.length-1];
    return [...hs,{type:"cable", link_id:"", port_entree_id:prev?.port_sortie_id||"", port_sortie_id:""}];
  });
  const rmHop  = (i) => setHops(hs=>hs.filter((_,idx)=>idx!==i));

  const doCreate = async () => {
    if(!form.label.trim() || !form.cable_id){ setErr("Label et Câble primaire sont obligatoires."); return; }
    setSaving(true); setErr("");
    try{
      const cid = form.cid.trim() || genCid();
      const {data, error} = await createService({
        id: cid, cid, label: form.label.trim(),
        cable_id: form.cable_id,
        client_id: form.client_id||null,
        fournisseur_id: form.fournisseur_id||null,
        port_id: form.port_id||null,
        capacite_gbps: Number(form.capacite_gbps)||0,
      });
      if(error) throw error;
      const sid = data.id;
      const rows = hops
        .filter(h=>h.link_id && h.port_entree_id && h.port_sortie_id)
        .map((h,idx)=>({
          service_id: sid, ordre: idx+1,
          cable_id:      h.type==="cable"      ? h.link_id : null,
          jarretiere_id: h.type==="jarretiere" ? h.link_id : null,
          port_entree_id: h.port_entree_id,
          port_sortie_id: h.port_sortie_id,
        }));
      if(rows.length){ const {error:e2} = await addServiceJonctions(rows); if(e2) throw e2; }
      try{ await addHistory({action:`Service créé : ${cid}`, entity_type:"service", entity_id:sid}); }catch(_){}
      setShowAdd(false); load();
    }catch(e){ setErr(e.message || "Erreur lors de la création du service."); }
    setSaving(false);
  };

  const doDelete = async (id) => { await deleteService(id); setConfirm(null); load(); };

  const SC = {ACTIF:TH.green, SUSPENDU:TH.gold, RESILIE:TH.red};

  if(loading) return <Spinner TH={TH}/>;

  return <div style={{height:"100%",overflowY:"auto",padding:"20px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
      <div style={{color:TH.text2,fontSize:"12px"}}>{services.length} service(s)</div>
      <Btn onClick={openNew} TH={TH}>+ {t.add} service</Btn>
    </div>

    <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
      {services.map(s=>{
        const st = s.statut||"ACTIF"; const col = SC[st]||TH.text2;
        const route = routes[s.id]?.route;
        const nb = routes[s.id]?.nb_jonctions ?? (s.service_jonctions?.length||0);
        return <div key={s.id} style={{background:TH.bgCard,border:`1px solid ${TH.border}`,borderRadius:"12px",padding:"16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"8px"}}>
            <span className="font-mono" style={{fontWeight:700,color:TH.cyan,fontSize:"13px"}}>{s.cid||s.id}</span>
            <span style={{fontSize:"10px",fontWeight:700,color:col,border:`1px solid ${col}`,
              borderRadius:"6px",padding:"2px 8px"}}>{st}</span>
            <span style={{color:TH.text1,fontSize:"13px",fontWeight:600,flex:1}}>{s.label}</span>
            <span style={{color:TH.gold,fontSize:"12px",fontWeight:600}}>{s.capacite_gbps||0} G</span>
            <Btn onClick={()=>setConfirm(s.id)} variant="danger" size="sm" TH={TH}>✕</Btn>
          </div>
          <div style={{display:"flex",gap:"14px",fontSize:"11px",color:TH.text2,marginBottom:"6px"}}>
            <span>Client : <b style={{color:TH.text1}}>{s.clients?.nom||"—"}</b></span>
            <span>Fournisseur : <b style={{color:TH.text1}}>{s.fournisseurs?.nom||"—"}</b></span>
            <span>Jonctions : <b style={{color:TH.text1}}>{nb}</b></span>
          </div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"11px",color:TH.text1,
            background:TH.bgInput,borderRadius:"8px",padding:"8px 10px",lineHeight:1.5}}>
            {route || "— (aucune route définie)"}
          </div>
        </div>;
      })}
      {!services.length && <div style={{textAlign:"center",color:TH.text3,paddingTop:"40px"}}>{t.noData}</div>}
    </div>

    {showAdd && form && <Modal title="Nouveau service" onClose={()=>setShowAdd(false)} TH={TH} width="760px">
      <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
          <Field label="CID (auto-généré)" TH={TH}>
            <Inp value={form.cid} onChange={v=>up("cid",v)} TH={TH} style={{fontFamily:"'JetBrains Mono',monospace"}}/>
          </Field>
          <Field label="Capacité (Gbps)" TH={TH}>
            <Inp value={form.capacite_gbps} onChange={v=>up("capacite_gbps",v)} type="number" TH={TH}/>
          </Field>
        </div>
        <Field label="Label *" TH={TH}>
          <Inp value={form.label} onChange={v=>up("label",v)} placeholder="Nom du service" TH={TH}/>
        </Field>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
          <Field label="Câble primaire * (capacité débitée ici)" TH={TH}>
            <Sel value={form.cable_id} onChange={v=>up("cable_id",v)} TH={TH}>
              <option value="">— Sélectionner —</option>
              {cables.map(c=><option key={c.id} value={c.id}>{c.cable_reference} ({c.capacite_disponible_gbps}G dispo)</option>)}
            </Sel>
          </Field>
          <Field label="Port primaire" TH={TH}>
            <Sel value={form.port_id} onChange={v=>up("port_id",v)} TH={TH}>
              <option value="">— Aucun —</option>
              {ports.map(p=><option key={p.id} value={p.id}>{portLabel(p.id)}</option>)}
            </Sel>
          </Field>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
          <Field label="Client" TH={TH}>
            <Sel value={form.client_id} onChange={v=>up("client_id",v)} TH={TH}>
              <option value="">— Aucun —</option>
              {clients.map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}
            </Sel>
          </Field>
          <Field label="Fournisseur" TH={TH}>
            <Sel value={form.fournisseur_id} onChange={v=>up("fournisseur_id",v)} TH={TH}>
              <option value="">— Aucun —</option>
              {fournisseurs.map(f=><option key={f.id} value={f.id}>{f.nom}</option>)}
            </Sel>
          </Field>
        </div>

        {/* Constructeur de route — connexions Entrée → Sortie */}
        <div style={{borderTop:`1px solid ${TH.border}`,paddingTop:"14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
            <div>
              <div style={{color:TH.text1,fontSize:"13px",fontWeight:700}}>Tracé du service — connexions</div>
              <div style={{color:TH.text3,fontSize:"11px"}}>Chaque connexion relie un port d'entrée à un port de sortie via un lien.</div>
            </div>
            <Btn onClick={addHop} variant="ghost" size="sm" TH={TH}>+ connexion</Btn>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
            {hops.map((h,i)=>(
              <div key={i} style={{background:TH.bgCard,border:`1px solid ${TH.border}`,borderRadius:"12px",
                padding:"12px",display:"flex",flexDirection:"column",gap:"10px"}}>
                {/* En-tête connexion : numéro + type de lien + lien + suppression */}
                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                  <span style={{width:"22px",height:"22px",borderRadius:"50%",background:TH.blue,color:"#fff",
                    fontSize:"11px",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                  <span style={{color:TH.text2,fontSize:"11px",fontWeight:600}}>Connexion {i+1}</span>
                  <div style={{flex:1}}/>
                  <Sel value={h.type} onChange={v=>{upHop(i,"type",v);upHop(i,"link_id","");}} TH={TH} style={{fontSize:"11px",width:"120px"}}>
                    <option value="cable">Câble</option>
                    <option value="jarretiere">Jarretière</option>
                  </Sel>
                  <Sel value={h.link_id} onChange={v=>upHop(i,"link_id",v)} TH={TH} style={{fontSize:"11px",width:"200px"}}>
                    <option value="">— lien —</option>
                    {(h.type==="cable"?cables:jarretieres).map(l=>(
                      <option key={l.id} value={l.id}>{l.cable_reference || l.nom || l.id}</option>
                    ))}
                  </Sel>
                  {hops.length>1 && <Btn onClick={()=>rmHop(i)} variant="danger" size="sm" TH={TH}>✕</Btn>}
                </div>
                {/* Corps : Entrée → Sortie en cascade */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 28px 1fr",gap:"8px",alignItems:"center"}}>
                  <div>
                    <div style={{color:TH.green,fontSize:"10px",fontWeight:700,marginBottom:"4px",textTransform:"uppercase",letterSpacing:".5px"}}>Entrée</div>
                    <PortPicker value={h.port_entree_id} onChange={v=>upHop(i,"port_entree_id",v)} ports={ports} TH={TH} accent={TH.green}/>
                  </div>
                  <div style={{color:TH.gold,fontSize:"20px",textAlign:"center"}}>→</div>
                  <div>
                    <div style={{color:TH.cyan,fontSize:"10px",fontWeight:700,marginBottom:"4px",textTransform:"uppercase",letterSpacing:".5px"}}>Sortie</div>
                    <PortPicker value={h.port_sortie_id} onChange={v=>upHop(i,"port_sortie_id",v)} ports={ports} TH={TH} accent={TH.cyan}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {err && <div style={{background:"rgba(248,113,113,0.1)",border:`1px solid ${TH.red}`,
          borderRadius:"8px",padding:"8px 12px",color:TH.red,fontSize:"12px"}}>{err}</div>}
        <div style={{display:"flex",gap:"10px",justifyContent:"flex-end"}}>
          <Btn onClick={()=>setShowAdd(false)} variant="ghost" TH={TH}>{t.cancel}</Btn>
          <Btn onClick={doCreate} disabled={saving} TH={TH}>{saving?t.saving:"Créer"}</Btn>
        </div>
      </div>
    </Modal>}

    {confirm && <Confirm message={t.confirmDelete} onYes={()=>doDelete(confirm)} onNo={()=>setConfirm(null)} TH={TH} t={t}/>}
  </div>;
}

// Petit wrapper label + champ
function Field({label, children, TH}){
  return <div>
    <label style={{display:"block",color:TH.text2,fontSize:"11px",fontWeight:600,marginBottom:"5px"}}>{label}</label>
    {children}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// MANAGE INFRA — CRUD Sites / Racks / ODFs / Slots
// ═══════════════════════════════════════════════════════════════════════════
function ManageInfra({t, TH}){
  const [tab, setTab] = useState(0);
  const tabs = t.infraTabs;

  return <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
    <div style={{display:"flex",gap:"4px",padding:"12px 20px",borderBottom:`1px solid ${TH.border}`,flexShrink:0}}>
      {tabs.map((lb,i)=>(
        <button key={i} onClick={()=>setTab(i)} style={{padding:"6px 14px",borderRadius:"8px",
          background:tab===i?TH.blue:"transparent",color:tab===i?"#fff":TH.text2,
          border:`1px solid ${tab===i?TH.blue:TH.border}`,fontSize:"12px",fontWeight:600,cursor:"pointer"}}>
          {lb}
        </button>
      ))}
    </div>
    <div style={{flex:1,overflow:"hidden"}}>
      {tab===0 && <SitesCRUD t={t} TH={TH}/>}
      {tab===1 && <RacksCRUD t={t} TH={TH}/>}
      {tab===2 && <OdfsCRUD t={t} TH={TH}/>}
      {tab===3 && <SlotsCRUD t={t} TH={TH}/>}
    </div>
  </div>;
}

// Generic CRUD list component (ID texte)
function CrudList({items, idKey, nameKey, subKey, onAdd, onDelete, addLabel, addLabel2, t, TH, extraBefore}){
  const [val1, setVal1] = useState("");
  const [val2, setVal2] = useState("");
  const [confirm, setConfirm] = useState(null);
  return <div style={{height:"100%",overflowY:"auto",padding:"20px"}}>
    <div style={{display:"flex",gap:"10px",marginBottom:"16px",flexWrap:"wrap"}}>
      {extraBefore}
      {addLabel2 && <Inp value={val2} onChange={setVal2} placeholder={addLabel2} TH={TH} style={{flex:1,maxWidth:"140px"}}/>}
      <Inp value={val1} onChange={setVal1} placeholder={addLabel} TH={TH} style={{flex:1,maxWidth:"240px"}}/>
      <Btn onClick={()=>{if(val1.trim()){onAdd(val1.trim(), val2.trim());setVal1("");setVal2("");}}} TH={TH}>+ {t.add}</Btn>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
      {items.map(item=>(
        <div key={item[idKey]} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          background:TH.bgCard,border:`1px solid ${TH.border}`,borderRadius:"10px",padding:"12px 16px"}}>
          <div>
            <span className="font-mono" style={{color:TH.text1,fontSize:"13px",fontWeight:600}}>{item[nameKey]}</span>
            {subKey && <span style={{color:TH.text3,fontSize:"11px",marginLeft:"10px"}}>{item[idKey]}</span>}
          </div>
          <Btn onClick={()=>setConfirm(item[idKey])} variant="danger" size="sm" TH={TH}>✕</Btn>
        </div>
      ))}
      {!items.length && <div style={{textAlign:"center",color:TH.text3,paddingTop:"30px"}}>{t.noData}</div>}
    </div>
    {confirm && <Confirm message={t.confirmDelete} onYes={()=>{onDelete(confirm);setConfirm(null);}} onNo={()=>setConfirm(null)} TH={TH} t={t}/>}
  </div>;
}

function SitesCRUD({t,TH}){
  const [items,setItems]=useState([]);
  const load=()=>getSites().then(r=>setItems(r.data||[]));
  useEffect(()=>{load();},[]);
  return <CrudList items={items} idKey="id" nameKey="name" subKey
    onAdd={(name, code)=>createSite({id:code.toUpperCase()||name.slice(0,3).toUpperCase(), name}).then(load)}
    onDelete={id=>deleteSite(id).then(load)}
    addLabel={t.siteName} addLabel2="Code (ex: RDK)" t={t} TH={TH}/>;
}

function RacksCRUD({t,TH}){
  const [items,setItems]=useState([]);
  const [sites,setSites]=useState([]);
  const [selSite,setSelSite]=useState("");
  useEffect(()=>{getSites().then(r=>setSites(r.data||[]));},[]);
  const load=()=>getRacks(selSite||null).then(r=>setItems(r.data||[]));
  useEffect(()=>{load();},[selSite]);
  return <CrudList items={items} idKey="id" nameKey="name" subKey
    onAdd={name=>{
      if(!selSite) return;
      const rackName = name.toUpperCase();
      createRack({id:`${selSite}-${rackName}`, site_id:selSite, name:rackName}).then(load);
    }}
    onDelete={id=>deleteRack(id).then(load)}
    addLabel={`${t.rackName} (ex: R2)`} t={t} TH={TH}
    extraBefore={<select value={selSite} onChange={e=>setSelSite(e.target.value)}
      style={{background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:"8px",padding:"7px 10px",color:TH.text1,fontSize:"12px"}}>
      <option value="">{t.allSites}</option>
      {sites.map(s=><option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
    </select>}/>;
}

function OdfsCRUD({t,TH}){
  const [items,setItems]=useState([]);
  const [racks,setRacks]=useState([]);
  const [selRack,setSelRack]=useState("");
  useEffect(()=>{getRacks().then(r=>setRacks(r.data||[]));},[]);
  const load=()=>getOdfs(selRack||null).then(r=>setItems(r.data||[]));
  useEffect(()=>{load();},[selRack]);
  return <CrudList items={items} idKey="id" nameKey="name" subKey
    onAdd={name=>{
      if(!selRack) return;
      const odfName = name.toUpperCase();
      createOdf({id:`${selRack}-${odfName}`, rack_id:selRack, name:odfName, odf_type:'EXTERNE'}).then(load);
    }}
    onDelete={id=>deleteOdf(id).then(load)}
    addLabel={`${t.odfName} (ex: ODF2)`} t={t} TH={TH}
    extraBefore={<select value={selRack} onChange={e=>setSelRack(e.target.value)}
      style={{background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:"8px",padding:"7px 10px",color:TH.text1,fontSize:"12px"}}>
      <option value="">Tous racks</option>
      {racks.map(r=><option key={r.id} value={r.id}>{r.name} — {r.id}</option>)}
    </select>}/>;
}

function SlotsCRUD({t,TH}){
  const [items,setItems]=useState([]);
  const [odfs,setOdfs]=useState([]);
  const [selOdf,setSelOdf]=useState("");
  useEffect(()=>{getOdfs().then(r=>setOdfs(r.data||[]));},[]);
  const load=()=>getSlots(selOdf||null).then(r=>setItems(r.data||[]));
  useEffect(()=>{load();},[selOdf]);
  return <CrudList items={items} idKey="id" nameKey="name" subKey
    onAdd={name=>{
      if(!selOdf) return;
      const num = parseInt(name)||0;
      if(!num) return;
      const slotName = 'S' + String(num).padStart(2,'0');
      createSlot({id:`${selOdf}_${slotName}`, odf_id:selOdf, slot_num:num, name:slotName}).then(load);
    }}
    onDelete={id=>deleteSlot(id).then(load)}
    addLabel={`${t.slotName} (ex: 2 pour S02)`} t={t} TH={TH}
    extraBefore={<select value={selOdf} onChange={e=>setSelOdf(e.target.value)}
      style={{background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:"8px",padding:"7px 10px",color:TH.text1,fontSize:"12px"}}>
      <option value="">Tous ODFs</option>
      {odfs.map(o=><option key={o.id} value={o.id}>{o.name} — {o.id}</option>)}
    </select>}/>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════════════════════════════════════════
function HistoryView({t, TH}){
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{ getHistory(200).then(r=>{setRows(r.data||[]);setLoading(false);}).catch(()=>setLoading(false)); },[]);
  if(loading) return <Spinner TH={TH}/>;
  return <div style={{height:"100%",overflowY:"auto",padding:"20px"}}>
    {!rows.length && <div style={{textAlign:"center",color:TH.text3,paddingTop:"40px"}}>{t.history_empty}</div>}
    <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
      {rows.map((r,i)=>(
        <div key={i} style={{background:TH.bgCard,border:`1px solid ${TH.border}`,borderRadius:"10px",
          padding:"12px 16px",display:"flex",alignItems:"center",gap:"12px"}}>
          <div style={{width:"6px",height:"6px",borderRadius:"50%",background:TH.blue,flexShrink:0}} />
          <div style={{flex:1}}>
            <div style={{color:TH.text1,fontSize:"13px"}}>{r.action||r.description||"—"}</div>
            {r.user_email && <div style={{color:TH.text3,fontSize:"11px"}}>{r.user_email}</div>}
          </div>
          <div style={{color:TH.text3,fontSize:"11px",flexShrink:0}}>{fmt(r.created_at)}</div>
        </div>
      ))}
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// ALERTS — ports INCONNU
// ═══════════════════════════════════════════════════════════════════════════
function AlertsView({t, TH}){
  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    getPortsFlat().then(r=>{
      const unknown = (r.data||[]).filter(p=>p.statut==="INCONNU");
      setPorts(unknown);
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);
  if(loading) return <Spinner TH={TH}/>;
  const c = TH.sc.INCONNU;
  return <div style={{height:"100%",overflowY:"auto",padding:"20px"}}>
    {ports.length>0 && <div style={{background:c.bg,border:`1px solid ${c.bd}`,borderRadius:"10px",
      padding:"12px 16px",marginBottom:"16px",color:c.tx,fontSize:"13px",fontWeight:600}}>
      ⚠ {ports.length} port(s) INCONNU détecté(s)
    </div>}
    <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
      {ports.map(p=>(
        <div key={p.id} style={{background:TH.bgCard,border:`1px solid ${c.bd}`,
          borderRadius:"10px",padding:"14px 16px"}}>
          <div className="font-mono" style={{fontWeight:700,color:c.tx,marginBottom:"4px"}}>{p.slot_port||p.id}</div>
          <div style={{color:TH.text2,fontSize:"11px"}}>
            {[p.slots?.odfs?.racks?.sites?.name,
              p.slots?.odfs?.name,
              p.slots?.name
            ].filter(Boolean).join(" › ")}
          </div>
          <div style={{color:TH.text3,fontSize:"10px",marginTop:"4px"}}>{fmt(p.updated_at)}</div>
        </div>
      ))}
      {!ports.length && <div style={{textAlign:"center",color:TH.green,paddingTop:"40px",fontSize:"14px"}}>
        ✓ Aucun port INCONNU — Tout est en ordre
      </div>}
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════════════
export default function App(){
  const [session, setSession] = useState(null);
  const [demoUser, setDemoUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [lang, setLang]   = useState("fr");
  const [theme, setTheme] = useState("dark");
  const [view, setView]   = useState("dashboard");
  const [col, setCol]     = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  const TH = THEMES[theme];
  const t  = T[lang];

  // Inject CSS
  useEffect(()=>{
    let el = document.getElementById("odf-base-css");
    if(!el){el=document.createElement("style");el.id="odf-base-css";document.head.appendChild(el);}
    el.textContent = BASE_CSS;
  },[]);

  // Supabase session listener
  useEffect(()=>{
    getSession().then(({data:{session}})=>{ setSession(session); setAuthLoading(false); });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_,session)=>setSession(session));
    return ()=>subscription.unsubscribe();
  },[]);

  // Alert count
  useEffect(()=>{
    if(!session && !demoUser) return;
    getPortsFlat().then(r=>{
      const u = (r.data||[]).filter(p=>p.statut==="INCONNU").length;
      setAlertCount(u);
    });
  },[session, view]);

  const doLogout = async () => { await signOut(); setDemoUser(null); };

  if(authLoading) return <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:THEMES.dark.bgBase}}>
    <Spinner TH={THEMES.dark}/>
  </div>;

  if(!session && !demoUser) return <AuthScreen lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} t={t} TH={TH} onLogin={(u)=>{ if(u) setDemoUser(u); }}/>;  

  const VIEWS = {
    dashboard: <Dashboard t={t} TH={TH}/>,
    registry:  <Registry t={t} TH={TH} lang={lang}/>,
    odfPanel:  <ODFPanel t={t} TH={TH}/>,
    cables:    <CablesView t={t} TH={TH}/>,
    services:  <ServicesView t={t} TH={TH}/>,
    manage:    <ManageInfra t={t} TH={TH}/>,
    history:   <HistoryView t={t} TH={TH}/>,
    alerts:    <AlertsView t={t} TH={TH}/>,
  };

  const VIEW_TITLES = {
    dashboard:t.dashboard, registry:t.registry, odfPanel:t.odfPanel,
    cables:t.cables, services:t.services, manage:t.manage, history:t.history, alerts:t.alerts,
  };

  return <div style={{display:"flex",height:"100vh",background:TH.bgBase,overflow:"hidden"}}>
    <Sidebar view={view} setView={setView} col={col} setCol={setCol}
      lang={lang} setLang={setLang} theme={theme} setTheme={setTheme}
      t={t} TH={TH} user={session?.user || demoUser} onLogout={doLogout} alertCount={alertCount}/>
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <Topbar title={VIEW_TITLES[view]} t={t} TH={TH}/>
      <div style={{flex:1,overflow:"hidden"}}>
        {VIEWS[view]}
      </div>
    </div>
  </div>;
}
