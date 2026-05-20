import { useState, useEffect, useMemo, useCallback, useRef } from "react";

// ═══════════════════════════════════════════════════════════════════════
//  STORAGE
// ═══════════════════════════════════════════════════════════════════════
const store = {
  async get(k)   { try { const v=localStorage.getItem(k); return v?JSON.parse(v):null; } catch { return null; } },
  async set(k,v) { try { localStorage.setItem(k,JSON.stringify(v)); } catch {} },
  async del(k)   { try { localStorage.removeItem(k); } catch {} },
};
const K = {
  DB:"odf_v5_db", SESSION:"odf_v5_session", HIST:"odf_v5_hist",
  ODFS:"odf_v5_odfs", SITES:"odf_v5_sites", RACKS:"odf_v5_racks",
};

// ═══════════════════════════════════════════════════════════════════════
//  DONNÉES PAR DÉFAUT
// ═══════════════════════════════════════════════════════════════════════
const DEFAULT_SITES = [
  { id:"RDK", name:"Ras-Dika",  description:"Cable Landing Station (côté Mosquée)" },
  { id:"YAC", name:"YAC",       description:"Site YAC — bâtiment côté ville" },
  { id:"HAR", name:"Haramous",  description:"Station Haramous (via Siesta)" },
  { id:"DDC", name:"DDC",       description:"Data Center Djibouti" },
];

const DEFAULT_RACKS = [
  { id:"RDK-R1", site_id:"RDK", name:"R1", description:"Main Management Room" },
  { id:"RDK-R2", site_id:"RDK", name:"R2", description:"Rack secondaire" },
  { id:"YAC-R1", site_id:"YAC", name:"R1", description:"Salle technique YAC" },
  { id:"HAR-R1", site_id:"HAR", name:"R1", description:"Salle technique Haramous" },
];

// odf_type : EXTERNE = inter-sites | INTERNE = intra-site (iODF)
// is_active / odf_number / activated_at : gérés à l'activation
const DEFAULT_ODFS = [
  {id:"RDK-R1-ODF1",rack_id:"RDK-R1",site_a:"RDK",site_b:"YAC",odf_type:"EXTERNE",
   route:"Ras-Dika ↔ YAC (côté Mosquée)",cable:"Câble 144 Fibres",slots:6,ports_per_slot:12,
   is_active:false,odf_number:null,activated_at:null},
  {id:"RDK-R1-ODF2",rack_id:"RDK-R1",site_a:"RDK",site_b:"YAC",odf_type:"EXTERNE",
   route:"Ras-Dika → YAC — IODF CIENA",cable:"CIENA Shelf",slots:6,ports_per_slot:12,
   is_active:false,odf_number:null,activated_at:null},
  {id:"RDK-R1-ODF3",rack_id:"RDK-R1",site_a:"RDK",site_b:"RDK",odf_type:"INTERNE",
   route:"Ras-Dika MMR ↔ ODF L2",cable:"48 Fibres",slots:6,ports_per_slot:12,
   is_active:false,odf_number:null,activated_at:null},
  {id:"RDK-R1-ODF4",rack_id:"RDK-R1",site_a:"RDK",site_b:"YAC",odf_type:"EXTERNE",
   route:"Ras-Dika → YAC (BACK, Mosquée)",cable:"Câble 144 Fibres",slots:6,ports_per_slot:12,
   is_active:false,odf_number:null,activated_at:null},
  {id:"RDK-R1-ODF5",rack_id:"RDK-R1",site_a:"RDK",site_b:"HAR",odf_type:"EXTERNE",
   route:"Ras-Dika ↔ Haramous (Siesta)",cable:"96 Fibres",slots:6,ports_per_slot:12,
   is_active:false,odf_number:null,activated_at:null},
  {id:"RDK-R1-ODF6",rack_id:"RDK-R1",site_a:"RDK",site_b:"YAC",odf_type:"EXTERNE",
   route:"Ras-Dika → YAC-B (BACK cable)",cable:"Câble 144 Fibres",slots:6,ports_per_slot:12,
   is_active:false,odf_number:null,activated_at:null},
  {id:"RDK-R1-ODF7",rack_id:"RDK-R1",site_a:"RDK",site_b:"YAC",odf_type:"EXTERNE",
   route:"Ras-Dika → YAC — Backhaul TEJAS",cable:"Backhaul TEJAS",slots:6,ports_per_slot:12,
   is_active:false,odf_number:null,activated_at:null},
  {id:"RDK-R1-ODF8",rack_id:"RDK-R1",site_a:"RDK",site_b:"HAR",odf_type:"EXTERNE",
   route:"Ras-Dika ↔ Haramous — CIENA 2",cable:"CIENA SHELF 2",slots:6,ports_per_slot:12,
   is_active:false,odf_number:null,activated_at:null},
];

// ═══════════════════════════════════════════════════════════════════════
//  DONNÉES PORTS BRUTES (V4 inchangées)
// ═══════════════════════════════════════════════════════════════════════
const RAW={"RDK-R1-ODF1":[[1,1,"I","LAN 1","","","",""],[1,2,"N","","","","",""],[1,3,"N","","","","",""],[1,4,"I","ISP-IP/DATA","","","",""],[1,5,"A","DJT-22072025091210","615","100G","2AF / MTN","SEACOM"],[1,6,"A","DJT-18092025114423","621","100G","VF / WIOCC / LIQUID","AAE1"],[1,7,"A","DJT-08092025103023","627","100G","VF","SEACOM"],[1,8,"I","IXP-DDC 100G","","","",""],[1,9,"N","","","","",""],[1,10,"N","","","","",""],[1,12,"A","OT-000520","OT-000520","","",""],[2,1,"I","LAN 1","","","",""],[2,3,"I","D-MONEY 1","","","",""],[2,4,"I","D-MONEY 2","","","",""],[2,5,"I","BSS 1","","","",""],[2,6,"I","BSS 2","","","",""],[2,7,"N","","","","",""],[2,11,"A","DJT-05112025155228","632","100G","2AF / AIRTEL","SEACOM"],[2,12,"I","LAN 2","","","",""],[3,1,"N","","","","",""],[3,2,"N","","","","",""],[3,4,"N","","","","",""],[3,5,"N","","","","",""],[3,6,"N","","","","",""],[3,7,"N","","","","",""],[3,10,"I","IMS (DGS)","","","",""],[3,11,"I","IMS (DGS)","","","",""],[3,12,"N","","","","",""],[4,1,"A","DJT-16102025092520","623","100G","2AF / VF","SEACOM"],[4,2,"I","LINE CIENA RDK-YAC 1","","","",""],[4,6,"I","LINE CIENA RDK-YAC 2","","","",""],[4,7,"A","DJT-20052025100622","","","",""],[4,8,"I","SEACOM ROAMING","","","",""],[4,9,"I","LINE CIENA RDK-HAR 1","","","",""],[4,10,"I","LINE CIENA RDK-HAR 2","","","",""],[4,12,"I","DSSD","","","",""],[5,1,"N","","","","",""],[5,3,"I","DRM 2ETGE RDK","","","",""],[5,5,"I","ISP-CSM-HAR","","","",""],[5,6,"N","","","","",""],[5,7,"N","","","","",""],[5,8,"I","DMZ 3 DGS","","","",""],[5,10,"I","LINE TEJAS RDK","","","",""],[5,12,"I","ADSL FIREWALL","","","",""],[6,1,"I","DGS","","","",""],[6,2,"I","DGS","","","",""],[6,3,"I","DGS","","","",""],[6,4,"I","DGS","","","",""],[6,5,"I","COGENT 1","","","",""],[6,6,"I","COGENT 2","","","",""],[6,7,"I","COLT","","","",""],[6,12,"I","DCN (WIOCC)","","","",""]],"RDK-R1-ODF2":[[1,1,"A","DJT-03122024085532","554","100G","VF / WIOCC","DDC"],[1,2,"A","DJT-05112025155741","633","100G","2AF / AIRTEL","SEACOM"],[1,3,"A","DJT-06032025104529","529","100G","VF / WINGU","WINGU"],[1,4,"A","DJT-27022025100033","530","100G","VF / WINGU","WINGU"],[1,5,"A","DJT-03122024092607","531","100G","VF / WIOCC","DDC"],[1,6,"A","FJT-29022024114509","430","100G","VF / WIOCC",""],[1,7,"A","DJT-09072024172147","424","100G","VF","WINGU"],[1,8,"A","DJT-09072024172628","425","100G","VF","WINGU"],[1,10,"A","DJT-21112024112430","483","10G","VF / SILVER",""],[1,12,"A","DJT-03122024092024","520","100G","VF / WIOCC","DDC"],[2,1,"A","DJT-20082024092642","433","10G","VF / SILVER","DDC"],[2,2,"A","DJT-20082024092952","434","10G","VF / SILVER","DDC"],[2,3,"I","MULTIVISION-TO7","","10G","DGS","DDC"],[2,4,"A","DJT-10112024164855","475","10G","VF","WINGU"],[2,5,"A","DJT-10112024165053","476","10G","VF","WINGU"],[2,6,"A","DJT-10112024165344","477","10G","VF","WINGU"],[2,7,"A","DJT-15012025153824","536","10G","AIRTEL","EIG"],[3,1,"A","DJT-28012025145313","541","10G","MTN","DDC"],[3,2,"A","DJT-19052025144325","583","10G","MTN","DDC"],[3,3,"I","BRINGCOM 2.5G","","","","DARE-1"]],"RDK-R1-ODF8":[[1,1,"A","DJT-03033035101141","OT-000565","100G","2AF / VF / WIOCC","DDC"],[1,2,"A","DJT-22052025122110","OT-000563","100G","2AF / MTN",""],[1,3,"A","DJT-22072025090632","OT-000586","","2AF / MTN",""],[1,4,"A","DJT-12012023143045","OT-000552","","2AF / CMCC",""],[1,5,"A","OT-000679","OT-000679","","2AF / WIOCC",""],[1,6,"A","OT-000680","OT-000680","","2AF / WIOCC",""],[1,7,"A","OT-000681","OT-000681","","2AF / WIOCC",""],[1,8,"A","OT-000682","OT-000682","","2AF / WIOCC",""],[1,12,"A","DJT-03033035101341","OT-000593","","2AF / VF / WIOCC",""],[2,1,"A","DJT-03082025150002","OT-000594","","2AF / VF / CTG",""],[2,4,"A","DJT-11112025085042","OT-000639","","2AF / CMI",""],[2,5,"A","DJT-22012026090237","OT-000683","","2AF / WIOCC",""],[2,6,"A","DJT-10022026013546","OT-000715","","2AF / MTN",""],[2,7,"A","DJT-14042026135807","OT-000717","","2AF / CMI",""],[2,8,"A","DJT-14042026140240","OT-000718","","2AF / CCMC",""]]};

// ═══════════════════════════════════════════════════════════════════════
//  CONSTANTES
// ═══════════════════════════════════════════════════════════════════════
const CODE={A:"ACTIF",I:"INTERNE",N:"INCONNU",R:"RÉSERVÉ",L:"LIBRE"};
const REF_CAP=["","1G","2.5G","10G","25G","100G"];
const REF_STATUT=["ACTIF","INTERNE","INCONNU","RÉSERVÉ","LIBRE"];
const REF_OWNERS=["VF","VF / WIOCC","VF / WIOCC / LIQUID","VF / WINGU","VF / SILVER","2AF / MTN","2AF / VF","2AF / AIRTEL","2AF / WIOCC","2AF / CMCC","2AF / CMI","2AF / VF / WIOCC","2AF / VF / CTG","MTN","AIRTEL","DGS","DSI","HORMUUD","GOLIS","SOMTEL","WIOCC","LIQUID","SOMCABLE","LS","DRM"];

const SC={
  ACTIF:  {bg:"#C6EFCE",tx:"#1A5C28",bd:"#5A9E6A",dot:"#27AE60"},
  INTERNE:{bg:"#DDEEFF",tx:"#0D47A1",bd:"#6FA8DC",dot:"#2980B9"},
  INCONNU:{bg:"#FCE4D6",tx:"#7B2000",bd:"#E06C3A",dot:"#E74C3C"},
  RÉSERVÉ:{bg:"#FFF3CC",tx:"#6B4900",bd:"#E0B84A",dot:"#F39C12"},
  LIBRE:  {bg:"#F4F6F8",tx:"#AAB4BE",bd:"#DDE3EA",dot:"#BDC3C7"},
};

const NAVY="#0F2744", BLUE="#1565C0", ACCENT="#E8F4FD";
const CAN_EDIT  = r=>["admin","superviseur","technicien"].includes(r);
const CAN_ADMIN = r=>["admin","superviseur"].includes(r);

const DEMO_USERS=[
  {email:"admin@demo.dj",   pass:"admin123",  name:"Administrateur",role:"admin"},
  {email:"tech@demo.dj",    pass:"tech123",   name:"Technicien",    role:"technicien"},
  {email:"lecture@demo.dj", pass:"lecture123",name:"Lecture Seule", role:"lecture"},
];

// ─── Helpers ──────────────────────────────────────────────────────────
const spKey=(s,p)=>`S${String(s).padStart(2,"0")}P${String(p).padStart(2,"0")}`;
const tsNow=()=>new Date().toISOString();
const fmtDt=d=>d?new Date(d).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"}):"";

