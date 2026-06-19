import React from "react";

export default function Topbar({ title, search, setSearch, t, TH, saved, rightSlot }) {
  return (
    <div style={{
      height: "56px", 
      display: "flex", 
      alignItems: "center", 
      gap: "12px",
      padding: "0 24px", 
      borderBottom: `1px solid ${TH.border}`,
      background: TH.bgSurface, 
      boxShadow: TH.topbarShadow, 
      flexShrink: 0
    }}>
      <span style={{ 
        fontFamily: "'Syne',sans-serif", 
        fontWeight: 700, 
        color: TH.text1, 
        fontSize: "16px", 
        flexShrink: 0 
      }}>
        {title}
      </span>
      {setSearch && (
        <input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder={t.searchPlaceholder}
          style={{
            flex: 1, 
            maxWidth: "320px", 
            background: TH.bgInput, 
            border: `1px solid ${TH.border}`,
            borderRadius: "8px", 
            padding: "7px 12px", 
            color: TH.text1, 
            fontSize: "13px"
          }} 
        />
      )}
      <div style={{ flex: 1 }} />
      {saved && (
        <span style={{ 
          color: TH.green, 
          fontSize: "12px", 
          animation: "fadeUp .3s" 
        }}>{t.saved}</span>
      )}
      {rightSlot}
    </div>
  );
}
