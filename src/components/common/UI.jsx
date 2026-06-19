import React from "react";

export function Btn({ children, onClick, variant = "primary", disabled, size = "md", TH }) {
  const base = {
    border: "none", 
    borderRadius: "8px", 
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "'DM Sans',sans-serif", 
    fontWeight: 600, 
    transition: "all .2s",
    opacity: disabled ? 0.5 : 1,
    padding: size === "sm" ? "6px 12px" : size === "lg" ? "12px 24px" : "8px 16px",
    fontSize: size === "sm" ? "12px" : size === "lg" ? "15px" : "13px",
  };
  const variants = {
    primary: { background: TH.blue, color: "#fff" },
    outline: { background: "transparent", color: TH.blue, border: `1px solid ${TH.blue}` },
    danger: { background: "transparent", color: TH.red, border: `1px solid ${TH.red}` },
    ghost: { background: TH.bgHover, color: TH.text2 },
    success: { background: "transparent", color: TH.green, border: `1px solid ${TH.green}` },
  };
  return (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  );
}

export function Inp({ value, onChange, placeholder, type = "text", TH, style = {} }) {
  return (
    <input 
      type={type} 
      value={value} 
      onChange={e => onChange(e.target.value)} 
      placeholder={placeholder}
      style={{
        background: TH.bgInput, 
        border: `1px solid ${TH.border}`, 
        borderRadius: "8px",
        padding: "8px 12px", 
        color: TH.text1, 
        fontSize: "13px", 
        width: "100%", 
        ...style
      }} 
    />
  );
}

export function Sel({ value, onChange, children, TH, style = {} }) {
  return (
    <select 
      value={value} 
      onChange={e => onChange(e.target.value)}
      style={{
        background: TH.bgInput, 
        border: `1px solid ${TH.border}`, 
        borderRadius: "8px",
        padding: "8px 12px", 
        color: TH.text1, 
        fontSize: "13px", 
        width: "100%", 
        ...style
      }}>
      {children}
    </select>
  );
}

export function Bdg({ status, TH }) {
  const c = TH.sc[status] || TH.sc.LIBRE;
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
      <span style={{
        width: "6px", 
        height: "6px", 
        borderRadius: "50%", 
        background: c.dot,
        boxShadow: TH.statusGlow ? `0 0 6px ${c.dot}` : "none"
      }} />
      {status}
    </span>
  );
}

export function Spinner({ TH }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }}>
      <div style={{
        width: "28px", 
        height: "28px", 
        borderRadius: "50%",
        border: `3px solid ${TH.border}`, 
        borderTopColor: TH.blue, 
        animation: "spin 0.8s linear infinite"
      }} />
    </div>
  );
}

export function Modal({ title, children, onClose, TH, width = "500px" }) {
  return (
    <div style={{
      position: "fixed", 
      inset: 0, 
      zIndex: 200, 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      background: "rgba(0,0,0,0.6)", 
      backdropFilter: "blur(4px)"
    }} onClick={onClose}>
      <div 
        onClick={e => e.stopPropagation()} 
        style={{
          background: TH.bgCard, 
          border: `1px solid ${TH.border}`,
          borderRadius: "16px", 
          width, 
          maxWidth: "95vw", 
          maxHeight: "85vh", 
          overflow: "auto",
          boxShadow: TH.glassShadow
        }}>
        <div style={{
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          padding: "20px 24px", 
          borderBottom: `1px solid ${TH.border}`, 
          background: TH.modalHeaderBg
        }}>
          <span style={{ 
            fontFamily: "'Syne',sans-serif", 
            fontWeight: 700, 
            color: TH.text1, 
            fontSize: "16px" 
          }}>{title}</span>
          <button 
            onClick={onClose} 
            style={{ 
              background: "none", 
              border: "none", 
              color: TH.text2, 
              fontSize: "20px", 
              cursor: "pointer" 
            }}>
            ×
          </button>
        </div>
        <div style={{ padding: "24px" }}>{children}</div>
      </div>
    </div>
  );
}

export function Confirm({ message, onYes, onNo, TH, t }) {
  return (
    <div style={{
      position: "fixed", 
      inset: 0, 
      zIndex: 300, 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      background: "rgba(0,0,0,0.7)"
    }}>
      <div style={{
        background: TH.bgCard, 
        border: `1px solid ${TH.border}`, 
        borderRadius: "12px",
        padding: "32px", 
        textAlign: "center", 
        boxShadow: TH.glassShadow
      }}>
        <div style={{ color: TH.text1, marginBottom: "20px", fontSize: "15px" }}>{message}</div>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <Btn onClick={onYes} variant="danger" TH={TH}>{t.yes}</Btn>
          <Btn onClick={onNo} variant="ghost" TH={TH}>{t.no}</Btn>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, children, TH }) {
  return (
    <div>
      <label style={{ display: "block", color: TH.text2, fontSize: "11px", fontWeight: 600, marginBottom: "5px" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