// Génère le numéro unique ODF : ex. ODF-RDK-202605-0001 / iODF-RDK-202605-0001
function generateODFNumber(odf, allOdfs) {
  const prefix = odf.odf_type === "INTERNE" ? "iODF" : "ODF";
  const site   = (odf.site_a || "UNK").toUpperCase();
  const now    = new Date();
  const period = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}`;
  const pat    = `${prefix}-${site}-${period}-`;
  const existing = allOdfs.filter(o=>o.odf_number?.startsWith(pat)).length;
  return `${pat}${String(existing+1).padStart(4,"0")}`;
}

function buildPorts(odfList){
  const db={};
  for(const odf of odfList){
    db[odf.id]={};
    for(let s=1;s<=odf.slots;s++)
      for(let p=1;p<=odf.ports_per_slot;p++){
        const k=spKey(s,p);
        db[odf.id][k]={id:`${odf.id}_${k}`,odf_id:odf.id,slot_port:k,slot:s,port:p,
          statut:"LIBRE",cid:"",ot_num:"",capacite:"",owner:"",destination:"",
          end_client:"",source_client:"",
          peer_odf_id:"",peer_slot_port:"",
          date_activ:"",remarques:"",updated_at:null};
      }
  }
  for(const [odf,rows] of Object.entries(RAW))
    for(const [s,p,c,cid,ot,cap,own,dst] of rows){
      const k=spKey(s,p);
      if(db[odf]?.[k]) Object.assign(db[odf][k],{
        statut:CODE[c]||"LIBRE",cid,ot_num:ot,capacite:cap,
        owner:own,destination:dst,source_client:own,
        end_client:"",peer_odf_id:"",peer_slot_port:""
      });
    }
  return db;
}

function calcStats(db,odfList){
  const s={ACTIF:0,INTERNE:0,INCONNU:0,RÉSERVÉ:0,LIBRE:0,total:0};
  const byOdf={};
  for(const odf of odfList){
    const os={ACTIF:0,INTERNE:0,INCONNU:0,RÉSERVÉ:0,LIBRE:0};
    for(const p of Object.values(db[odf.id]||{})){os[p.statut]++;s[p.statut]++;s.total++;}
    byOdf[odf.id]=os;
  }
  return{s,byOdf};
}

// Migre les ports existants en ajoutant les nouveaux champs si absents
function migratePortDb(db){
  const nd={};
  for(const [odfId,ports] of Object.entries(db)){
    nd[odfId]={};
    for(const [k,p] of Object.entries(ports)){
      nd[odfId][k]={
        end_client:"",source_client:p.owner||"",
        peer_odf_id:"",peer_slot_port:"",
        ...p,
      };
    }
  }
  return nd;
}

// ═══════════════════════════════════════════════════════════════════════
//  UI ATOMS
// ═══════════════════════════════════════════════════════════════════════
function Badge({st,sm}){
  const c=SC[st]||SC.LIBRE;
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,
    padding:sm?"2px 7px":"3px 10px",borderRadius:20,background:c.bg,
    border:`1px solid ${c.bd}`,fontSize:sm?10:11,fontWeight:700,color:c.tx,whiteSpace:"nowrap"}}>
    <span style={{width:6,height:6,borderRadius:"50%",background:c.dot,flexShrink:0}}/>
    {st}
  </span>;
}

function TypeBadge({type}){
  const isInt=type==="INTERNE";
  return <span style={{display:"inline-flex",alignItems:"center",gap:3,
    padding:"2px 8px",borderRadius:20,
    background:isInt?"#EDE7F6":"#E3F2FD",
    border:`1px solid ${isInt?"#B39DDB":"#90CAF9"}`,
    fontSize:10,fontWeight:800,
    color:isInt?"#4527A0":"#1565C0",whiteSpace:"nowrap"}}>
    {isInt?"iODF":"ODF"} {isInt?"INTERNE":"EXTERNE"}
  </span>;
}

function ODFNumberBadge({num}){
  if(!num) return <span style={{fontSize:9,color:"#AAB4BE",fontStyle:"italic"}}>Non activé</span>;
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,
    padding:"2px 9px",borderRadius:12,background:"#C6EFCE",
    border:"1px solid #5A9E6A",fontSize:10,fontWeight:800,
    color:"#1A5C28",fontFamily:"monospace"}}>
    ⚡ {num}
  </span>;
}

function Btn({children,onClick,variant="primary",sm=false,disabled=false,full=false}){
  const styles={
    primary:{bg:BLUE,color:"#fff",border:BLUE},
    success:{bg:"#27AE60",color:"#fff",border:"#27AE60"},
    danger: {bg:"#E74C3C",color:"#fff",border:"#E74C3C"},
    outline:{bg:"transparent",color:BLUE,border:BLUE},
    ghost:  {bg:"transparent",color:"#607D8B",border:"#DDE3EA"},
  };
  const s=styles[variant]||styles.primary;
  return <button onClick={onClick} disabled={disabled}
    style={{padding:sm?"5px 11px":"9px 18px",borderRadius:8,
      border:`1.5px solid ${disabled?"#DDE3EA":s.border}`,
      background:disabled?"#F4F6F8":s.bg,color:disabled?"#AAB4BE":s.color,
      fontWeight:600,fontSize:sm?11:13,cursor:disabled?"not-allowed":"pointer",
      fontFamily:"inherit",transition:"all .15s",
      width:full?"100%":"auto",whiteSpace:"nowrap"}}>
    {children}
  </button>;
}

function Sel({label,value,onChange,options,placeholder,disabled}){
  return(
    <div>
      {label&&<label style={{display:"block",fontSize:10,fontWeight:700,
        color:"#607D8B",letterSpacing:.5,marginBottom:4}}>{label}</label>}
      <select value={value} onChange={e=>onChange(e.target.value)} disabled={disabled}
        style={{width:"100%",padding:"8px 10px",border:"1.5px solid #DDE3EA",borderRadius:8,
          fontSize:12,fontFamily:"inherit",outline:"none",background:disabled?"#F8FAFC":"#fff",
          color:value?"#1a1a1a":"#90A4AE"}}>
        <option value="">{placeholder||"— Sélectionner —"}</option>
        {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Inp({label,value,onChange,placeholder,mono,readonly,required}){
  return(
    <div>
      {label&&<label style={{display:"block",fontSize:10,fontWeight:700,
        color:"#607D8B",letterSpacing:.5,marginBottom:4}}>
        {label}{required&&<span style={{color:"#E74C3C"}}> *</span>}
      </label>}
      <input value={value||""} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder||""} readOnly={readonly}
        style={{width:"100%",padding:"8px 10px",border:"1.5px solid #DDE3EA",
          borderRadius:8,fontSize:12,fontFamily:mono?"monospace":"inherit",
          background:readonly?"#F8FAFC":"#fff",outline:"none",boxSizing:"border-box"}}
        onFocus={e=>{if(!readonly)e.target.style.borderColor=BLUE;}}
        onBlur={e=>e.target.style.borderColor="#DDE3EA"}/>
    </div>
  );
}

function Modal({title,icon,onClose,children,footer,width=480}){
  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,
        background:"rgba(0,0,0,.4)",zIndex:200}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",
        transform:"translate(-50%,-50%)",width:`min(${width}px,95vw)`,
        background:"#fff",borderRadius:14,zIndex:201,
        boxShadow:"0 20px 60px rgba(0,0,0,.25)",overflow:"hidden",
        display:"flex",flexDirection:"column",maxHeight:"90vh"}}>
        <div style={{background:NAVY,padding:"14px 18px",flexShrink:0,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:14,fontWeight:800,color:"#fff"}}>{icon} {title}</div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.1)",
            border:"none",color:"#fff",width:28,height:28,borderRadius:7,
            cursor:"pointer",fontSize:14}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:20}}>{children}</div>
        {footer&&<div style={{padding:"12px 18px",borderTop:"1px solid #F0F4F8",
          display:"flex",gap:8,justifyContent:"flex-end",
          background:"#FAFBFC",flexShrink:0}}>{footer}</div>}
      </div>
    </>
  );
}

function ConfirmModal({title,message,onConfirm,onClose}){
  return(
    <Modal title={title} icon="⚠" onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose}>Annuler</Btn>
               <Btn variant="danger" onClick={onConfirm}>Supprimer</Btn></>}>
      <p style={{fontSize:13,color:"#444",lineHeight:1.7}}>{message}</p>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  SITE MODAL
// ═══════════════════════════════════════════════════════════════════════
function SiteModal({site,onSave,onClose,isNew,existingIds}){
  const [f,setF]=useState(site||{id:"",name:"",description:""});
  const [err,setErr]=useState("");
  const upd=k=>v=>setF(p=>({...p,[k]:v}));
  const save=()=>{
    if(!f.id||!f.name){setErr("ID et Nom sont obligatoires.");return;}
    if(isNew&&!/^[A-Z0-9]+$/.test(f.id)){setErr("ID : majuscules et chiffres uniquement.");return;}
    if(isNew&&existingIds.includes(f.id)){setErr("Cet ID existe déjà.");return;}
    onSave(f);
  };
  return(
    <Modal title={isNew?"Nouveau Site":"Modifier le Site"} icon={isNew?"🌐":"✏️"}
      onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose}>Annuler</Btn>
               <Btn onClick={save}>{isNew?"Créer":"Enregistrer"}</Btn></>}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Inp label="Identifiant (ID)" value={f.id} onChange={upd("id")}
          placeholder="ex: RDK / YAC / HAR" mono required readonly={!isNew}/>
        <Inp label="Nom du site" value={f.name} onChange={upd("name")} required/>
        <Inp label="Description" value={f.description} onChange={upd("description")}/>
        {err&&<div style={{background:"#FCE4D6",borderRadius:7,padding:"8px 12px",
          fontSize:12,color:"#7B2000"}}>{err}</div>}
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  RACK MODAL
// ═══════════════════════════════════════════════════════════════════════
function RackModal({rack,onSave,onClose,isNew,sites,existingIds}){
  const [f,setF]=useState(rack||{id:"",site_id:"",name:"",description:""});
  const [err,setErr]=useState("");
  const upd=k=>v=>setF(p=>({...p,[k]:v}));
  const siteOpts=sites.map(s=>({value:s.id,label:`${s.name} (${s.id})`}));
  const save=()=>{
    if(!f.site_id||!f.name){setErr("Site et Nom sont obligatoires.");return;}
    const genId=`${f.site_id}-${f.name.toUpperCase().replace(/\s+/g,"")}`;
    if(isNew&&existingIds.includes(genId)){setErr("Ce rack existe déjà.");return;}
    onSave({...f,id:isNew?genId:f.id});
  };
  return(
    <Modal title={isNew?"Nouveau Rack":"Modifier le Rack"} icon={isNew?"🔲":"✏️"}
      onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose}>Annuler</Btn>
               <Btn onClick={save}>{isNew?"Créer":"Enregistrer"}</Btn></>}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Sel label="Site *" value={f.site_id} onChange={upd("site_id")}
          options={siteOpts} placeholder="Sélectionner un site" disabled={!isNew}/>
        <Inp label="Nom du rack *" value={f.name} onChange={upd("name")} required/>
        <Inp label="Description" value={f.description} onChange={upd("description")}/>
        {f.site_id&&f.name&&isNew&&(
          <div style={{background:ACCENT,borderRadius:8,padding:"8px 12px",fontSize:11,color:BLUE}}>
            ID généré : <strong>{f.site_id}-{f.name.toUpperCase()}</strong>
          </div>
        )}
        {err&&<div style={{background:"#FCE4D6",borderRadius:7,padding:"8px 12px",
          fontSize:12,color:"#7B2000"}}>{err}</div>}
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  ODF MODAL — avec type INTERNE/EXTERNE
// ═══════════════════════════════════════════════════════════════════════
function ODFModal({odf,onSave,onClose,isNew,sites,racks,odfList,existingIds}){
  const [f,setF]=useState(odf||{
    id:"",rack_id:"",site_a:"",site_b:"",odf_type:"EXTERNE",
    route:"",cable:"",slots:6,ports_per_slot:12
  });
  const [err,setErr]=useState("");
  const upd=k=>v=>setF(p=>({...p,[k]:v}));

  const siteOpts  = sites.map(s=>({value:s.id,label:`${s.name} (${s.id})`}));
  const racksA    = racks.filter(r=>r.site_id===f.site_a);
  const racksAOpts= racksA.map(r=>({value:r.id,label:`${r.name} — ${r.description||r.id}`}));
  // Pour ODF INTERNE : site_b = site_a (même site)
  // Pour ODF EXTERNE : site_b = autre site
  const siteBOpts = f.odf_type==="INTERNE"
    ? sites.filter(s=>s.id===f.site_a).map(s=>({value:s.id,label:`${s.name} (même site — iODF)`}))
    : sites.filter(s=>s.id!==f.site_a).map(s=>({value:s.id,label:`${s.name} (${s.id})`}));

  const selectedSiteA=sites.find(s=>s.id===f.site_a);
  const selectedSiteB=sites.find(s=>s.id===f.site_b);

  const handleTypeChange=v=>{
    setF(p=>({...p,odf_type:v,
      site_b: v==="INTERNE" ? p.site_a : (p.site_b===p.site_a?"":p.site_b)
    }));
  };

  const save=()=>{
    if(!f.rack_id||!f.site_b||!f.route){
      setErr("Rack, Site B et Route sont obligatoires.");return;
    }
    if(f.odf_type==="INTERNE"&&f.site_a!==f.site_b){
      setErr("iODF INTERNE : Site A et Site B doivent être identiques.");return;
    }
    if(f.odf_type==="EXTERNE"&&f.site_a===f.site_b){
      setErr("ODF EXTERNE : Site A et Site B doivent être différents.");return;
    }
    const odfNum=(odfList.filter(o=>o.rack_id===f.rack_id).length+1).toString();
    const genId=isNew?`${f.rack_id}-ODF${odfNum}`:f.id;
    if(isNew&&existingIds.includes(genId)){setErr(`L'ID ${genId} existe déjà.`);return;}
    onSave({...f,id:genId,slots:parseInt(f.slots)||6,
      ports_per_slot:parseInt(f.ports_per_slot)||12,
      is_active:false,odf_number:null,activated_at:null});
  };

  const Div=({label})=>(
    <div style={{display:"flex",alignItems:"center",gap:10,margin:"4px 0"}}>
      <div style={{flex:1,height:1,background:"#F0F4F8"}}/>
      <span style={{fontSize:9,fontWeight:700,color:"#90A4AE",letterSpacing:1}}>{label}</span>
      <div style={{flex:1,height:1,background:"#F0F4F8"}}/>
    </div>
  );

  return(
    <Modal title={isNew?"Nouvel ODF":"Modifier l'ODF"} icon={isNew?"➕":"✏️"}
      onClose={onClose} width={520}
      footer={<><Btn variant="ghost" onClick={onClose}>Annuler</Btn>
               <Btn onClick={save}>{isNew?"Créer l'ODF":"Enregistrer"}</Btn></>}>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>

        {/* Type ODF */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {["EXTERNE","INTERNE"].map(t=>(
            <button key={t} onClick={()=>handleTypeChange(t)}
              style={{padding:"10px",borderRadius:9,border:"2px solid",
                borderColor:f.odf_type===t?(t==="INTERNE"?"#7C4DFF":"#1565C0"):"#DDE3EA",
                background:f.odf_type===t?(t==="INTERNE"?"#EDE7F6":"#E3F2FD"):"#fff",
                cursor:"pointer",fontWeight:700,fontSize:12,
                color:f.odf_type===t?(t==="INTERNE"?"#4527A0":"#1565C0"):"#607D8B"}}>
              {t==="INTERNE"?"iODF — INTERNE":"ODF — EXTERNE"}
              <div style={{fontSize:9,fontWeight:400,marginTop:3,
                color:f.odf_type===t?"inherit":"#AAB4BE"}}>
                {t==="INTERNE"?"Connexion intra-site":"Connexion inter-sites"}
              </div>
            </button>
          ))}
        </div>

        {/* Site A */}
        <div style={{background:"#EBF5FB",borderRadius:10,padding:14}}>
          <div style={{fontSize:10,fontWeight:800,color:BLUE,letterSpacing:1,marginBottom:10}}>
            ◉ CÔTÉ LOCAL — SITE A
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <Sel label="Site A *" value={f.site_a}
              onChange={v=>setF(p=>({...p,site_a:v,rack_id:"",
                site_b:p.odf_type==="INTERNE"?v:""}))}
              options={siteOpts} placeholder="Choisir le site local"/>
            <Sel label="Rack *" value={f.rack_id}
              onChange={upd("rack_id")} options={racksAOpts}
              placeholder={f.site_a?"Choisir le rack":"← Sélectionner d'abord le site"}
              disabled={!f.site_a}/>
          </div>
        </div>

        <Div label="CONNEXION PHYSIQUE"/>

        {/* Site B */}
        <div style={{background:f.odf_type==="INTERNE"?"#F3E5F5":"#F0FFF4",borderRadius:10,padding:14}}>
          <div style={{fontSize:10,fontWeight:800,
            color:f.odf_type==="INTERNE"?"#4527A0":"#1A5C28",letterSpacing:1,marginBottom:10}}>
            ◉ CÔTÉ {f.odf_type==="INTERNE"?"INTERNE (même site)":"DISTANT — SITE B"}
          </div>
          <Sel label="Site B *" value={f.site_b}
            onChange={upd("site_b")} options={siteBOpts}
            placeholder={f.site_a?"Choisir le site":"← Sélectionner d'abord le site A"}
            disabled={!f.site_a||(f.odf_type==="INTERNE")}/>
          {f.odf_type==="INTERNE"&&f.site_a&&(
            <div style={{fontSize:10,color:"#7C4DFF",marginTop:6}}>
              ↺ iODF : connexion locale sur {selectedSiteA?.name}
            </div>
          )}
        </div>

        <Div label="INFORMATIONS ODF"/>

        {selectedSiteA&&selectedSiteB&&(
          <div style={{background:"#F8FAFC",borderRadius:8,padding:"8px 12px",fontSize:11,color:"#607D8B"}}>
            <span style={{color:BLUE}}>◉ </span>
            <strong>{selectedSiteA.name}</strong> → <strong>{selectedSiteB.name}</strong>
          </div>
        )}

        <Inp label="Description de la route *" value={f.route} onChange={upd("route")}
          placeholder="ex: Ras-Dika ↔ YAC (côté Mosquée)"/>
        <Inp label="Type de câble" value={f.cable} onChange={upd("cable")}
          placeholder="ex: Câble 144 Fibres / CIENA Shelf"/>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Sel label="Nombre de slots" value={String(f.slots||6)}
            onChange={v=>upd("slots")(parseInt(v))}
            options={["4","6","8","12"].map(v=>({value:v,label:`${v} slots`}))}/>
          <Sel label="Ports par slot" value={String(f.ports_per_slot||12)}
            onChange={v=>upd("ports_per_slot")(parseInt(v))}
            options={["8","12","16","24"].map(v=>({value:v,label:`${v} ports`}))}/>
        </div>

        {isNew&&f.rack_id&&(
          <div style={{background:ACCENT,borderRadius:8,padding:"8px 12px",fontSize:11,color:BLUE}}>
            ID : <strong>{f.rack_id}-ODF{odfList.filter(o=>o.rack_id===f.rack_id).length+1}</strong>
            {" · "}{(f.slots||6)*(f.ports_per_slot||12)} ports · <TypeBadge type={f.odf_type}/>
          </div>
        )}
        {err&&<div style={{background:"#FCE4D6",borderRadius:7,padding:"8px 12px",
          fontSize:12,color:"#7B2000"}}>{err}</div>}
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  CONNECT PORT MODAL
//  Règles : INTERNE → même site seulement | EXTERNE → site différent seulement
// ═══════════════════════════════════════════════════════════════════════
function ConnectPortModal({port,db,odfList,sites,racks,onConnect,onClose}){
  const odfA   = odfList.find(o=>o.id===port.odf_id);
  const rackA  = racks.find(r=>r.id===odfA?.rack_id);
  const siteAId= rackA?.site_id||odfA?.site_a;
  const isInt  = odfA?.odf_type==="INTERNE";

  const [selSiteId,  setSelSiteId ] = useState("");
  const [selRackId,  setSelRackId ] = useState("");
  const [selOdfId,   setSelOdfId  ] = useState("");
  const [selSlot,    setSelSlot   ] = useState("");
  const [selPortKey, setSelPortKey] = useState("");
  const [srcClient,  setSrcClient ] = useState(port.source_client||port.owner||"");
  const [endClient,  setEndClient ] = useState(port.end_client||"");
  const [cap,        setCap       ] = useState(port.capacite||"");
  const [err,        setErr       ] = useState("");

  // Filtrer les sites selon la règle
  const allowedSites = sites.filter(s=>
    isInt ? s.id===siteAId : s.id!==siteAId
  );

  const filteredRacks = racks.filter(r=>r.site_id===selSiteId);
  const filteredOdfs  = odfList.filter(o=>o.rack_id===selRackId);

  const selOdf = odfList.find(o=>o.id===selOdfId);
  const slots  = selOdf ? Array.from({length:selOdf.slots},(_,i)=>i+1) : [];

  const slotPorts = useMemo(()=>{
    if(!selOdfId||!selSlot) return [];
    return Object.values(db[selOdfId]||{})
      .filter(p=>p.slot===parseInt(selSlot)&&p.statut==="LIBRE"&&!p.peer_odf_id)
      .sort((a,b)=>a.port-b.port);
  },[db,selOdfId,selSlot]);

  const targetPort = selPortKey ? db[selOdfId]?.[selPortKey] : null;

  const handleConfirm=()=>{
    if(!targetPort){setErr("Sélectionnez un port de destination.");return;}
    if(targetPort.id===port.id){setErr("Impossible de connecter un port à lui-même.");return;}
    onConnect({portA:port,portB:targetPort,source_client:srcClient,end_client:endClient,capacite:cap});
  };

  const ruleLabel = isInt
    ? `iODF INTERNE — connexion limitée au site ${sites.find(s=>s.id===siteAId)?.name||siteAId}`
    : `ODF EXTERNE — connexion vers un site différent de ${sites.find(s=>s.id===siteAId)?.name||siteAId}`;

  return(
    <Modal title="Connecter ce port à un port TTA" icon="🔗" onClose={onClose} width={560}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Annuler</Btn>
        <Btn variant="success" onClick={handleConfirm} disabled={!targetPort}>
          ✓ Connecter & Activer
        </Btn>
      </>}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>

        {/* Port source */}
        <div style={{background:NAVY,borderRadius:10,padding:"12px 14px"}}>
          <div style={{fontSize:9,color:"rgba(255,255,255,.5)",letterSpacing:1,marginBottom:4}}>PORT SOURCE</div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontFamily:"monospace",fontWeight:800,color:"#fff",fontSize:16}}>
              {port.slot_port}
            </span>
            <span style={{fontSize:11,color:"#64B5F6"}}>{port.odf_id}</span>
            <TypeBadge type={odfA?.odf_type||"EXTERNE"}/>
          </div>
        </div>

        {/* Règle active */}
        <div style={{background:isInt?"#F3E5F5":"#FFF8E1",borderRadius:8,padding:"8px 12px",
          fontSize:11,fontWeight:600,
          color:isInt?"#4527A0":"#E65100",
          border:`1px solid ${isInt?"#CE93D8":"#FFE082"}`}}>
          ⚠ {ruleLabel}
        </div>

        {/* Sélecteurs en cascade */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Sel label="Site destination *"
            value={selSiteId} onChange={v=>{setSelSiteId(v);setSelRackId("");setSelOdfId("");setSelSlot("");setSelPortKey("");}}
            options={allowedSites.map(s=>({value:s.id,label:`${s.name} (${s.id})`}))}
            placeholder="Choisir un site"/>
          <Sel label="Rack"
            value={selRackId} onChange={v=>{setSelRackId(v);setSelOdfId("");setSelSlot("");setSelPortKey("");}}
            options={filteredRacks.map(r=>({value:r.id,label:r.name}))}
            placeholder={selSiteId?"Choisir un rack":"← Site d'abord"}
            disabled={!selSiteId}/>
          <Sel label="ODF destination"
            value={selOdfId} onChange={v=>{setSelOdfId(v);setSelSlot("");setSelPortKey("");}}
            options={filteredOdfs.map(o=>({value:o.id,label:`${o.id.split("-").slice(-1)[0]} — ${o.odf_number||"non activé"}`}))}
            placeholder={selRackId?"Choisir un ODF":"← Rack d'abord"}
            disabled={!selRackId}/>
          <Sel label="Slot"
            value={selSlot} onChange={v=>{setSelSlot(v);setSelPortKey("");}}
            options={slots.map(s=>({value:String(s),label:`Slot ${s}`}))}
            placeholder={selOdfId?"Choisir un slot":"← ODF d'abord"}
            disabled={!selOdfId}/>
        </div>

        {selSlot&&(
          <div>
            <label style={{display:"block",fontSize:10,fontWeight:700,
              color:"#607D8B",letterSpacing:.5,marginBottom:6}}>
              PORT LIBRE ({slotPorts.length} disponible{slotPorts.length>1?"s":""})
            </label>
            {slotPorts.length===0
              ?<div style={{fontSize:11,color:"#E74C3C",padding:"8px 12px",background:"#FCE4D6",borderRadius:7}}>
                 Aucun port libre dans ce slot.
               </div>
              :<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {slotPorts.map(p=>(
                  <button key={p.slot_port} onClick={()=>setSelPortKey(p.slot_port)}
                    style={{padding:"5px 10px",borderRadius:6,fontFamily:"monospace",fontWeight:700,
                      fontSize:11,cursor:"pointer",border:"1.5px solid",
                      borderColor:selPortKey===p.slot_port?"#27AE60":"#DDE3EA",
                      background:selPortKey===p.slot_port?"#C6EFCE":"#fff",
                      color:selPortKey===p.slot_port?"#1A5C28":"#555"}}>
                    {p.slot_port}
                  </button>
                ))}
              </div>
            }
          </div>
        )}

        {targetPort&&(
          <div style={{background:"#C6EFCE",borderRadius:8,padding:"10px 12px",
            fontSize:11,fontWeight:600,color:"#1A5C28",border:"1px solid #5A9E6A"}}>
            ✓ Port sélectionné : <span style={{fontFamily:"monospace"}}>{targetPort.slot_port}</span>
            {" — "}{selOdf?.id} ({sites.find(s=>s.id===selSiteId)?.name})
          </div>
        )}

        {/* Infos service */}
        <div style={{borderTop:"1px solid #F0F4F8",paddingTop:12}}>
          <div style={{fontSize:10,fontWeight:700,color:"#607D8B",letterSpacing:.5,marginBottom:10}}>
            INFORMATIONS SERVICE / CLIENT
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Inp label="Client source (opérateur / fournisseur)" value={srcClient}
              onChange={setSrcClient} placeholder="ex: Djibouti Telecom, VF"/>
            <Inp label="Client final (bénéficiaire)" value={endClient}
              onChange={setEndClient} placeholder="ex: Ministère des Finances"/>
          </div>
          <div style={{marginTop:10}}>
            <Sel label="Capacité" value={cap} onChange={setCap}
              options={["1G","2.5G","10G","25G","100G"].map(v=>({value:v,label:v}))}
              placeholder="— Non spécifié —"/>
          </div>
        </div>

        {err&&<div style={{background:"#FCE4D6",borderRadius:7,padding:"8px 12px",
          fontSize:12,color:"#7B2000"}}>{err}</div>}
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  PORTS MANAGER MODAL (inchangé V4 + migration champs)
// ═══════════════════════════════════════════════════════════════════════
function PortsManagerModal({odf,db,onSave,onClose}){
  const ports=db[odf.id]||{};
  const [deleting,setDeleting]=useState(null);
  const maxSlot=Math.max(...Object.values(ports).map(p=>p.slot),odf.slots);
  const missingBySlot=useMemo(()=>{
    const missing={};
    for(let s=1;s<=maxSlot+1;s++){
      const existing=Object.values(ports).filter(p=>p.slot===s).map(p=>p.port);
      const gaps=[];
      for(let p=1;p<=odf.ports_per_slot+1;p++) if(!existing.includes(p)) gaps.push(p);
      if(gaps.length) missing[s]=gaps.slice(0,6);
    }
    return missing;
  },[ports,maxSlot,odf.ports_per_slot]);
  const addPort=(slot,port)=>{
    const k=spKey(slot,port);
    if(ports[k]) return;
    onSave({...ports,[k]:{id:`${odf.id}_${k}`,odf_id:odf.id,slot_port:k,slot,port,
      statut:"LIBRE",cid:"",ot_num:"",capacite:"",owner:"",destination:"",
      end_client:"",source_client:"",peer_odf_id:"",peer_slot_port:"",
      date_activ:"",remarques:"",updated_at:tsNow()}});
  };
  const deletePort=(k)=>{const np={...ports};delete np[k];onSave(np);setDeleting(null);};
  const liberePorts=Object.values(ports).filter(p=>p.statut==="LIBRE"&&!p.peer_odf_id);
  return(
    <Modal title={`Ports — ${odf.id.replace("RDK-","")}`} icon="🔌" onClose={onClose} width={600}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
        {[["Total",Object.keys(ports).length,NAVY],
          ["Occupés",Object.values(ports).filter(p=>p.statut!=="LIBRE").length,"#1565C0"],
          ["Libres",liberePorts.length,"#27AE60"]].map(([l,v,c])=>(
          <div key={l} style={{background:"#F8FAFC",borderRadius:8,padding:10,textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:800,color:c,fontFamily:"monospace"}}>{v}</div>
            <div style={{fontSize:10,color:"#607D8B"}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{background:"#F0FFF4",borderRadius:10,padding:14,marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:"#1A5C28",marginBottom:10}}>➕ Ajouter un port</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {Object.entries(missingBySlot).slice(0,4).map(([slot,ps])=>(
            <div key={slot}>
              <div style={{fontSize:9,color:"#607D8B",marginBottom:4,fontWeight:600}}>Slot {slot}</div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {ps.map(p=>(
                  <button key={p} onClick={()=>addPort(parseInt(slot),p)}
                    style={{padding:"3px 8px",borderRadius:5,border:"1.5px solid #27AE60",
                      background:"#fff",color:"#1A5C28",fontSize:10,fontWeight:700,
                      cursor:"pointer",fontFamily:"monospace"}}>P{p}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:"#FDE8E8",borderRadius:10,padding:14}}>
        <div style={{fontSize:11,fontWeight:700,color:"#7B2000",marginBottom:10}}>🗑 Supprimer un port libre</div>
        {liberePorts.length===0
          ?<div style={{fontSize:12,color:"#90A4AE",fontStyle:"italic"}}>Aucun port libre à supprimer.</div>
          :<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {liberePorts.slice(0,20).map(p=>(
              <button key={p.slot_port} onClick={()=>setDeleting(p.slot_port)}
                style={{padding:"3px 8px",borderRadius:5,border:"1.5px solid #E74C3C",
                  background:"#fff",color:"#7B2000",fontSize:10,fontWeight:700,
                  cursor:"pointer",fontFamily:"monospace"}}>{p.slot_port}</button>
            ))}
          </div>
        }
      </div>
      {deleting&&<ConfirmModal title="Supprimer le port"
        message={<>Supprimer le port <strong style={{fontFamily:"monospace"}}>{deleting}</strong> ?</>}
        onConfirm={()=>deletePort(deleting)} onClose={()=>setDeleting(null)}/>}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  MANAGE INFRA
// ═══════════════════════════════════════════════════════════════════════
function ManageInfra({sites,racks,odfList,db,stats,user,
  onAddSite,onEditSite,onDeleteSite,
  onAddRack,onEditRack,onDeleteRack,
  onAddODF,onEditODF,onDeleteODF,onUpdatePorts}){
  const [tab,setTab]=useState("sites");
  const [modal,setModal]=useState(null);
  const [filterSite,setFilterSite]=useState("");
  const close=()=>setModal(null);
  const tabStyle=(t)=>({
    padding:"6px 14px",borderRadius:7,border:"none",cursor:"pointer",fontSize:11,fontWeight:tab===t?700:400,
    background:tab===t?NAVY:"#F0F4F8",color:tab===t?"#fff":"#607D8B"
  });
  const filterRacks=filterSite?racks.filter(r=>r.site_id===filterSite):racks;
  const filterOdfs=filterSite?odfList.filter(o=>{
    const r=racks.find(r2=>r2.id===o.rack_id);
    return r&&r.site_id===filterSite;
  }):odfList;

  return(
    <div style={{maxWidth:1100}}>
      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        {[["sites","🌐 Sites"],["racks","🔲 Racks"],["odfs","◉ ODFs"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={tabStyle(t)}>{l}</button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
          <select value={filterSite} onChange={e=>setFilterSite(e.target.value)}
            style={{padding:"5px 9px",border:"1.5px solid #DDE3EA",borderRadius:7,
              fontSize:11,background:"#fff",fontFamily:"inherit"}}>
            <option value="">Tous les sites</option>
            {sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {tab==="sites"&&<Btn sm onClick={()=>setModal({t:"addSite"})}>＋ Site</Btn>}
          {tab==="racks"&&<Btn sm onClick={()=>setModal({t:"addRack",defaultSite:filterSite})}>＋ Rack</Btn>}
          {tab==="odfs"&&<Btn sm onClick={()=>setModal({t:"addODF",defaultSite:filterSite})}>＋ ODF</Btn>}
        </div>
      </div>

      {/* Sites tab */}
      {tab==="sites"&&(
        <div style={{display:"grid",gap:10}}>
          {sites.map(site=>{
            const siteRacks=racks.filter(r=>r.site_id===site.id);
            const siteOdfs=odfList.filter(o=>siteRacks.some(r=>r.id===o.rack_id));
            const activOdfs=siteOdfs.filter(o=>o.is_active).length;
            return(
              <div key={site.id} style={{background:"#fff",borderRadius:12,
                padding:"14px 18px",boxShadow:"0 1px 6px rgba(0,0,0,.06)",
                display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                <div style={{background:NAVY,borderRadius:9,padding:"9px 13px",flexShrink:0}}>
                  <div style={{fontSize:13,fontWeight:800,color:"#64B5F6",fontFamily:"monospace"}}>{site.id}</div>
                </div>
                <div style={{flex:1,minWidth:160}}>
                  <div style={{fontSize:13,fontWeight:700,color:NAVY}}>{site.name}</div>
                  <div style={{fontSize:10,color:"#90A4AE",marginTop:1}}>{site.description}</div>
                  <div style={{display:"flex",gap:10,marginTop:5,fontSize:10,color:"#607D8B"}}>
                    <span>🔲 {siteRacks.length} rack(s)</span>
                    <span>◉ {siteOdfs.length} ODF(s)</span>
                    <span style={{color:activOdfs>0?"#27AE60":"#90A4AE"}}>⚡ {activOdfs} activé(s)</span>
                  </div>
                </div>
                <div style={{display:"flex",gap:5}}>
                  <Btn sm variant="outline" onClick={()=>setModal({t:"editSite",d:site})}>✏️</Btn>
                  <Btn sm variant="danger"  onClick={()=>setModal({t:"delSite",d:site})}>🗑</Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Racks tab */}
      {tab==="racks"&&(
        <div style={{display:"grid",gap:10}}>
          {filterRacks.map(rack=>{
            const site=sites.find(s=>s.id===rack.site_id);
            const rOdfs=odfList.filter(o=>o.rack_id===rack.id);
            return(
              <div key={rack.id} style={{background:"#fff",borderRadius:12,
                padding:"14px 18px",boxShadow:"0 1px 6px rgba(0,0,0,.06)",
                display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                <div style={{background:NAVY,borderRadius:9,padding:"8px 12px",flexShrink:0}}>
                  <div style={{fontFamily:"monospace",fontWeight:800,color:"#64B5F6",fontSize:11}}>{rack.id}</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,.4)",marginTop:1}}>{site?.name}</div>
                </div>
                <div style={{flex:1,minWidth:140}}>
                  <div style={{fontSize:12,fontWeight:700,color:NAVY}}>{rack.name}</div>
                  <div style={{fontSize:10,color:"#90A4AE"}}>{rack.description}</div>
                  <div style={{fontSize:10,color:"#607D8B",marginTop:4}}>{rOdfs.length} ODF(s)</div>
                </div>
                {CAN_ADMIN(user?.role)&&<div style={{display:"flex",gap:5}}>
                  <Btn sm variant="outline" onClick={()=>setModal({t:"editRack",d:rack})}>✏️</Btn>
                  <Btn sm variant="danger"  onClick={()=>setModal({t:"delRack",d:rack})}>🗑</Btn>
                </div>}
              </div>
            );
          })}
        </div>
      )}

      {/* ODFs tab */}
      {tab==="odfs"&&(
        <div style={{display:"grid",gap:10}}>
          {filterOdfs.map(odf=>{
            const rack=racks.find(r=>r.id===odf.rack_id);
            const site=sites.find(s=>s.id===odf.site_a);
            const siteB=sites.find(s=>s.id===odf.site_b);
            const o=stats.byOdf[odf.id]||{};
            const total=Object.keys(db[odf.id]||{}).length;
            const pct=total?Math.round((o.ACTIF+o.INTERNE+o.INCONNU+o.RÉSERVÉ)*100/total):0;
            return(
              <div key={odf.id} style={{background:"#fff",borderRadius:12,
                padding:"14px 18px",boxShadow:"0 1px 6px rgba(0,0,0,.06)",
                display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                <div style={{background:NAVY,borderRadius:9,padding:"8px 12px",flexShrink:0}}>
                  <div style={{fontFamily:"monospace",fontWeight:800,color:"#64B5F6",fontSize:11}}>
                    {odf.id.replace("RDK-","")}
                  </div>
                  {rack&&<div style={{fontSize:9,color:"rgba(255,255,255,.4)",marginTop:1}}>
                    {rack.name} · {site?.name}
                  </div>}
                </div>
                <div style={{flex:1,minWidth:160}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:4}}>
                    <TypeBadge type={odf.odf_type}/>
                    <ODFNumberBadge num={odf.odf_number}/>
                  </div>
                  <div style={{fontSize:12,fontWeight:600,color:NAVY}}>
                    {site?.name||odf.site_a}
                    <span style={{color:"#BDC3C7",margin:"0 5px",fontFamily:"monospace"}}>→</span>
                    {siteB?.name||odf.site_b}
                  </div>
                  <div style={{fontSize:10,color:"#90A4AE",marginTop:1}}>{odf.cable}</div>
                </div>
                <div style={{minWidth:120}}>
                  <div style={{height:5,background:"#F0F4F8",borderRadius:3,overflow:"hidden",marginBottom:4}}>
                    {[["ACTIF",o.ACTIF],["INTERNE",o.INTERNE],["INCONNU",o.INCONNU]].map(([st,v])=>(
                      <div key={st} style={{display:"inline-block",
                        width:total?`${(v||0)*100/total}%`:"0",
                        height:"100%",background:SC[st]?.dot}}/>
                    ))}
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#90A4AE"}}>
                    <span>{total} ports</span>
                    <span style={{fontWeight:700,
                      color:pct>70?"#E74C3C":pct>40?"#F39C12":"#27AE60"}}>{pct}%</span>
                  </div>
                </div>
                <div style={{display:"flex",gap:5,flexShrink:0}}>
                  <Btn sm variant="ghost" onClick={()=>setModal({t:"ports",d:odf})}>🔌 Ports</Btn>
                  {CAN_ADMIN(user?.role)&&<>
                    <Btn sm variant="outline" onClick={()=>setModal({t:"editODF",d:odf})}>✏️</Btn>
                    <Btn sm variant="danger"  onClick={()=>setModal({t:"delODF",d:odf})}>🗑</Btn>
                  </>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {modal?.t==="addSite"&&<SiteModal isNew existingIds={sites.map(s=>s.id)}
        onSave={s=>{onAddSite(s);close();}} onClose={close}/>}
      {modal?.t==="editSite"&&<SiteModal site={modal.d} existingIds={sites.map(s=>s.id)}
        onSave={s=>{onEditSite(s);close();}} onClose={close}/>}
      {modal?.t==="delSite"&&<ConfirmModal title={`Supprimer ${modal.d.name}`}
        message={<>Supprimer <strong>{modal.d.name}</strong> supprimera tous ses racks et ODFs. Irréversible.</>}
        onConfirm={()=>{onDeleteSite(modal.d.id);close();}} onClose={close}/>}
      {modal?.t==="addRack"&&<RackModal isNew sites={sites} existingIds={racks.map(r=>r.id)}
        rack={modal.defaultSite?{site_id:modal.defaultSite}:null}
        onSave={r=>{onAddRack(r);close();}} onClose={close}/>}
      {modal?.t==="editRack"&&<RackModal rack={modal.d} sites={sites} existingIds={racks.map(r=>r.id)}
        onSave={r=>{onEditRack(r);close();}} onClose={close}/>}
      {modal?.t==="delRack"&&<ConfirmModal title={`Supprimer rack ${modal.d.name}`}
        message={<>Supprimer <strong>{modal.d.id}</strong> et ses ODFs. Irréversible.</>}
        onConfirm={()=>{onDeleteRack(modal.d.id);close();}} onClose={close}/>}
      {modal?.t==="addODF"&&<ODFModal isNew sites={sites} racks={racks} odfList={odfList}
        existingIds={odfList.map(o=>o.id)}
        odf={modal.defaultSite?{site_a:modal.defaultSite}:null}
        onSave={o=>{onAddODF(o);close();}} onClose={close}/>}
      {modal?.t==="editODF"&&<ODFModal odf={modal.d} sites={sites} racks={racks} odfList={odfList}
        existingIds={odfList.map(o=>o.id)}
        onSave={o=>{onEditODF(o);close();}} onClose={close}/>}
      {modal?.t==="delODF"&&<ConfirmModal title={`Supprimer ${modal.d.id}`}
        message={<>Supprimer <strong>{modal.d.id}</strong> et ses {Object.keys(db[modal.d.id]||{}).length} ports. Irréversible.</>}
        onConfirm={()=>{onDeleteODF(modal.d.id);close();}} onClose={close}/>}
      {modal?.t==="ports"&&<PortsManagerModal odf={modal.d} db={db}
        onSave={ports=>{onUpdatePorts(modal.d.id,ports);close();}}
        onClose={close}/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  AUTH + SIDEBAR + TOPBAR
// ═══════════════════════════════════════════════════════════════════════
function AuthScreen({onAuth}){
  const [email,setEmail]=useState("admin@demo.dj");
  const [pass,setPass]=useState("admin123");
  const [err,setErr]=useState(""); const [ld,setLd]=useState(false);
  const login=async()=>{
    setLd(true);setErr("");await new Promise(r=>setTimeout(r,500));
    const u=DEMO_USERS.find(u=>u.email===email&&u.pass===pass);
    if(u) onAuth(u); else setErr("Email ou mot de passe incorrect.");
    setLd(false);
  };
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0F2744,#1565C0)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{background:"#fff",borderRadius:16,padding:"32px 28px",
        width:"100%",maxWidth:390,boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{fontSize:34,color:NAVY}}>◉</div>
          <div style={{fontSize:21,fontWeight:800,color:NAVY,marginTop:6}}>ODF Manager</div>
          <div style={{fontSize:11,color:"#90A4AE",marginTop:3}}>v5.0 · Numérotation + Connexions</div>
        </div>
        <div style={{background:"#EBF5FB",borderRadius:9,padding:"9px 13px",
          marginBottom:16,fontSize:11,color:BLUE,lineHeight:1.9}}>
          admin@demo.dj / admin123<br/>
          tech@demo.dj / tech123
        </div>
        {[["EMAIL","email",email,setEmail],["MOT DE PASSE","password",pass,setPass]].map(([l,t,v,s])=>(
          <div key={l} style={{marginBottom:12}}>
            <label style={{display:"block",fontSize:10,fontWeight:700,color:"#607D8B",
              letterSpacing:.5,marginBottom:4}}>{l}</label>
            <input type={t} value={v} onChange={e=>s(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&login()}
              style={{width:"100%",padding:"10px 12px",border:"1.5px solid #DDE3EA",
                borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}
              onFocus={e=>e.target.style.borderColor=BLUE}
              onBlur={e=>e.target.style.borderColor="#DDE3EA"}/>
          </div>
        ))}
        {err&&<div style={{background:"#FCE4D6",borderRadius:7,padding:"8px 12px",
          fontSize:12,color:"#7B2000",marginBottom:12}}>{err}</div>}
        <button onClick={login} disabled={ld}
          style={{width:"100%",padding:"12px",borderRadius:9,border:"none",
            background:ld?"#DDE3EA":BLUE,color:"#fff",fontWeight:700,fontSize:14,
            cursor:ld?"wait":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
          {ld&&<div style={{width:16,height:16,border:"2px solid rgba(255,255,255,.4)",
            borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
          {ld?"Connexion…":"Se connecter"}
        </button>
      </div>
    </div>
  );
}

function Sidebar({view,setView,stats,user,onLogout,collapsed,setCollapsed}){
  const [hov,setHov]=useState(null);
  const W=collapsed?54:214;
  const inconnu=stats.s.INCONNU||0;
  const items=[
    {id:"dashboard",icon:"◉",  label:"Dashboard"},
    {id:"odf",      icon:"⬛", label:"Panneaux ODF"},
    {id:"registry", icon:"≡",  label:"Registre"},
    {id:"clients",  icon:"◑",  label:"Vue Clients"},
    {id:"manage",   icon:"⊞",  label:"Gérer Infra",adminOnly:true},
    {id:"export",   icon:"↓",  label:"Export / Import"},
    {id:"history",  icon:"↺",  label:"Historique"},
    {id:"alerts",   icon:"⚠",  label:"Alertes",badge:inconnu},
  ];
  const RCOL={admin:{bg:"#FCE4D6",tx:"#7B2000"},superviseur:{bg:"#FFF3CC",tx:"#6B4900"},
    technicien:{bg:"#C6EFCE",tx:"#1A5C28"},lecture:{bg:"#F4F6F8",tx:"#607D8B"}};
  return(
    <div style={{width:W,minWidth:W,background:NAVY,display:"flex",flexDirection:"column",
      height:"100%",flexShrink:0,boxShadow:"2px 0 16px rgba(0,0,0,.28)",
      transition:"width .22s cubic-bezier(.4,0,.2,1),min-width .22s cubic-bezier(.4,0,.2,1)",
      overflow:"hidden",zIndex:10}}>
      <div style={{padding:collapsed?"13px 0":"15px 14px 11px",
        borderBottom:"1px solid rgba(255,255,255,.08)",
        display:"flex",alignItems:"center",justifyContent:collapsed?"center":"space-between",flexShrink:0}}>
        {!collapsed&&<div style={{overflow:"hidden",whiteSpace:"nowrap"}}>
          <div style={{fontSize:8,letterSpacing:3,color:"#64B5F6",fontWeight:700,marginBottom:2}}>GESTION FIBRE OPTIQUE</div>
          <div style={{fontSize:14,fontWeight:800,color:"#fff"}}>ODF Manager</div>
          <div style={{fontSize:9,color:"rgba(255,255,255,.3)",marginTop:1}}>v5.0 · Numérotation automatique</div>
        </div>}
        <button onClick={()=>setCollapsed(c=>!c)}
          style={{background:"rgba(255,255,255,.08)",border:"none",color:"rgba(255,255,255,.7)",
            borderRadius:7,width:28,height:28,cursor:"pointer",display:"flex",
            alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>
          {collapsed?"›":"‹"}
        </button>
      </div>
      <nav style={{flex:1,padding:collapsed?"8px 5px":"10px 7px",overflowY:"auto",overflowX:"hidden"}}>
        {items.filter(i=>!i.adminOnly||CAN_ADMIN(user?.role)).map(item=>{
          const active=view===item.id, isHov=hov===item.id;
          return(
            <div key={item.id} style={{position:"relative",marginBottom:3}}>
              <button onClick={()=>{setView(item.id);setCollapsed(true);}}
                onMouseEnter={()=>setHov(item.id)} onMouseLeave={()=>setHov(null)}
                style={{display:"flex",alignItems:"center",gap:collapsed?0:8,
                  justifyContent:collapsed?"center":"flex-start",width:"100%",
                  padding:collapsed?"9px 0":"9px 10px",
                  background:active?"rgba(21,101,192,.55)":isHov?"rgba(255,255,255,.07)":"transparent",
                  border:active?"1px solid rgba(21,101,192,.7)":"1px solid transparent",
                  borderRadius:7,cursor:"pointer",transition:"all .12s",
                  color:active?"#fff":item.badge>0?"#FFAB40":"rgba(255,255,255,.65)",position:"relative"}}>
                <span style={{fontSize:14,flexShrink:0}}>{item.icon}</span>
                {!collapsed&&<span style={{fontSize:11,fontWeight:active?700:400,whiteSpace:"nowrap"}}>{item.label}</span>}
                {item.badge>0&&!collapsed&&<span style={{marginLeft:"auto",background:"#E74C3C",
                  color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:9,fontWeight:700}}>{item.badge}</span>}
                {item.badge>0&&collapsed&&<span style={{position:"absolute",top:4,right:4,
                  width:7,height:7,borderRadius:"50%",background:"#E74C3C",border:"1.5px solid "+NAVY}}/>}
              </button>
              {collapsed&&isHov&&(
                <div style={{position:"absolute",left:"calc(100% + 8px)",top:"50%",
                  transform:"translateY(-50%)",zIndex:999,background:"#1A2F4A",color:"#fff",
                  padding:"5px 10px",borderRadius:7,fontSize:11,fontWeight:600,
                  whiteSpace:"nowrap",boxShadow:"0 4px 16px rgba(0,0,0,.35)",pointerEvents:"none"}}>
                  {item.label}
                  {item.badge>0&&<span style={{marginLeft:5,background:"#E74C3C",color:"#fff",
                    borderRadius:8,padding:"1px 5px",fontSize:9}}>{item.badge}</span>}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      {!collapsed&&user&&(
        <div style={{padding:"10px 12px",borderTop:"1px solid rgba(255,255,255,.08)",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}>
            <div style={{width:26,height:26,borderRadius:"50%",
              background:RCOL[user.role]?.bg||"#DDE3EA",display:"flex",alignItems:"center",
              justifyContent:"center",fontSize:10,fontWeight:800,
              color:RCOL[user.role]?.tx||NAVY,flexShrink:0}}>
              {(user.name||"?")[0].toUpperCase()}
            </div>
            <div style={{overflow:"hidden"}}>
              <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.85)",
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</div>
              <div style={{fontSize:8,fontWeight:700,color:RCOL[user.role]?.bg||"#64B5F6",
                letterSpacing:.5,textTransform:"uppercase"}}>{user.role}</div>
            </div>
          </div>
          <button onClick={onLogout}
            style={{width:"100%",padding:"4px",border:"1px solid rgba(255,255,255,.1)",
              borderRadius:6,background:"transparent",color:"rgba(255,255,255,.4)",
              fontSize:10,cursor:"pointer"}}>Déconnexion</button>
        </div>
      )}
    </div>
  );
}

function TopBar({search,setSearch,saved}){
  return(
    <div style={{height:52,background:"#fff",borderBottom:"1px solid #E8ECF0",
      display:"flex",alignItems:"center",padding:"0 18px",gap:12,
      boxShadow:"0 1px 4px rgba(0,0,0,.05)",flexShrink:0}}>
      <div style={{position:"relative",flex:1,maxWidth:440}}>
        <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",
          fontSize:13,color:"#AAB4BE"}}>⌕</span>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Rechercher : CID, client, port, ODF…"
          style={{width:"100%",padding:"7px 30px 7px 28px",border:"1.5px solid #DDE3EA",
            borderRadius:8,fontSize:12,outline:"none",background:"#F8FAFC",
            fontFamily:"inherit",boxSizing:"border-box"}}
          onFocus={e=>{e.target.style.borderColor=BLUE;e.target.style.background="#fff";}}
          onBlur={e=>{e.target.style.borderColor="#DDE3EA";e.target.style.background="#F8FAFC";}}/>
        {search&&<button onClick={()=>setSearch("")}
          style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",
            background:"none",border:"none",color:"#AAB4BE",cursor:"pointer",fontSize:12}}>✕</button>}
      </div>
      <div style={{fontSize:10,display:"flex",alignItems:"center",gap:5,
        color:saved?"#27AE60":"#90A4AE",transition:"color .3s",whiteSpace:"nowrap"}}>
        <span style={{width:6,height:6,borderRadius:"50%",
          background:saved?"#27AE60":"#BDC3C7",transition:"background .3s"}}/>
        {saved?"Enregistré":"Local"}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════════════
function Dashboard({stats,odfList,sites,racks,db,setView,setActiveODF}){
  const {s,byOdf}=stats;
  const totalOdfs=odfList.length;
  const activOdfs=odfList.filter(o=>o.is_active).length;
  const extOdfs=odfList.filter(o=>o.odf_type==="EXTERNE").length;
  const intOdfs=odfList.filter(o=>o.odf_type==="INTERNE").length;
  return(
    <div style={{maxWidth:1060}}>
      {/* KPIs ports */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}}>
        {[["ACTIF","Circuits actifs",null],["INTERNE","Usages internes",null],
          ["INCONNU","À auditer","alerts"],["LIBRE","Disponibles",null]].map(([st,lbl,go])=>{
          const c=SC[st];
          return(
            <div key={st} onClick={()=>go&&setView(go)}
              style={{background:"#fff",borderRadius:12,padding:"14px 16px",
                boxShadow:"0 1px 6px rgba(0,0,0,.06)",borderTop:`3px solid ${c.dot}`,
                cursor:go?"pointer":"default",transition:"transform .15s"}}
              onMouseEnter={e=>{if(go)e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
              <div style={{fontSize:30,fontWeight:800,color:c.dot,fontFamily:"monospace"}}>{s[st]||0}</div>
              <div style={{fontSize:11,color:"#607D8B",marginTop:2}}>{lbl}</div>
              <div style={{marginTop:6}}><Badge st={st} sm/></div>
            </div>
          );
        })}
      </div>
      {/* KPIs ODF */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}}>
        {[[totalOdfs,"ODFs total","#607D8B"],[activOdfs,"ODFs activés","#27AE60"],
          [extOdfs,"EXTERNE","#1565C0"],[intOdfs,"INTERNE (iODF)","#5C6BC0"]].map(([v,l,c])=>(
          <div key={l} style={{background:"#fff",borderRadius:12,padding:"12px 16px",
            boxShadow:"0 1px 6px rgba(0,0,0,.06)",borderLeft:`3px solid ${c}`}}>
            <div style={{fontSize:26,fontWeight:800,color:c,fontFamily:"monospace"}}>{v}</div>
            <div style={{fontSize:10,color:"#90A4AE",marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>
      {/* Sites overview */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10,marginBottom:14}}>
        {sites.map(site=>{
          const siteRacks=racks.filter(r=>r.site_id===site.id);
          const siteOdfs=odfList.filter(o=>siteRacks.some(r=>r.id===o.rack_id));
          const sitePorts=siteOdfs.reduce((acc,o)=>acc+Object.keys(db[o.id]||{}).length,0);
          const siteActivated=siteOdfs.filter(o=>o.is_active).length;
          return(
            <div key={site.id} style={{background:"#fff",borderRadius:10,padding:"14px",
              boxShadow:"0 1px 4px rgba(0,0,0,.05)",border:"1.5px solid #E8ECF0"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{fontSize:18}}>🌐</span>
                <div>
                  <div style={{fontSize:12,fontWeight:800,color:NAVY}}>{site.name}</div>
                  <div style={{fontSize:9,color:"#90A4AE"}}>{site.description}</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:10,color:"#607D8B"}}>
                <span>🔲 {siteRacks.length} racks</span>
                <span>◉ {siteOdfs.length} ODFs</span>
                <span>🔌 {sitePorts} ports</span>
                <span style={{color:siteActivated>0?"#27AE60":"#AAB4BE"}}>⚡ {siteActivated} actifs</span>
              </div>
            </div>
          );
        })}
      </div>
      {/* Occupation ODFs */}
      <div style={{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 6px rgba(0,0,0,.06)"}}>
        <div style={{fontSize:10,letterSpacing:2,color:"#607D8B",fontWeight:700,marginBottom:12}}>
          OCCUPATION ODFs
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:9}}>
          {odfList.map(odf=>{
            const o=byOdf[odf.id]||{};
            const total=Object.keys(db[odf.id]||{}).length||1;
            const pct=Math.round((o.ACTIF+o.INTERNE+o.INCONNU+o.RÉSERVÉ)*100/total);
            return(
              <div key={odf.id} style={{border:"1.5px solid #E8ECF0",borderRadius:9,
                padding:"11px",cursor:"pointer",background:"#FAFBFC",transition:"all .15s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=BLUE;e.currentTarget.style.background="#fff";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="#E8ECF0";e.currentTarget.style.background="#FAFBFC";}}
                onClick={()=>{setActiveODF(odf.id);setView("odf");}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:9,fontWeight:800,color:NAVY,fontFamily:"monospace"}}>
                    {odf.id.replace("RDK-","")}
                  </span>
                  <TypeBadge type={odf.odf_type}/>
                </div>
                <ODFNumberBadge num={odf.odf_number}/>
                <div style={{height:4,background:"#F0F4F8",borderRadius:3,overflow:"hidden",margin:"5px 0 3px"}}>
                  {[["ACTIF",o.ACTIF],["INTERNE",o.INTERNE],["INCONNU",o.INCONNU]].map(([st,v])=>(
                    <div key={st} style={{display:"inline-block",width:`${(v||0)*100/total}%`,
                      height:"100%",background:SC[st]?.dot}}/>
                  ))}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:"#AAB4BE"}}>
                  <span>{total-1} ports</span>
                  <span style={{fontWeight:700,color:pct>70?"#E74C3C":pct>40?"#F39C12":"#27AE60"}}>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  ODF PANEL
// ═══════════════════════════════════════════════════════════════════════
function ODFPanel({db,odfList,sites,racks,activeODF,setActiveODF,onPort,onConnect,search,user}){
  const [slotFilter,setSlotFilter]=useState(0);
  const [hov,setHov]=useState(null);
  const odfMeta=odfList.find(o=>o.id===activeODF);
  const odfPorts=db[activeODF]||{};
  const rack=racks.find(r=>r.id===odfMeta?.rack_id);
  const siteA=sites.find(s=>s.id===odfMeta?.site_a);
  const siteB=sites.find(s=>s.id===odfMeta?.site_b);
  const cnts=useMemo(()=>{
    const c={ACTIF:0,INTERNE:0,INCONNU:0,RÉSERVÉ:0,LIBRE:0};
    for(const p of Object.values(odfPorts)) c[p.statut]++;
    return c;
  },[odfPorts]);
  const sq=search.toLowerCase();
  const match=p=>!sq||[p.slot_port,p.cid,p.owner,p.source_client,p.end_client,p.statut]
    .some(v=>(v||"").toLowerCase().includes(sq));
  return(
    <div>
      {/* ODF selector buttons */}
      <div style={{display:"flex",gap:4,marginBottom:12,flexWrap:"wrap"}}>
        {odfList.map(o=>(
          <button key={o.id} onClick={()=>{setActiveODF(o.id);setSlotFilter(0);}}
            style={{padding:"4px 10px",borderRadius:7,border:"1.5px solid",
              borderColor:activeODF===o.id?BLUE:"#DDE3EA",
              background:activeODF===o.id?BLUE:"#fff",
              color:activeODF===o.id?"#fff":"#555",fontSize:9,cursor:"pointer",
              fontWeight:activeODF===o.id?700:400,fontFamily:"monospace"}}>
            {o.id.replace("RDK-","")}
            {o.is_active&&<span style={{marginLeft:3,color:activeODF===o.id?"#A5D6A7":"#27AE60"}}>⚡</span>}
          </button>
        ))}
      </div>
      {/* PathBar */}
      {odfMeta&&(
        <div style={{display:"flex",alignItems:"center",background:NAVY,
          borderRadius:10,overflow:"hidden",marginBottom:12,
          boxShadow:"0 2px 8px rgba(0,0,0,.15)"}}>
          <div style={{padding:"9px 14px",background:"rgba(255,255,255,.06)",flexShrink:0}}>
            <div style={{fontSize:7,color:"rgba(255,255,255,.4)",letterSpacing:1,fontWeight:600}}>SITE A</div>
            <div style={{fontSize:11,fontWeight:700,color:"#fff"}}>{siteA?.name||odfMeta.site_a}</div>
            {rack&&<div style={{fontSize:9,color:"#64B5F6",fontFamily:"monospace"}}>[{rack.name}]</div>}
          </div>
          <div style={{fontSize:14,color:"rgba(255,255,255,.3)",padding:"0 4px"}}>›</div>
          <div style={{flex:1,padding:"7px 12px"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
              <TypeBadge type={odfMeta.odf_type}/>
              <ODFNumberBadge num={odfMeta.odf_number}/>
            </div>
            {hov&&(
              <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                <span style={{background:SC[hov.statut]?.bg,border:`1.5px solid ${SC[hov.statut]?.bd}`,
                  borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:800,
                  color:SC[hov.statut]?.tx,fontFamily:"monospace"}}>{hov.slot_port}</span>
                {hov.cid&&<span style={{fontSize:9,color:"rgba(255,255,255,.6)",fontFamily:"monospace"}}>{hov.cid}</span>}
                {hov.end_client&&<span style={{fontSize:9,color:"#FFD54F",fontWeight:700}}>{hov.end_client}</span>}
              </div>
            )}
          </div>
          <div style={{fontSize:14,color:"rgba(255,255,255,.3)",padding:"0 4px"}}>›</div>
          <div style={{padding:"9px 14px",background:"rgba(255,255,255,.06)",flexShrink:0,textAlign:"right"}}>
            <div style={{fontSize:7,color:"rgba(255,255,255,.4)",letterSpacing:1,fontWeight:600}}>SITE B</div>
            <div style={{fontSize:11,fontWeight:700,color:"#fff"}}>{siteB?.name||odfMeta.site_b}</div>
          </div>
        </div>
      )}
      {/* Stats bar */}
      <div style={{background:"#fff",borderRadius:10,padding:"11px 14px",
        boxShadow:"0 1px 4px rgba(0,0,0,.05)",marginBottom:11,
        display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:11,color:"#607D8B"}}>{odfMeta?.cable}</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {Object.entries(cnts).map(([st,n])=>(
            <div key={st} style={{textAlign:"center"}}>
              <div style={{fontSize:14,fontWeight:800,color:SC[st]?.dot,fontFamily:"monospace"}}>{n}</div>
              <Badge st={st} sm/>
            </div>
          ))}
        </div>
      </div>
      {/* Slot filter */}
      <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:9,color:"#90A4AE"}}>SLOT :</span>
        {[0,...Array.from({length:odfMeta?.slots||6},(_,i)=>i+1)].map(sl=>(
          <button key={sl} onClick={()=>setSlotFilter(sl)}
            style={{padding:"3px 8px",borderRadius:5,border:"1.5px solid",
              borderColor:slotFilter===sl?BLUE:"#DDE3EA",
              background:slotFilter===sl?BLUE:"#fff",
              color:slotFilter===sl?"#fff":"#555",fontSize:9,cursor:"pointer",fontWeight:600}}>
            {sl===0?"Tous":`S${sl}`}
          </button>
        ))}
      </div>
      {/* Grid */}
      <div style={{background:"#fff",borderRadius:12,padding:14,boxShadow:"0 1px 6px rgba(0,0,0,.06)"}}>
        {Array.from({length:odfMeta?.slots||6},(_,i)=>i+1)
          .filter(s=>slotFilter===0||s===slotFilter).map(sl=>{
          const slotPorts=Object.values(odfPorts).filter(p=>p.slot===sl).sort((a,b)=>a.port-b.port);
          if(!slotPorts.length) return null;
          return(
            <div key={sl} style={{marginBottom:10}}>
              <div style={{fontSize:8,fontWeight:700,color:"#90A4AE",marginBottom:4,
                letterSpacing:1,display:"flex",alignItems:"center",gap:5}}>
                <span>SLOT {sl}</span>
                <div style={{flex:1,height:1,background:"#F0F4F8"}}/>
                <span style={{color:"#BDC3C7"}}>{slotPorts.length}pts</span>
              </div>
              <div style={{display:"grid",
                gridTemplateColumns:`repeat(${odfMeta?.ports_per_slot||12},1fr)`,gap:3}}>
                {Array.from({length:odfMeta?.ports_per_slot||12},(_,i)=>i+1).map(po=>{
                  const k=spKey(sl,po), p=odfPorts[k];
                  const st=p?.statut||"LIBRE", c=SC[st], m=p?match(p):true;
                  const hasPeer=p?.peer_odf_id;
                  return(
                    <div key={k} onClick={()=>p&&onPort(p)}
                      onMouseEnter={()=>p&&setHov(p)}
                      onMouseLeave={()=>setHov(null)}
                      style={{aspectRatio:1,borderRadius:4,background:m?c.bg:"#F8F9FA",
                        border:`${hov?.slot_port===k?"2px":"1.5px"} solid ${hov?.slot_port===k?c.dot:m?c.bd:"#EAECEE"}`,
                        cursor:p?"pointer":"default",display:"flex",flexDirection:"column",
                        alignItems:"center",justifyContent:"center",transition:"all .1s",
                        opacity:m?1:.2,transform:hov?.slot_port===k&&p?"scale(1.18)":"scale(1)",
                        boxShadow:hov?.slot_port===k&&p?"0 3px 10px rgba(0,0,0,.15)":"none",
                        position:"relative"}}>
                      {hasPeer&&<div style={{position:"absolute",top:1,right:1,
                        width:4,height:4,borderRadius:"50%",background:"#5C6BC0"}}/>}
                      <div style={{width:5,height:5,borderRadius:"50%",background:c.dot,marginBottom:1}}/>
                      <div style={{fontSize:5,color:c.tx,fontWeight:700,fontFamily:"monospace"}}>{po}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {/* Legend */}
        <div style={{display:"flex",gap:6,marginTop:10,paddingTop:8,
          borderTop:"1px solid #F0F4F8",flexWrap:"wrap",alignItems:"center"}}>
          {Object.entries(SC).map(([st,c])=>(
            <div key={st} style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:"#607D8B"}}>
              <div style={{width:8,height:8,borderRadius:2,background:c.bg,border:`1px solid ${c.bd}`}}/>
              {st}
            </div>
          ))}
          <div style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:"#607D8B"}}>
            <div style={{width:4,height:4,borderRadius:"50%",background:"#5C6BC0"}}/>
            Connecté (peer)
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  REGISTRY
// ═══════════════════════════════════════════════════════════════════════
function Registry({db,odfList,onPort,search,setSearch}){
  const [fOdf,setFOdf]=useState(""), [fSt,setFSt]=useState(""), [page,setPage]=useState(0);
  const PG=30;
  const all=useMemo(()=>odfList.flatMap(o=>Object.values(db[o.id]||{})),[db,odfList]);
  const filtered=useMemo(()=>{
    const sq=search.toLowerCase();
    return all.filter(p=>{
      if(fOdf&&p.odf_id!==fOdf) return false;
      if(fSt&&p.statut!==fSt) return false;
      if(sq) return [p.slot_port,p.cid,p.owner,p.source_client,p.end_client,
        p.destination,p.statut,p.odf_id,p.peer_odf_id]
        .some(v=>(v||"").toLowerCase().includes(sq));
      return true;
    });
  },[all,search,fOdf,fSt]);
  const sel={padding:"5px 8px",border:"1.5px solid #DDE3EA",borderRadius:7,
    fontSize:11,background:"#fff",fontFamily:"inherit",cursor:"pointer"};
  const pd=filtered.slice(page*PG,(page+1)*PG);
  const pages=Math.ceil(filtered.length/PG);
  return(
    <div>
      <div style={{background:"#fff",borderRadius:10,padding:"10px 14px",
        boxShadow:"0 1px 4px rgba(0,0,0,.05)",marginBottom:10,
        display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <select value={fOdf} onChange={e=>{setFOdf(e.target.value);setPage(0);}} style={sel}>
          <option value="">Tous ODFs</option>
          {odfList.map(o=><option key={o.id} value={o.id}>{o.id.replace("RDK-","")}</option>)}
        </select>
        <select value={fSt} onChange={e=>{setFSt(e.target.value);setPage(0);}} style={sel}>
          <option value="">Tous statuts</option>
          {REF_STATUT.map(s=><option key={s}>{s}</option>)}
        </select>
        {(fOdf||fSt||search)&&
          <button onClick={()=>{setFOdf("");setFSt("");setSearch("");setPage(0);}}
            style={{...sel,color:"#E74C3C",borderColor:"#E74C3C",fontWeight:600}}>✕</button>}
        <span style={{marginLeft:"auto",fontSize:11,color:"#90A4AE"}}>{filtered.length} résultats</span>
      </div>
      <div style={{background:"#fff",borderRadius:10,boxShadow:"0 1px 4px rgba(0,0,0,.05)",overflow:"hidden"}}>
        <div style={{display:"grid",
          gridTemplateColumns:"72px 72px 90px 1fr 60px 56px 115px 115px 100px",
          background:NAVY,padding:"8px 12px",gap:4}}>
          {["ODF","SLOT","STATUT","CID","OT_N°","CAP.","SOURCE CLIENT","CLIENT FINAL","PEER ODF"].map(h=>(
            <div key={h} style={{fontSize:8,fontWeight:700,color:"rgba(255,255,255,.6)",letterSpacing:.4}}>{h}</div>
          ))}
        </div>
        {pd.map((p,i)=>(
          <div key={p.id} onClick={()=>onPort(p)}
            style={{display:"grid",
              gridTemplateColumns:"72px 72px 90px 1fr 60px 56px 115px 115px 100px",
              padding:"7px 12px",gap:4,cursor:"pointer",
              background:i%2===0?"#fff":"#F8FAFC",borderBottom:"1px solid #F0F4F8",
              alignItems:"center",transition:"background .1s"}}
            onMouseEnter={e=>e.currentTarget.style.background=ACCENT}
            onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":"#F8FAFC"}>
            <div style={{fontSize:8,color:"#90A4AE",fontFamily:"monospace"}}>{p.odf_id.replace("RDK-","")}</div>
            <div style={{fontSize:10,fontWeight:700,color:NAVY,fontFamily:"monospace"}}>{p.slot_port}</div>
            <div><Badge st={p.statut} sm/></div>
            <div style={{fontSize:10,fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.cid||"—"}</div>
            <div style={{fontSize:9,color:"#607D8B",fontFamily:"monospace"}}>{p.ot_num||"—"}</div>
            <div style={{fontSize:10,fontWeight:p.capacite?600:400,color:p.capacite?NAVY:"#DDE3EA"}}>{p.capacite||"—"}</div>
            <div style={{fontSize:9,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#455A64"}}>{p.source_client||p.owner||"—"}</div>
            <div style={{fontSize:9,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:p.end_client?"#0D47A1":"#90A4AE",fontWeight:p.end_client?600:400}}>{p.end_client||"—"}</div>
            <div style={{fontSize:8,color:p.peer_odf_id?"#5C6BC0":"#DDE3EA",fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.peer_odf_id?`${p.peer_odf_id.replace("RDK-","")} ${p.peer_slot_port||""}`:""}</div>
          </div>
        ))}
        {!pd.length&&<div style={{padding:36,textAlign:"center",color:"#90A4AE"}}>Aucun résultat.</div>}
      </div>
      {pages>1&&<div style={{display:"flex",justifyContent:"center",gap:6,marginTop:10}}>
        <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}
          style={{padding:"5px 12px",borderRadius:7,border:"1.5px solid #DDE3EA",background:"#fff",
            cursor:page===0?"not-allowed":"pointer",fontSize:11}}>←</button>
        <span style={{padding:"5px 10px",fontSize:11,color:"#607D8B"}}>{page+1}/{pages}</span>
        <button onClick={()=>setPage(p=>Math.min(pages-1,p+1))} disabled={page===pages-1}
          style={{padding:"5px 12px",borderRadius:7,border:"1.5px solid #DDE3EA",background:"#fff",
            cursor:page===pages-1?"not-allowed":"pointer",fontSize:11}}>→</button>
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  CLIENT VIEW
// ═══════════════════════════════════════════════════════════════════════
function ClientView({db,odfList,onPort}){
  const [sel,setSel]=useState(""), [mode,setMode]=useState("source");
  const all=useMemo(()=>odfList.flatMap(o=>Object.values(db[o.id]||{})),[db,odfList]);
  const active=useMemo(()=>all.filter(p=>p.statut==="ACTIF"),[all]);
  const sourceClients=useMemo(()=>[...new Set(active.filter(p=>p.source_client||p.owner)
    .map(p=>p.source_client||p.owner))].sort(),[active]);
  const endClients=useMemo(()=>[...new Set(active.filter(p=>p.end_client)
    .map(p=>p.end_client))].sort(),[active]);
  const clients=mode==="source"?sourceClients:endClients;
  const circuits=useMemo(()=>sel?active.filter(p=>
    mode==="source"?(p.source_client||p.owner)===sel:p.end_client===sel
  ):[],[active,sel,mode]);
  return(
    <div style={{maxWidth:900}}>
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {[["source","Client source (opérateur)"],["final","Client final (bénéficiaire)"]].map(([m,l])=>(
          <button key={m} onClick={()=>{setMode(m);setSel("");}}
            style={{padding:"6px 14px",borderRadius:7,border:"none",cursor:"pointer",
              fontSize:11,fontWeight:mode===m?700:400,
              background:mode===m?NAVY:"#F0F4F8",color:mode===m?"#fff":"#607D8B"}}>
            {l}
          </button>
        ))}
      </div>
      <div style={{background:"#fff",borderRadius:10,padding:"14px 16px",
        boxShadow:"0 1px 4px rgba(0,0,0,.05)",marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:700,color:"#607D8B",letterSpacing:1,marginBottom:10}}>
          {mode==="source"?"OPÉRATEURS / SOURCE":"CLIENTS FINAUX / BÉNÉFICIAIRES"}
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {clients.map(c=>(
            <button key={c} onClick={()=>setSel(c===sel?"":c)}
              style={{padding:"5px 12px",borderRadius:20,border:"1.5px solid",
                borderColor:sel===c?BLUE:"#DDE3EA",background:sel===c?BLUE:"#fff",
                color:sel===c?"#fff":"#555",fontSize:11,cursor:"pointer",fontWeight:sel===c?700:400}}>
              {c}
            </button>
          ))}
        </div>
      </div>
      {sel&&(
        <div style={{background:"#fff",borderRadius:10,boxShadow:"0 1px 4px rgba(0,0,0,.05)",overflow:"hidden"}}>
          <div style={{background:NAVY,padding:"12px 16px",display:"flex",
            justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontWeight:700,color:"#fff",fontSize:13}}>{sel}</span>
            <span style={{color:"#64B5F6",fontSize:12}}>{circuits.length} circuits actifs</span>
          </div>
          {circuits.map((p,i)=>(
            <div key={p.id} onClick={()=>onPort(p)}
              style={{display:"flex",gap:10,padding:"10px 16px",alignItems:"center",
                borderBottom:i<circuits.length-1?"1px solid #F0F4F8":"none",cursor:"pointer",
                transition:"background .1s"}}
              onMouseEnter={e=>e.currentTarget.style.background=ACCENT}
              onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
              <span style={{fontFamily:"monospace",fontWeight:700,color:NAVY,fontSize:11,minWidth:50}}>{p.slot_port}</span>
              <span style={{fontSize:9,color:"#90A4AE",minWidth:65,fontFamily:"monospace"}}>{p.odf_id.replace("RDK-","")}</span>
              <span style={{flex:1,fontFamily:"monospace",fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.cid}</span>
              {p.capacite&&<span style={{background:ACCENT,borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700,color:BLUE}}>{p.capacite}</span>}
              {p.end_client&&<span style={{fontSize:10,color:"#0D47A1",fontWeight:600,background:"#E3F2FD",borderRadius:5,padding:"2px 7px"}}>{p.end_client}</span>}
              {p.destination&&<span style={{fontSize:10,color:"#607D8B"}}>{p.destination}</span>}
            </div>
          ))}
        </div>
      )}
      {!sel&&<div style={{padding:40,textAlign:"center",color:"#90A4AE",background:"#fff",borderRadius:10}}>
        Sélectionner un client.
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  HISTORY + ALERTS
// ═══════════════════════════════════════════════════════════════════════
function HistoryView({history}){
  const LABELS={statut:"Statut",cid:"CID",ot_num:"OT N°",capacite:"Capacité",
    owner:"Owner",source_client:"Source client",end_client:"Client final",
    destination:"Destination",date_activ:"Date activ.",remarques:"Remarques",
    peer_odf_id:"Peer ODF",_connect:"Connexion port",_disconnect:"Déconnexion port",
    _odf_activate:"ODF activé",
    _site_create:"Site créé",_site_edit:"Site modifié",_site_delete:"Site supprimé",
    _rack_create:"Rack créé",_rack_edit:"Rack modifié",_rack_delete:"Rack supprimé",
    _odf_create:"ODF créé",_odf_edit:"ODF modifié",_odf_delete:"ODF supprimé",
    _port_add:"Port ajouté",_port_del:"Port supprimé"};
  return(
    <div style={{maxWidth:800}}>
      <div style={{background:"#fff",borderRadius:12,padding:18,boxShadow:"0 1px 6px rgba(0,0,0,.06)"}}>
        <div style={{fontSize:10,letterSpacing:2,color:"#607D8B",fontWeight:700,marginBottom:14}}>
          HISTORIQUE — {history.length} ÉVÉNEMENTS
        </div>
        {history.length===0&&<div style={{padding:40,textAlign:"center",color:"#90A4AE"}}>
          Aucune modification dans cette session.
        </div>}
        {[...history].reverse().map((h,i)=>{
          const isInfra=h.field?.startsWith("_");
          const isConnect=h.field==="_connect"||h.field==="_disconnect"||h.field==="_odf_activate";
          return(
            <div key={i} style={{display:"flex",gap:10,padding:"9px 0",
              borderBottom:i<history.length-1?"1px solid #F0F4F8":"none",alignItems:"flex-start"}}>
              <div style={{width:26,height:26,borderRadius:7,
                background:isConnect?"#E8EAF6":isInfra?"#FFF3CC":ACCENT,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0}}>
                {isConnect?"⚡":isInfra?"🔧":"🔄"}
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:2}}>
                  <span style={{fontFamily:"monospace",fontWeight:700,fontSize:11,color:NAVY}}>
                    {h.target||h.port_id?.split("_")[1]||h.port_id}
                  </span>
                  <span style={{fontSize:10,color:"#607D8B"}}>→ {LABELS[h.field]||h.field}</span>
                  <span style={{fontSize:9,color:"#90A4AE",marginLeft:"auto"}}>
                    {fmtDt(h.ts)} · {h.user}
                  </span>
                </div>
                {!isInfra&&!isConnect&&(
                  <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
                    <span style={{background:"#FCE4D6",color:"#7B2000",fontFamily:"monospace",
                      padding:"1px 5px",borderRadius:3,fontSize:9}}>{h.old||"—"}</span>
                    <span style={{color:"#90A4AE",fontSize:10}}>→</span>
                    <span style={{background:"#C6EFCE",color:"#1A5C28",fontFamily:"monospace",
                      padding:"1px 5px",borderRadius:3,fontSize:9}}>{h.new||"—"}</span>
                  </div>
                )}
                {(isInfra||isConnect)&&h.detail&&<div style={{fontSize:10,color:"#607D8B"}}>{h.detail}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Alerts({db,odfList,onPort}){
  const all=useMemo(()=>odfList.flatMap(o=>Object.values(db[o.id]||{})),[db,odfList]);
  const inconnus=useMemo(()=>all.filter(p=>p.statut==="INCONNU"),[all]);
  const grouped=useMemo(()=>{
    const g={};
    for(const p of inconnus){if(!g[p.odf_id])g[p.odf_id]=[];g[p.odf_id].push(p);}
    return g;
  },[inconnus]);
  return(
    <div style={{maxWidth:740}}>
      {inconnus.length>0
        ?<div style={{background:SC.INCONNU.bg,border:`1.5px solid ${SC.INCONNU.bd}`,
            borderRadius:12,padding:"12px 16px",marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,color:SC.INCONNU.tx}}>
              ⚠  {inconnus.length} ports INCONNUS — Audit terrain requis
            </div>
          </div>
        :<div style={{background:SC.ACTIF.bg,border:`1.5px solid ${SC.ACTIF.bd}`,
            borderRadius:12,padding:18,textAlign:"center"}}>
            <div style={{fontWeight:700,color:SC.ACTIF.tx}}>✓ Infrastructure entièrement documentée</div>
          </div>
      }
      {Object.entries(grouped).map(([odf,ps])=>(
        <div key={odf} style={{background:"#fff",borderRadius:10,
          boxShadow:"0 1px 4px rgba(0,0,0,.05)",marginBottom:10,overflow:"hidden"}}>
          <div style={{background:NAVY,padding:"10px 14px",display:"flex",justifyContent:"space-between"}}>
            <span style={{fontFamily:"monospace",fontWeight:700,color:"#fff",fontSize:12}}>{odf}</span>
            <span style={{background:SC.INCONNU.dot,color:"#fff",borderRadius:10,
              padding:"2px 9px",fontSize:10,fontWeight:700}}>{ps.length}</span>
          </div>
          {ps.map((p,i)=>(
            <div key={p.id} onClick={()=>onPort(p)}
              style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",
                borderBottom:i<ps.length-1?"1px solid #F0F4F8":"none",cursor:"pointer",
                transition:"background .1s"}}
              onMouseEnter={e=>e.currentTarget.style.background=ACCENT}
              onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
              <span style={{fontFamily:"monospace",fontWeight:700,color:NAVY,minWidth:52,fontSize:11}}>{p.slot_port}</span>
              <Badge st="INCONNU" sm/>
              <span style={{flex:1,fontSize:11,color:"#90A4AE",fontStyle:"italic"}}>Non documenté</span>
              <span style={{color:SC.INCONNU.dot}}>→</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  PORT DRAWER — panneau latéral édition port
// ═══════════════════════════════════════════════════════════════════════
function PortDrawer({port,onSave,onClose,onConnect,onDisconnect,user,sites,racks,odfList,db}){
  const [draft,setDraft]=useState({...port});
  const [flash,setFlash]=useState(false);
  const [showConnect,setShowConnect]=useState(false);
  useEffect(()=>{setDraft({...port});setFlash(false);setShowConnect(false);},[port]);
  const canEdit=CAN_EDIT(user?.role||"lecture");
  const odfMeta=odfList.find(o=>o.id===draft.odf_id);
  const rack=racks.find(r=>r.id===odfMeta?.rack_id);
  const siteA=sites.find(s=>s.id===odfMeta?.site_a);
  const siteB=sites.find(s=>s.id===odfMeta?.site_b);
  const peerOdf=odfList.find(o=>o.id===draft.peer_odf_id);
  const autoRef=useRef(null);
  const triggerSave=useCallback(nd=>{
    if(!canEdit) return;
    clearTimeout(autoRef.current);
    autoRef.current=setTimeout(async()=>{
      if(JSON.stringify(nd)!==JSON.stringify(port)){
        await onSave(nd); setFlash(true); setTimeout(()=>setFlash(false),1800);
      }
    },1200);
  },[port,canEdit,onSave]);
  const upd=(k,v)=>{const nd={...draft,[k]:v};setDraft(nd);triggerSave(nd);};

  const fi=(label,key,opts)=>(
    <div style={{marginBottom:10}}>
      <label style={{display:"block",fontSize:9,fontWeight:700,color:"#607D8B",letterSpacing:.5,marginBottom:3}}>
        {label.toUpperCase()}
      </label>
      {opts?.options
        ?<select value={draft[key]||""} disabled={!canEdit}
           onChange={e=>upd(key,e.target.value)}
           style={{width:"100%",padding:"7px 9px",border:"1.5px solid #DDE3EA",borderRadius:7,
             fontSize:12,fontFamily:"inherit",outline:"none",background:!canEdit?"#F8FAFC":"#fff"}}>
           {opts.options.map(o=><option key={o} value={o}>{o||"—"}</option>)}
         </select>
        :<input value={draft[key]||""} disabled={!canEdit}
           onChange={e=>upd(key,e.target.value)} placeholder={opts?.ph||""}
           list={opts?.list}
           style={{width:"100%",padding:"7px 9px",border:"1.5px solid #DDE3EA",borderRadius:7,
             fontSize:12,fontFamily:opts?.mono?"monospace":"inherit",
             background:!canEdit?"#F8FAFC":"#fff",outline:"none",boxSizing:"border-box"}}
           onFocus={e=>{if(canEdit)e.target.style.borderColor=BLUE;}}
           onBlur={e=>e.target.style.borderColor="#DDE3EA"}/>
      }
      {opts?.list&&<datalist id={opts.list}>
        {(opts.listItems||[]).map(v=><option key={v} value={v}/>)}
      </datalist>}
    </div>
  );

  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.3)",zIndex:100}}/>
      <div style={{position:"fixed",top:0,right:0,width:360,height:"100vh",background:"#fff",
        zIndex:101,boxShadow:"-4px 0 24px rgba(0,0,0,.15)",display:"flex",flexDirection:"column"}}>
        {/* Header */}
        <div style={{background:NAVY,padding:"13px 15px",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div>
              <div style={{fontSize:8,letterSpacing:2,color:"rgba(255,255,255,.4)",marginBottom:2}}>
                {draft.odf_id?.replace("RDK-","")} · {rack?.name}
              </div>
              <div style={{fontSize:20,fontWeight:800,color:"#fff",fontFamily:"monospace"}}>{draft.slot_port}</div>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              {flash&&<span style={{fontSize:9,color:"#A5D6A7",fontWeight:600}}>✓ Sauvegardé</span>}
              <button onClick={onClose} style={{background:"rgba(255,255,255,.1)",border:"none",
                color:"#fff",width:28,height:28,borderRadius:6,cursor:"pointer",fontSize:13}}>✕</button>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4,
            background:"rgba(255,255,255,.06)",borderRadius:6,padding:"4px 9px",fontSize:9,marginBottom:7}}>
            <span style={{color:"rgba(255,255,255,.5)"}}>{siteA?.name}</span>
            <span style={{color:"rgba(255,255,255,.3)"}}>›</span>
            <span style={{color:"#64B5F6",fontWeight:700,fontFamily:"monospace"}}>{draft.slot_port}</span>
            <span style={{color:"rgba(255,255,255,.3)"}}>›</span>
            <span style={{color:draft.destination?"#A5D6A7":"rgba(255,255,255,.5)",fontWeight:draft.destination?700:400}}>
              {draft.destination||siteB?.name||"—"}
            </span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <Badge st={draft.statut}/>
            {odfMeta&&<TypeBadge type={odfMeta.odf_type}/>}
          </div>
        </div>
        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:15}}>
          {fi("Statut","statut",{options:["","ACTIF","INTERNE","INCONNU","RÉSERVÉ","LIBRE"]})}
          <div style={{borderTop:"1px solid #F0F4F8",paddingTop:10,marginBottom:10}}>
            <div style={{fontSize:9,fontWeight:700,color:"#607D8B",letterSpacing:.5,marginBottom:8}}>CIRCUIT</div>
            {fi("CID","cid",{ph:"DJT-JJMMAAAA...",mono:true})}
            {fi("OT N°","ot_num",{ph:"OT-000XXX",mono:true})}
            {fi("Capacité","capacite",{options:REF_CAP})}
          </div>
          <div style={{borderTop:"1px solid #F0F4F8",paddingTop:10,marginBottom:10}}>
            <div style={{fontSize:9,fontWeight:700,color:"#607D8B",letterSpacing:.5,marginBottom:8}}>CLIENTS</div>
            {fi("Client source (opérateur)","source_client",{ph:"Ex: VF / WIOCC",list:"src-l",listItems:REF_OWNERS})}
            {fi("Client final (bénéficiaire)","end_client",{ph:"Ex: Google, Orange, SEACOM…"})}
            {fi("Owner (legacy)","owner",{ph:"Opérateur…",list:"own-l",listItems:REF_OWNERS})}
            {fi("Destination","destination",{ph:"SEACOM / DDC…"})}
          </div>
          {/* Peer connection */}
          <div style={{borderTop:"1px solid #F0F4F8",paddingTop:10,marginBottom:10}}>
            <div style={{fontSize:9,fontWeight:700,color:"#607D8B",letterSpacing:.5,marginBottom:6}}>CONNEXION PEER</div>
            {draft.peer_odf_id?(
              <div style={{background:"#E8EAF6",borderRadius:8,padding:"9px 12px",marginBottom:8}}>
                <div style={{fontSize:11,fontWeight:700,color:"#3949AB",marginBottom:2}}>⚡ Connecté</div>
                <div style={{fontSize:10,color:"#3949AB",fontFamily:"monospace"}}>
                  {draft.peer_odf_id} · {draft.peer_slot_port}
                </div>
                {peerOdf&&<div style={{fontSize:9,color:"#5C6BC0",marginTop:2}}>{peerOdf.route}</div>}
                {canEdit&&<button onClick={()=>onDisconnect&&onDisconnect(draft)}
                  style={{marginTop:7,padding:"4px 10px",borderRadius:6,border:"1.5px solid #E74C3C",
                    background:"#fff",color:"#E74C3C",fontSize:10,cursor:"pointer",fontWeight:600}}>
                  ✂ Déconnecter
                </button>}
              </div>
            ):(
              canEdit&&<button onClick={()=>setShowConnect(true)}
                style={{width:"100%",padding:"8px",borderRadius:8,
                  border:"1.5px dashed #5C6BC0",background:"#F5F5FF",
                  color:"#3949AB",fontSize:11,fontWeight:600,cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                ⚡ Connecter à un port peer
              </button>
            )}
          </div>
          {fi("Date d'activation","date_activ",{ph:"JJ/MM/AAAA"})}
          <div>
            <label style={{display:"block",fontSize:9,fontWeight:700,color:"#607D8B",letterSpacing:.5,marginBottom:3}}>
              REMARQUES
            </label>
            <textarea value={draft.remarques||""} disabled={!canEdit}
              onChange={e=>upd("remarques",e.target.value)} rows={3}
              style={{width:"100%",padding:"7px 9px",border:"1.5px solid #DDE3EA",
                borderRadius:7,fontSize:12,resize:"vertical",fontFamily:"inherit",
                background:!canEdit?"#F8FAFC":"#fff",outline:"none",boxSizing:"border-box"}}/>
          </div>
        </div>
        <div style={{padding:"10px 15px",borderTop:"1px solid #F0F4F8",
          display:"flex",gap:8,flexShrink:0,background:"#FAFBFC",alignItems:"center"}}>
          <div style={{flex:1,fontSize:9,color:flash?"#27AE60":"#90A4AE"}}>
            {flash?"✓ Auto-enregistrement":"Sauvegarde auto · 1.2s"}
          </div>
          <button onClick={onClose}
            style={{padding:"8px 14px",borderRadius:7,border:"1.5px solid #DDE3EA",
              background:"#fff",cursor:"pointer",fontSize:11,color:"#607D8B"}}>
            Fermer
          </button>
        </div>
      </div>
      {showConnect&&<ConnectPortModal
        port={draft} db={db} odfList={odfList} sites={sites} racks={racks}
        onConnect={(portA,portB,meta)=>{onConnect&&onConnect(portA,portB,meta);setShowConnect(false);}}
        onClose={()=>setShowConnect(false)}/>}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  EXPORT / IMPORT PANEL
// ═══════════════════════════════════════════════════════════════════════
function ExportImportPanel({db,odfList,sites,racks}){
  const [msg,setMsg]=useState(null);

  function exportCSV(){
    // Feuille 1 : Infrastructure
    const infraRows=[["Site","Rack","ODF ID","Type ODF","Numéro ODF","Route","Câble","Slots","Ports/Slot","Activé","Activé le"]];
    for(const odf of odfList){
      const rack=racks.find(r=>r.id===odf.rack_id);
      const site=sites.find(s=>s.id===odf.site_a);
      infraRows.push([
        site?.name||odf.site_a, rack?.name||odf.rack_id, odf.id,
        odf.odf_type, odf.odf_number||"", odf.route||"", odf.cable||"",
        odf.slots, odf.ports_per_slot,
        odf.is_active?"OUI":"NON", odf.activated_at?fmtDt(odf.activated_at):""
      ]);
    }
    // Feuille 2 : Connexions actives
    const connRows=[["ODF","Port","Statut","CID","OT N°","Capacité","Client source","Client final","Owner","Destination","Peer ODF","Peer Port","Mise à jour"]];
    for(const odf of odfList){
      for(const p of Object.values(db[odf.id]||{})){
        if(p.statut==="LIBRE") continue;
        connRows.push([
          p.odf_id, p.slot_port, p.statut, p.cid||"", p.ot_num||"",
          p.capacite||"", p.source_client||"", p.end_client||"",
          p.owner||"", p.destination||"",
          p.peer_odf_id||"", p.peer_slot_port||"",
          p.updated_at?fmtDt(p.updated_at):""
        ]);
      }
    }
    const toCSV=rows=>rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const content="=== INFRASTRUCTURE ===\n"+toCSV(infraRows)+"\n\n=== CONNEXIONS ===\n"+toCSV(connRows);
    const blob=new Blob([content],{type:"text/csv;charset=utf-8;"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download=`ODF-Export-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    setMsg({ok:true,txt:"Export CSV téléchargé."});
  }

  function exportPDF(){
    const win=window.open("","_blank","width=1100,height=800");
    if(!win) return;
    const rows=odfList.flatMap(odf=>{
      const rack=racks.find(r=>r.id===odf.rack_id);
      return Object.values(db[odf.id]||{})
        .filter(p=>p.statut!=="LIBRE")
        .map(p=>`<tr>
          <td style="font-family:monospace;font-size:10px">${odf.id.replace("RDK-","")}</td>
          <td style="font-size:10px">${odf.odf_type}</td>
          <td style="font-family:monospace;font-size:10px">${odf.odf_number||"—"}</td>
          <td style="font-family:monospace;font-size:10px">${p.slot_port}</td>
          <td style="font-size:10px;font-weight:700;color:${SC[p.statut]?.tx}">${p.statut}</td>
          <td style="font-family:monospace;font-size:9px">${p.cid||""}</td>
          <td style="font-size:9px">${p.capacite||""}</td>
          <td style="font-size:9px">${p.source_client||p.owner||""}</td>
          <td style="font-size:9px">${p.end_client||""}</td>
          <td style="font-size:9px">${p.peer_odf_id?p.peer_odf_id.replace("RDK-","")+" "+p.peer_slot_port:""}</td>
        </tr>`);
    }).join("");
    win.document.write(`<!DOCTYPE html><html><head><title>ODF Manager — Export</title>
      <style>body{font-family:'DM Sans','Segoe UI',sans-serif;margin:20px}
      h1{color:#0F2744;font-size:16px}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th{background:#0F2744;color:#fff;font-size:9px;padding:6px 8px;text-align:left;letter-spacing:.5px}
      td{border-bottom:1px solid #F0F4F8;padding:5px 8px;vertical-align:middle}
      tr:nth-child(even){background:#F8FAFC}
      @media print{@page{size:A4 landscape;margin:1cm}}</style></head><body>
      <h1>ODF Manager v5.0 — Rapport d'infrastructure · ${new Date().toLocaleDateString("fr-FR")}</h1>
      <table><thead><tr>
        <th>ODF</th><th>TYPE</th><th>N° ODF</th><th>PORT</th><th>STATUT</th>
        <th>CID</th><th>CAP.</th><th>SOURCE CLIENT</th><th>CLIENT FINAL</th><th>PEER</th>
      </tr></thead><tbody>${rows}</tbody></table></body></html>`);
    win.document.close();
    setTimeout(()=>win.print(),400);
    setMsg({ok:true,txt:"Fenêtre d'impression ouverte."});
  }

  const stats={
    totalOdfs:odfList.length,
    activOdfs:odfList.filter(o=>o.is_active).length,
    totalPorts:odfList.reduce((a,o)=>a+Object.keys(db[o.id]||{}).length,0),
    activPorts:odfList.reduce((a,o)=>a+Object.values(db[o.id]||{}).filter(p=>p.statut!=="LIBRE").length,0),
    connexions:odfList.reduce((a,o)=>a+Object.values(db[o.id]||{}).filter(p=>p.peer_odf_id).length,0),
  };

  return(
    <div style={{maxWidth:780}}>
      {/* Stats rapides */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:18}}>
        {[["ODFs total",stats.totalOdfs,"#607D8B"],
          ["ODFs activés",stats.activOdfs,"#27AE60"],
          ["Ports total",stats.totalPorts,"#1565C0"],
          ["Ports occupés",stats.activPorts,"#F39C12"],
          ["Connexions peer",stats.connexions,"#5C6BC0"]].map(([l,v,c])=>(
          <div key={l} style={{background:"#fff",borderRadius:10,padding:"12px 14px",
            boxShadow:"0 1px 4px rgba(0,0,0,.05)",borderLeft:`3px solid ${c}`}}>
            <div style={{fontSize:22,fontWeight:800,color:c,fontFamily:"monospace"}}>{v}</div>
            <div style={{fontSize:9,color:"#90A4AE",marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {/* Export */}
        <div style={{background:"#fff",borderRadius:12,padding:20,
          boxShadow:"0 1px 6px rgba(0,0,0,.06)"}}>
          <div style={{fontSize:11,fontWeight:700,color:NAVY,letterSpacing:1,marginBottom:14}}>
            ↓ EXPORTER
          </div>
          <div style={{display:"grid",gap:10}}>
            <button onClick={exportCSV}
              style={{padding:"12px 16px",borderRadius:10,border:"none",
                background:"#1B5E20",color:"#fff",fontWeight:700,fontSize:12,
                cursor:"pointer",display:"flex",alignItems:"center",gap:10,
                boxShadow:"0 2px 8px rgba(27,94,32,.3)"}}>
              <span style={{fontSize:18}}>📊</span>
              <div style={{textAlign:"left"}}>
                <div>Exporter CSV</div>
                <div style={{fontSize:10,opacity:.8,fontWeight:400}}>Infrastructure + connexions</div>
              </div>
            </button>
            <button onClick={exportPDF}
              style={{padding:"12px 16px",borderRadius:10,border:"none",
                background:"#B71C1C",color:"#fff",fontWeight:700,fontSize:12,
                cursor:"pointer",display:"flex",alignItems:"center",gap:10,
                boxShadow:"0 2px 8px rgba(183,28,28,.3)"}}>
              <span style={{fontSize:18}}>📄</span>
              <div style={{textAlign:"left"}}>
                <div>Exporter PDF (imprimer)</div>
                <div style={{fontSize:10,opacity:.8,fontWeight:400}}>Rapport A4 paysage</div>
              </div>
            </button>
          </div>
          {msg&&(
            <div style={{marginTop:12,padding:"8px 12px",borderRadius:8,
              background:msg.ok?"#C6EFCE":"#FCE4D6",
              color:msg.ok?"#1A5C28":"#7B2000",fontSize:11,fontWeight:600}}>
              {msg.ok?"✓":"⚠"} {msg.txt}
            </div>
          )}
        </div>
        {/* Info */}
        <div style={{background:"#F8FAFC",borderRadius:12,padding:20,
          boxShadow:"0 1px 6px rgba(0,0,0,.04)"}}>
          <div style={{fontSize:11,fontWeight:700,color:NAVY,letterSpacing:1,marginBottom:12}}>
            ℹ CONTENU DE L'EXPORT
          </div>
          <div style={{fontSize:11,color:"#607D8B",lineHeight:1.9}}>
            <div style={{marginBottom:8}}>
              <div style={{fontWeight:700,color:NAVY,marginBottom:3}}>Section Infrastructure :</div>
              <ul style={{margin:0,paddingLeft:16,fontSize:10}}>
                <li>Tous les sites / racks / ODFs</li>
                <li>Type ODF (EXTERNE / INTERNE)</li>
                <li>Numéro unique généré à l'activation</li>
                <li>Date d'activation</li>
              </ul>
            </div>
            <div>
              <div style={{fontWeight:700,color:NAVY,marginBottom:3}}>Section Connexions :</div>
              <ul style={{margin:0,paddingLeft:16,fontSize:10}}>
                <li>Ports non-libres avec CID, OT N°, capacité</li>
                <li>Client source (opérateur/prestataire)</li>
                <li>Client final (bénéficiaire)</li>
                <li>Peer ODF + port peer (connexion fibre)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════════════
export default function App(){
  const [user,setUser]=useState(null);
  const [sites,setSites]=useState(null);
  const [racks,setRacks]=useState(null);
  const [odfList,setOdfList]=useState(null);
  const [db,setDb]=useState(null);
  const [history,setHistory]=useState([]);
  const [view,setView]=useState("dashboard");
  const [activeODF,setActiveODF]=useState("RDK-R1-ODF1");
  const [selectedPort,setSelectedPort]=useState(null);
  const [search,setSearch]=useState("");
  const [collapsed,setCollapsed]=useState(false);
  const [savedFlash,setSavedFlash]=useState(false);

  // ── Load on mount ─────────────────────────────────────────────────
  useEffect(()=>{
    (async()=>{
      const sess=await store.get(K.SESSION);
      if(sess) setUser(sess);
      const s=await store.get(K.SITES)||DEFAULT_SITES;
      const r=await store.get(K.RACKS)||DEFAULT_RACKS;
      const o=await store.get(K.ODFS)||DEFAULT_ODFS;
      setSites(s); setRacks(r); setOdfList(o);
      const savedDb=await store.get(K.DB);
      setDb(savedDb?migratePortDb(savedDb):buildPorts(o));
      setHistory(await store.get(K.HIST)||[]);
    })();
  },[]);

  const stats=useMemo(()=>db&&odfList?calcStats(db,odfList)
    :{s:{ACTIF:0,INTERNE:0,INCONNU:0,RÉSERVÉ:0,LIBRE:0,total:0},byOdf:{}},[db,odfList]);

  const flash=()=>{setSavedFlash(true);setTimeout(()=>setSavedFlash(false),2000);};

  const saveAll=useCallback(async(nd,nh,no,ns,nr)=>{
    const d=nd||db,h=nh||history,o=no||odfList,s_=ns||sites,r=nr||racks;
    await Promise.all([store.set(K.DB,d),store.set(K.HIST,h),
      store.set(K.ODFS,o),store.set(K.SITES,s_),store.set(K.RACKS,r)]);
    flash();
  },[db,history,odfList,sites,racks]);

  const addHist=useCallback((entries)=>{
    const nh=[...history,...entries]; setHistory(nh); return nh;
  },[history]);

  // ── Port save ──────────────────────────────────────────────────────
  const handleSave=useCallback(async(draft)=>{
    const orig=db[draft.odf_id]?.[draft.slot_port]||{};
    const FIELDS=["statut","cid","ot_num","capacite","owner","destination",
      "source_client","end_client","peer_odf_id","peer_slot_port","date_activ","remarques"];
    const entries=FIELDS.filter(f=>(orig[f]||"")!==(draft[f]||""))
      .map(f=>({port_id:draft.id,field:f,old:orig[f]||"",new:draft[f]||"",ts:tsNow(),user:user?.name||"?"}));
    const nd={...db,[draft.odf_id]:{...db[draft.odf_id],
      [draft.slot_port]:{...draft,updated_at:tsNow()}}};
    const nh=entries.length?addHist(entries):history;
    setDb(nd); setSelectedPort({...draft,updated_at:tsNow()});
    await saveAll(nd,nh);
  },[db,history,user,saveAll,addHist]);

  // ── Connect two ports ──────────────────────────────────────────────
  const handleConnect=useCallback(async(portA,portB,meta)=>{
    // portA = source port object (already in db), portB = {odf_id, slot_port} target
    const now=tsNow();
    const updA={...portA,
      peer_odf_id:portB.odf_id,peer_slot_port:portB.slot_port,
      source_client:meta.source_client||portA.source_client,
      end_client:meta.end_client||portA.end_client,
      capacite:meta.capacite||portA.capacite,
      statut:portA.statut==="LIBRE"?"ACTIF":portA.statut,
      updated_at:now};
    const origB=db[portB.odf_id]?.[portB.slot_port]||{};
    const updB={...origB,
      peer_odf_id:portA.odf_id,peer_slot_port:portA.slot_port,
      source_client:meta.source_client||origB.source_client,
      end_client:meta.end_client||origB.end_client,
      capacite:meta.capacite||origB.capacite,
      statut:origB.statut==="LIBRE"?"ACTIF":origB.statut,
      updated_at:now};
    const nd={...db,
      [portA.odf_id]:{...db[portA.odf_id],[portA.slot_port]:updA},
      [portB.odf_id]:{...db[portB.odf_id],[portB.slot_port]:updB}};
    const nh=addHist([{
      port_id:portA.id,field:"_connect",target:`${portA.slot_port}↔${portB.slot_port}`,
      detail:`${portA.odf_id} ↔ ${portB.odf_id}`,ts:now,user:user?.name||"?"}]);
    setDb(nd); setSelectedPort({...updA});
    await saveAll(nd,nh);
  },[db,history,user,saveAll,addHist]);

  // ── Disconnect port ────────────────────────────────────────────────
  const handleDisconnect=useCallback(async(port)=>{
    const now=tsNow();
    const peerOdfId=port.peer_odf_id, peerSlot=port.peer_slot_port;
    const updA={...port,peer_odf_id:"",peer_slot_port:"",updated_at:now};
    let nd={...db,[port.odf_id]:{...db[port.odf_id],[port.slot_port]:updA}};
    if(peerOdfId&&peerSlot&&db[peerOdfId]?.[peerSlot]){
      const origB=db[peerOdfId][peerSlot];
      nd={...nd,[peerOdfId]:{...nd[peerOdfId],[peerSlot]:{...origB,peer_odf_id:"",peer_slot_port:"",updated_at:now}}};
    }
    const nh=addHist([{port_id:port.id,field:"_disconnect",target:port.slot_port,
      detail:`${port.odf_id} peer ${peerOdfId||"?"}`,ts:now,user:user?.name||"?"}]);
    setDb(nd); setSelectedPort({...updA});
    await saveAll(nd,nh);
  },[db,history,user,saveAll,addHist]);

  // ── ODF Activation (génère numéro unique) ─────────────────────────
  const handleActivateODF=useCallback(async(odfId)=>{
    const odf=odfList.find(o=>o.id===odfId);
    if(!odf||odf.is_active) return;
    const num=generateODFNumber(odf,odfList);
    const now=tsNow();
    const updOdf={...odf,is_active:true,odf_number:num,activated_at:now};
    const no=odfList.map(o=>o.id===odfId?updOdf:o);
    const nh=addHist([{field:"_odf_activate",target:odfId,
      detail:`Numéro attribué : ${num}`,ts:now,user:user?.name||"?"}]);
    setOdfList(no);
    await saveAll(db,nh,no,sites,racks);
  },[odfList,db,sites,racks,user,saveAll,addHist]);

  // ── CRUD Sites ─────────────────────────────────────────────────────
  const handleAddSite=useCallback(async(site)=>{
    const ns=[...sites,site];
    const nh=addHist([{field:"_site_create",target:site.id,detail:site.name,ts:tsNow(),user:user?.name}]);
    setSites(ns); await saveAll(db,nh,odfList,ns,racks);
  },[sites,racks,odfList,db,user,saveAll,addHist]);

  const handleEditSite=useCallback(async(site)=>{
    const ns=sites.map(s=>s.id===site.id?site:s);
    const nh=addHist([{field:"_site_edit",target:site.id,ts:tsNow(),user:user?.name}]);
    setSites(ns); await saveAll(db,nh,odfList,ns,racks);
  },[sites,racks,odfList,db,user,saveAll,addHist]);

  const handleDeleteSite=useCallback(async(siteId)=>{
    const ns=sites.filter(s=>s.id!==siteId);
    const delRacks=racks.filter(r=>r.site_id===siteId).map(r=>r.id);
    const nr=racks.filter(r=>r.site_id!==siteId);
    const no=odfList.filter(o=>!delRacks.includes(o.rack_id));
    const nd={...db}; odfList.filter(o=>delRacks.includes(o.rack_id)).forEach(o=>delete nd[o.id]);
    const nh=addHist([{field:"_site_delete",target:siteId,ts:tsNow(),user:user?.name}]);
    setSites(ns); setRacks(nr); setOdfList(no); setDb(nd);
    await saveAll(nd,nh,no,ns,nr);
  },[sites,racks,odfList,db,user,saveAll,addHist]);

  // ── CRUD Racks ─────────────────────────────────────────────────────
  const handleAddRack=useCallback(async(rack)=>{
    const nr=[...racks,rack];
    const nh=addHist([{field:"_rack_create",target:rack.id,detail:rack.description,ts:tsNow(),user:user?.name}]);
    setRacks(nr); await saveAll(db,nh,odfList,sites,nr);
  },[racks,sites,odfList,db,user,saveAll,addHist]);

  const handleEditRack=useCallback(async(rack)=>{
    const nr=racks.map(r=>r.id===rack.id?rack:r);
    const nh=addHist([{field:"_rack_edit",target:rack.id,ts:tsNow(),user:user?.name}]);
    setRacks(nr); await saveAll(db,nh,odfList,sites,nr);
  },[racks,sites,odfList,db,user,saveAll,addHist]);

  const handleDeleteRack=useCallback(async(rackId)=>{
    const nr=racks.filter(r=>r.id!==rackId);
    const no=odfList.filter(o=>o.rack_id!==rackId);
    const nd={...db}; odfList.filter(o=>o.rack_id===rackId).forEach(o=>delete nd[o.id]);
    const nh=addHist([{field:"_rack_delete",target:rackId,ts:tsNow(),user:user?.name}]);
    setRacks(nr); setOdfList(no); setDb(nd);
    await saveAll(nd,nh,no,sites,nr);
  },[racks,sites,odfList,db,user,saveAll,addHist]);

  // ── CRUD ODFs ──────────────────────────────────────────────────────
  const handleAddODF=useCallback(async(odf)=>{
    const no=[...odfList,odf];
    const nd={...db,[odf.id]:{}};
    for(let s=1;s<=odf.slots;s++)
      for(let p=1;p<=odf.ports_per_slot;p++){
        const k=spKey(s,p);
        nd[odf.id][k]={id:`${odf.id}_${k}`,odf_id:odf.id,slot_port:k,slot:s,port:p,
          statut:"LIBRE",cid:"",ot_num:"",capacite:"",owner:"",destination:"",
          source_client:"",end_client:"",peer_odf_id:"",peer_slot_port:"",
          date_activ:"",remarques:"",updated_at:null};
      }
    const nh=addHist([{field:"_odf_create",target:odf.id,
      detail:`${odf.route} · ${odf.slots}×${odf.ports_per_slot} · ${odf.odf_type}`,ts:tsNow(),user:user?.name}]);
    setOdfList(no); setDb(nd); setActiveODF(odf.id);
    await saveAll(nd,nh,no,sites,racks);
  },[odfList,db,sites,racks,user,saveAll,addHist]);

  const handleEditODF=useCallback(async(odf)=>{
    const no=odfList.map(o=>o.id===odf.id?odf:o);
    const nh=addHist([{field:"_odf_edit",target:odf.id,detail:odf.route,ts:tsNow(),user:user?.name}]);
    setOdfList(no); await saveAll(db,nh,no,sites,racks);
  },[odfList,db,sites,racks,user,saveAll,addHist]);

  const handleDeleteODF=useCallback(async(odfId)=>{
    const no=odfList.filter(o=>o.id!==odfId);
    const nd={...db}; delete nd[odfId];
    const nh=addHist([{field:"_odf_delete",target:odfId,ts:tsNow(),user:user?.name}]);
    setOdfList(no); setDb(nd);
    if(activeODF===odfId&&no.length) setActiveODF(no[0].id);
    await saveAll(nd,nh,no,sites,racks);
  },[odfList,db,activeODF,sites,racks,user,saveAll,addHist]);

  const handleUpdatePorts=useCallback(async(odfId,ports)=>{
    const nd={...db,[odfId]:ports};
    const nh=addHist([{port_id:odfId,field:"_port_add",target:odfId,ts:tsNow(),user:user?.name||"?"}]);
    setDb(nd); await saveAll(nd,nh);
  },[db,history,user,saveAll,addHist]);

  const handleLogin=useCallback(async u=>{setUser(u);await store.set(K.SESSION,u);},[]);
  const handleLogout=useCallback(async()=>{setUser(null);setSelectedPort(null);await store.del(K.SESSION);},[]);

  if(!db||!odfList||!sites||!racks) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",
      height:"100vh",background:"#F0F4F8",flexDirection:"column",gap:12}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:32,height:32,border:"3px solid #DDE3EA",borderTopColor:BLUE,
        borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
      <div style={{color:NAVY,fontWeight:600,fontSize:13}}>ODF Manager v5…</div>
    </div>
  );

  if(!user) return <AuthScreen onAuth={handleLogin}/>;

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",
      fontFamily:"'DM Sans','Segoe UI',sans-serif",background:"#F0F4F8",overflow:"hidden"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {/* Status bar */}
      <div style={{background:NAVY,padding:"5px 16px",display:"flex",
        alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <span style={{fontSize:9,color:"rgba(255,255,255,.4)"}}>
          ODF Manager v5.0 · INTERNE/EXTERNE · Numérotation automatique · Connexions peer
        </span>
        <span style={{fontSize:9,color:"rgba(255,255,255,.3)"}}>
          {sites.length} sites · {racks.length} racks · {odfList.length} ODFs
          · {odfList.filter(o=>o.is_active).length} activés · {stats.s.total} ports
        </span>
      </div>
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        <Sidebar view={view}
          setView={v=>{setView(v);if(selectedPort)setSelectedPort(null);}}
          stats={stats} user={user} onLogout={handleLogout}
          collapsed={collapsed} setCollapsed={setCollapsed}/>
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <TopBar search={search} setSearch={v=>{setSearch(v);if(v)setView("registry");}} saved={savedFlash}/>
          <main style={{flex:1,overflowY:"auto",padding:16}}>
            {view==="dashboard"&&<Dashboard stats={stats} odfList={odfList} sites={sites} racks={racks}
              db={db} setView={setView} setActiveODF={setActiveODF}/>}
            {view==="odf"&&<ODFPanel db={db} odfList={odfList} sites={sites} racks={racks}
              activeODF={activeODF} setActiveODF={setActiveODF}
              onPort={setSelectedPort} onConnect={handleConnect} search={search} user={user}/>}
            {view==="registry"&&<Registry db={db} odfList={odfList}
              onPort={setSelectedPort} search={search} setSearch={setSearch}/>}
            {view==="clients"&&<ClientView db={db} odfList={odfList} onPort={setSelectedPort}/>}
            {view==="manage"&&CAN_ADMIN(user.role)&&
              <ManageInfra sites={sites} racks={racks} odfList={odfList} db={db} stats={stats} user={user}
                onAddSite={handleAddSite} onEditSite={handleEditSite} onDeleteSite={handleDeleteSite}
                onAddRack={handleAddRack} onEditRack={handleEditRack} onDeleteRack={handleDeleteRack}
                onAddODF={handleAddODF} onEditODF={handleEditODF} onDeleteODF={handleDeleteODF}
                onUpdatePorts={handleUpdatePorts}/>}
            {view==="export"&&<ExportImportPanel db={db} odfList={odfList} sites={sites} racks={racks}/>}
            {view==="history"&&<HistoryView history={history}/>}
            {view==="alerts"&&<Alerts db={db} odfList={odfList} onPort={setSelectedPort}/>}
          </main>
        </div>
      </div>
      {selectedPort&&<PortDrawer port={selectedPort} onSave={handleSave}
        onConnect={handleConnect} onDisconnect={handleDisconnect}
        onClose={()=>setSelectedPort(null)} user={user}
        sites={sites} racks={racks} odfList={odfList} db={db}/>}
    </div>
  );
}
