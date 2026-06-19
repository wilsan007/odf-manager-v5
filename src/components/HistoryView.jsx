import React, { useState, useEffect } from "react";
import { getHistory } from "../supabase.js";
import { Spinner } from "./common/UI.jsx";
import { fmt } from "./common/Utilities.js";

export default function HistoryView({ t, TH }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    getHistory(200).then(r => {
      setRows(r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false)); 
  }, []);

  if (loading) return <Spinner TH={TH} />;

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "20px" }}>
      {!rows.length && <div style={{ textAlign: "center", color: TH.text3, paddingTop: "40px" }}>{t.history_empty}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {rows.map((r, i) => (
          <div 
            key={i} 
            style={{
              background: TH.bgCard, 
              border: `1px solid ${TH.border}`, 
              borderRadius: "10px",
              padding: "12px 16px", 
              display: "flex", 
              alignItems: "center", 
              gap: "12px"
            }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: TH.blue, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ color: TH.text1, fontSize: "13px" }}>{r.action || r.description || "—"}</div>
              {r.user_email && <div style={{ color: TH.text3, fontSize: "11px" }}>{r.user_email}</div>}
            </div>
            <div style={{ color: TH.text3, fontSize: "11px", flexShrink: 0 }}>{fmt(r.created_at)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
