import React from "react";
import { SC, NAVY, BLUE } from "../utils/constants";

export function Badge({ st, sm }) {
  const c = SC[st] || SC.LIBRE;
  return <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: sm ? "2px 7px" : "3px 10px", borderRadius: 20, background: c.bg,
    border: `1px solid ${c.bd}`, fontSize: sm ? 10 : 11, fontWeight: 700, color: c.tx, whiteSpace: "nowrap"
  }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
    {st}
  </span>;
}

export function TypeBadge({ type }) {
  const isInt = type === "INTERNE";
  return <span style={{
    display: "inline-flex", alignItems: "center", gap: 3,
    padding: "2px 8px", borderRadius: 20,
    background: isInt ? "#EDE7F6" : "#E3F2FD",
    border: `1px solid ${isInt ? "#B39DDB" : "#90CAF9"}`,
    fontSize: 10, fontWeight: 800,
    color: isInt ? "#4527A0" : "#1565C0", whiteSpace: "nowrap"
  }}>
    {isInt ? "iODF" : "ODF"} {isInt ? "INTERNE" : "EXTERNE"}
  </span>;
}

export function ODFNumberBadge({ num }) {
  if (!num) return <span style={{ fontSize: 9, color: "#AAB4BE", fontStyle: "italic" }}>Non activé</span>;
  return <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "2px 9px", borderRadius: 12, background: "#C6EFCE",
    border: "1px solid #5A9E6A", fontSize: 10, fontWeight: 800,
    color: "#1A5C28", fontFamily: "monospace"
  }}>
    ⚡ {num}
  </span>;
}

export function Btn({ children, onClick, variant = "primary", sm = false, disabled = false, full = false }) {
  const styles = {
    primary: { bg: BLUE, color: "#fff", border: BLUE },
    success: { bg: "#27AE60", color: "#fff", border: "#27AE60" },
    danger: { bg: "#E74C3C", color: "#fff", border: "#E74C3C" },
    outline: { bg: "transparent", color: BLUE, border: BLUE },
    ghost: { bg: "transparent", color: "#607D8B", border: "#DDE3EA" },
  };
  const s = styles[variant] || styles.primary;
  return <button onClick={onClick} disabled={disabled}
    style={{
      padding: sm ? "5px 11px" : "9px 18px", borderRadius: 8,
      border: `1.5px solid ${disabled ? "#DDE3EA" : s.border}`,
      background: disabled ? "#F4F6F8" : s.bg, color: disabled ? "#AAB4BE" : s.color,
      fontWeight: 600, fontSize: sm ? 11 : 13, cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "inherit", transition: "all .15s",
      width: full ? "100%" : "auto", whiteSpace: "nowrap"
    }}>
    {children}
  </button>;
}

export function Sel({ label, value, onChange, options, placeholder, disabled }) {
  return (
    <div>
      {label && <label style={{
        display: "block", fontSize: 10, fontWeight: 700,
        color: "#607D8B", letterSpacing: .5, marginBottom: 4
      }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        style={{
          width: "100%", padding: "8px 10px", border: "1.5px solid #DDE3EA", borderRadius: 8,
          fontSize: 12, fontFamily: "inherit", outline: "none", background: disabled ? "#F8FAFC" : "#fff",
          color: value ? "#1a1a1a" : "#90A4AE"
        }}>
        <option value="">{placeholder || "— Sélectionner —"}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function Inp({ label, value, onChange, placeholder, mono, readonly, required }) {
  return (
    <div>
      {label && <label style={{
        display: "block", fontSize: 10, fontWeight: 700,
        color: "#607D8B", letterSpacing: .5, marginBottom: 4
      }}>
        {label}{required && <span style={{ color: "#E74C3C" }}> *</span>}
      </label>}
      <input value={value || ""} onChange={e => onChange(e.target.value)}
        placeholder={placeholder || ""} readOnly={readonly}
        style={{
          width: "100%", padding: "8px 10px", border: "1.5px solid #DDE3EA",
          borderRadius: 8, fontSize: 12, fontFamily: mono ? "monospace" : "inherit",
          background: readonly ? "#F8FAFC" : "#fff", outline: "none", boxSizing: "border-box"
        }}
        onFocus={e => { if (!readonly) e.target.style.borderColor = BLUE; }}
        onBlur={e => e.target.style.borderColor = "#DDE3EA"} />
    </div>
  );
}

export function Modal({ title, icon, onClose, children, footer, width = 480 }) {
  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,.4)", zIndex: 200
      }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)", width: `min(${width}px,95vw)`,
        background: "#fff", borderRadius: 14, zIndex: 201,
        boxShadow: "0 20px 60px rgba(0,0,0,.25)", overflow: "hidden",
        display: "flex", flexDirection: "column", maxHeight: "90vh"
      }}>
        <div style={{
          background: NAVY, padding: "14px 18px", flexShrink: 0,
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{icon} {title}</div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,.1)",
            border: "none", color: "#fff", width: 28, height: 28, borderRadius: 7,
            cursor: "pointer", fontSize: 14
          }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>{children}</div>
        {footer && <div style={{
          padding: "12px 18px", borderTop: "1px solid #F0F4F8",
          display: "flex", gap: 8, justifyContent: "flex-end",
          background: "#FAFBFC", flexShrink: 0
        }}>{footer}</div>}
      </div>
    </>
  );
}

export function ConfirmModal({ title, message, onConfirm, onClose }) {
  return (
    <Modal title={title} icon="⚠" onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose}>Annuler</Btn>
        <Btn variant="danger" onClick={onConfirm}>Supprimer</Btn></>}>
      <p style={{ fontSize: 13, color: "#444", lineHeight: 1.7 }}>{message}</p>
    </Modal>
  );
}
