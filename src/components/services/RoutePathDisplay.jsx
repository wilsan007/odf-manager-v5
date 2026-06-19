import React from "react";

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE PATH DISPLAY — affichage visuel du chemin A › B › C
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Affiche le chemin de routage entre sites sous forme de "breadcrumb" coloré.
 * Le site actif et les sites déjà traités sont mis en valeur par des couleurs distinctes.
 *
 * @param {object} props
 * @param {string[]} props.pathSites      - Tableau d'IDs de sites formant le chemin
 * @param {number}   props.activeHopIndex - Index du saut en cours (-1 = aucun actif)
 * @param {Array}    props.sitesList      - Liste des sites (pour résoudre id → name)
 * @param {object}   props.TH             - Thème de couleurs
 */
export function RoutePathDisplay({ pathSites, activeHopIndex, sitesList, TH }) {
  if (!pathSites || pathSites.length === 0) return null;

  const siteName = (id) => sitesList.find(s => s.id === id)?.name || id;

  return (
    <div style={{
      display:      "flex",
      alignItems:   "center",
      gap:          "6px",
      flexWrap:     "wrap",
      padding:      "10px 14px",
      background:   TH.bgInput,
      borderRadius: "8px",
      border:       `1px solid ${TH.border}`,
      marginBottom: "16px",
    }}>
      <span style={{
        fontSize:      "10px",
        color:         TH.text3,
        fontWeight:    700,
        marginRight:   "4px",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}>
        Route :
      </span>

      {pathSites.map((siteId, idx) => {
        const hopIdx      = idx - 1;
        const isActiveSite = activeHopIndex === hopIdx || activeHopIndex === idx - 1;
        const isStart     = idx === 0;
        const isEnd       = idx === pathSites.length - 1;
        const isDone      = activeHopIndex > hopIdx;

        let bgColor = TH.bgCard;
        if (isStart && isDone)   bgColor = TH.green;
        else if (isEnd)          bgColor = TH.cyan;
        else if (isActiveSite)   bgColor = TH.blue;
        else if (isDone)         bgColor = `${TH.green}66`;

        const txColor     = (isActiveSite || isDone || isStart || isEnd) ? "#fff" : TH.text2;
        const borderColor = isActiveSite ? TH.blue : isDone ? TH.green : TH.border;

        return (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {idx > 0 && (
              <span style={{
                color:      activeHopIndex >= idx - 1 ? TH.gold : TH.text3,
                fontWeight: 700,
                fontSize:   "14px",
              }}>
                ›
              </span>
            )}
            <span style={{
              background:  bgColor,
              color:       txColor,
              border:      `1px solid ${borderColor}`,
              borderRadius:"6px",
              padding:     "4px 12px",
              fontSize:    "12px",
              fontWeight:  700,
              transition:  "all 0.2s",
              boxShadow:   isActiveSite ? `0 0 8px ${TH.blue}66` : "none",
              fontFamily:  "'JetBrains Mono', monospace",
            }}>
              {siteName(siteId)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
