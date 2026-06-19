import React, { useState, useEffect } from "react";
import { supabase, getTransitData, getSalleIdsForPorts, createService, addServiceJonctions, addHistory } from "../../supabase.js";
import { Btn, Sel, Inp, Modal } from "../common/UI.jsx";
import { RoutePathDisplay } from "./RoutePathDisplay.jsx";
import { CableSelector } from "./CableSelector.jsx";
import { useRouteGraph, findBestInternalPort, MATCH_LABELS, genCid } from "./routingEngine.js";

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE WIZARD
// ═══════════════════════════════════════════════════════════════════════════

export function ServiceWizard({ open, onClose, onDone, sites, cables, fournisseurs, clients, TH, t }) {
  const [step, setStep] = useState("SELECT_SITES");
  const [currentHopIdx, setCurrentHopIdx] = useState(0);

  const [label, setLabel] = useState("");
  const [siteA, setSiteA] = useState("");
  const [siteB, setSiteB] = useState("");
  const [pathSites, setPathSites] = useState([]);
  const [noPath, setNoPath] = useState(false);
  const [hops, setHops] = useState([]);

  const [fournisseurId, setFournisseurId] = useState("");
  const [clientId, setClientId] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [transitPorts, setTransitPorts] = useState([]);
  const [transitData, setTransitData] = useState(null);
  const [transitReco, setTransitReco] = useState([]);
  const [transitLoading, setTransitLoading] = useState(false);

  const { findPath, getCablesBetween } = useRouteGraph(cables);

  useEffect(() => {
    if (open) {
      setStep("SELECT_SITES");
      setCurrentHopIdx(0);
      setLabel("");
      setSiteA("");
      setSiteB("");
      setPathSites([]);
      setNoPath(false);
      setHops([]);
      setFournisseurId("");
      setClientId("");
      setSaving(false);
      setErr("");
      setTransitData(null);
      setTransitReco([]);
      setTransitLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!siteA || !siteB || siteA === siteB) {
      setPathSites([]);
      setNoPath(false);
      return;
    }
    const path = findPath(siteA, siteB);
    if (path) {
      setPathSites(path);
      setNoPath(false);
      setHops(Array(path.length - 1).fill(null).map(() => ({
        cableId: null, portEntree: null, portSortie: null,
        siteFrom: null, siteTo: null, cable_reference: null
      })));
    } else {
      setPathSites([]);
      setNoPath(true);
    }
  }, [siteA, siteB, cables, findPath]);

  useEffect(() => {
    if (!step.startsWith("HOP_")) {
      setTransitPorts([]); setTransitData(null); setTransitReco([]); setTransitLoading(false);
      return;
    }
    const n = parseInt(step.split("_")[1], 10);
    if (n === 0 || !pathSites[n]) {
      setTransitPorts([]); setTransitData(null); setTransitReco([]); setTransitLoading(false);
      return;
    }
    setTransitLoading(true);
    setTransitData(null);
    setTransitPorts([]);
    setTransitReco([]);
    const siteBTransit = pathSites[n];
    getTransitData(siteBTransit).then(data => {
      setTransitData(data);
      setTransitPorts(data.internalPorts);
      setTransitLoading(false);
    });
  }, [step, pathSites]);

  useEffect(() => {
    if (!transitData || !step.startsWith("HOP_")) return;
    const n = parseInt(step.split("_")[1], 10);
    if (n === 0) return;
    const portTransitIn = hops[n - 1]?.portSortie || null;
    if (!portTransitIn) { setTransitReco([]); return; }
    const portEntreeB = hops[n]?.portEntree || null;
    const siteBTransit = pathSites[n];
    const siteCNext = pathSites[n + 1];
    const cablesExterneB = (cables || []).filter(c => {
      const s = c.port_source_id?.split('-')[0];
      const d = c.port_dest_id?.split('-')[0];
      return (s === siteBTransit && d === siteCNext) || (s === siteCNext && d === siteBTransit);
    });
    const reco = findBestInternalPort({
      portTransitIn, portEntreeB,
      internalPorts: transitData.internalPorts,
      externalPorts: transitData.externalPorts,
      jarretieres: transitData.jarretieres,
      cablesExterneB,
    });
    setTransitReco(reco);
    if (reco.length > 0 && ['PERFECT_MATCH', 'CHAIN_CONFIRMED'].includes(reco[0].matchType) && !hops[n]?.portTransitMid) {
      onSelectTransitMid(n, reco[0].portInterne.id);
    }
  }, [hops, transitData, step, pathSites, cables]);

  if (!open) return null;

  const totalHops = pathSites.length > 1 ? pathSites.length - 1 : 0;
  const siteName = (id) => (sites || []).find(s => s.id === id)?.name || id;

  const onSubmitSites = () => {
    setErr("");
    if (!label.trim()) { setErr("Le label du service est obligatoire."); return; }
    if (!siteA || !siteB) { setErr("Veuillez sélectionner les sites de départ et d'arrivée."); return; }
    if (siteA === siteB) { setErr("Les sites de départ et d'arrivée doivent être différents."); return; }
    if (pathSites.length === 0) { setErr("Aucun chemin disponible entre ces deux sites."); return; }
    setStep("HOP_0");
    setCurrentHopIdx(0);
  };

  const onSelectCable = (hopIdx, cable) => {
    setErr("");
    const newHops = [...hops];
    newHops[hopIdx] = {
      ...newHops[hopIdx],
      cableId: cable.id,
      portEntree: cable.portEntree,
      portSortie: cable.portSortie,
      siteFrom: cable.siteSource === pathSites[hopIdx] ? cable.siteSource : cable.siteDest,
      siteTo: cable.siteSource === pathSites[hopIdx] ? cable.siteDest : cable.siteSource,
      cable_reference: cable.cable_reference,
    };
    setHops(newHops);
  };

  const onSelectTransitMid = (hopIdx, portId) => {
    const newHops = [...hops];
    newHops[hopIdx] = {
      ...newHops[hopIdx],
      portTransitMid: portId
    };
    setHops(newHops);
  };

  const onNextHop = (hopIdx) => {
    setErr("");
    if (!hops[hopIdx] || !hops[hopIdx].cableId) {
      const from = siteName(pathSites[hopIdx]);
      const to = siteName(pathSites[hopIdx + 1]);
      setErr(`Veuillez sélectionner un câble pour la liaison ${from} → ${to}.`);
      return;
    }
    if (hopIdx > 0) {
      const portTransitInCheck = hops[hopIdx - 1]?.portSortie || null;
      if (!portTransitInCheck) {
        setErr(`Erreur : le port d'arrivée depuis ${siteName(pathSites[hopIdx - 1])} → ${siteName(pathSites[hopIdx])} n'est pas résolu. Retournez à l'étape précédente et sélectionnez un câble valide.`);
        return;
      }
      if (!hops[hopIdx].portEntree) {
        setErr(`Veuillez sélectionner le port de sortie vers ${siteName(pathSites[hopIdx + 1])} (étape 2).`);
        return;
      }
      if (!hops[hopIdx].portTransitMid) {
        setErr(`Veuillez sélectionner un port de brassage interne iODF sur le site ${siteName(pathSites[hopIdx])} (étape 3 — connexion locale requise).`);
        return;
      }
    }
    if (hopIdx + 1 < totalHops) {
      setStep(`HOP_${hopIdx + 1}`);
      setCurrentHopIdx(hopIdx + 1);
    } else {
      setStep("SELECT_FOURNISSEUR");
    }
  };

  const onNextFournisseur = () => {
    setErr("");
    if (!fournisseurId) { setErr("Veuillez sélectionner un fournisseur d'accès."); return; }
    setStep("SELECT_CLIENT");
  };

  const onNextClient = () => {
    setErr("");
    if (!clientId) { setErr("Veuillez sélectionner un client final."); return; }
    setStep("CONFIRM");
  };

  const getOrCreateTransitJar = async (siteTransit, p1, p2, typeLien = 'INTERNE') => {
    const prefix = 'INT';
    const jarRef = `${prefix}-${siteTransit}-${p1.split('_').pop()}-${p2.split('_').pop()}`;
    const nom = `Câble interne ${siteTransit} : ${p1.split('_').pop()} ↔ ${p2.split('_').pop()}`;

    const { data: existingJar } = await supabase.from('cables_fibre')
      .select('id').eq('cable_reference', jarRef).maybeSingle();

    if (existingJar) {
      return existingJar.id;
    }

    const { data: newJar, error: jarErr } = await supabase.from('cables_fibre').insert({
      cable_reference: jarRef,
      nom: nom,
      type_lien: typeLien,
      port_source_id: p1,
      port_dest_id: p2,
      capacite_totale_gbps: 0,
      capacite_disponible_gbps: 0,
    }).select('id').single();

    if (jarErr) throw jarErr;
    return newJar.id;
  };

  const onConfirm = async () => {
    setSaving(true); setErr("");
    let serviceId = null;

    try {
      for (let i = 1; i < hops.length; i++) {
        const portTransitIn = hops[i - 1]?.portSortie || null;
        if (!portTransitIn) {
          const siteFrom = siteName(pathSites[i - 1]);
          const siteTo = siteName(pathSites[i]);
          throw new Error(`Le port d'arrivée sur le site de transit ${siteTo} (depuis ${siteFrom}) n'est pas résolu. Retournez à l'étape ${i} et vérifiez le câble sélectionné.`);
        }
        if (!hops[i]?.portTransitMid) {
          throw new Error(`La connexion locale iODF sur le site de transit ${siteName(pathSites[i])} est manquante (étape ${i + 1}). Sélectionnez un port de brassage interne.`);
        }
      }

      const transitPortIds = [];
      for (let i = 1; i < hops.length; i++) {
        const portIn = hops[i - 1]?.portSortie;
        const portMid = hops[i]?.portTransitMid;
        const portOut = hops[i]?.portEntree;
        if (portIn) transitPortIds.push(portIn);
        if (portMid) transitPortIds.push(portMid);
        if (portOut) transitPortIds.push(portOut);
      }
      const salleMap = transitPortIds.length > 0
        ? await getSalleIdsForPorts([...new Set(transitPortIds)])
        : {};

      const linkType = (pa, pb) => {
        return 'INTERNE';
      };

      const cid = genCid();
      const primaryHop = hops[0];

      const { data: svcData, error: svcErr } = await createService({
        id: cid,
        cid: cid,
        label: label.trim(),
        cable_id: primaryHop.cableId,
        client_id: clientId,
        fournisseur_id: fournisseurId,
        port_id: primaryHop.portEntree,
      });
      if (svcErr) throw svcErr;
      serviceId = svcData.id;

      const jonctions = [];
      let ordre = 1;

      for (let i = 0; i < hops.length; i++) {
        const hop = hops[i];
        if (!hop || !hop.cableId) continue;

        if (i > 0) {
          const portTransitIn = hops[i - 1]?.portSortie;
          const portTransitMid = hop.portTransitMid;
          const siteTransit = hop.siteFrom || pathSites[i];

          if (portTransitIn && portTransitMid && hop.portEntree) {
            const type1 = linkType(portTransitIn, portTransitMid);
            const jar1Id = await getOrCreateTransitJar(siteTransit, portTransitIn, portTransitMid, type1);
            jonctions.push({
              service_id: serviceId,
              ordre: ordre++,
              cable_id: jar1Id,
              port_entree_id: portTransitIn,
              port_sortie_id: portTransitMid,
            });

            const type2 = linkType(portTransitMid, hop.portEntree);
            const jar2Id = await getOrCreateTransitJar(siteTransit, portTransitMid, hop.portEntree, type2);
            jonctions.push({
              service_id: serviceId,
              ordre: ordre++,
              cable_id: jar2Id,
              port_entree_id: portTransitMid,
              port_sortie_id: hop.portEntree,
            });
          } else if (portTransitIn && !portTransitMid && portTransitIn !== hop.portEntree) {
            if (portTransitIn && hop.portEntree) {
              const typeF = linkType(portTransitIn, hop.portEntree);
              const jarId = await getOrCreateTransitJar(siteTransit, portTransitIn, hop.portEntree, typeF);
              jonctions.push({
                service_id: serviceId,
                ordre: ordre++,
                cable_id: jarId,
                port_entree_id: portTransitIn,
                port_sortie_id: hop.portEntree,
              });
            }
          }
        }

        jonctions.push({
          service_id: serviceId,
          ordre: ordre++,
          cable_id: hop.cableId,
          port_entree_id: hop.portEntree,
          port_sortie_id: hop.portSortie,
        });
      }

      if (jonctions.length > 0) {
        const { error: jonErr } = await addServiceJonctions(jonctions);
        if (jonErr) throw jonErr;
      }

      const portsToUpdate = [];
      jonctions.forEach(j => {
        if (j.port_entree_id) portsToUpdate.push(j.port_entree_id);
        if (j.port_sortie_id) portsToUpdate.push(j.port_sortie_id);
      });
      if (portsToUpdate.length > 0) {
        await supabase.from("ports").update({
          statut: "OCCUPE",
          cid: cid
        }).in("id", portsToUpdate);
      }

      try {
        await addHistory({
          action: `Service créé via wizard : ${cid} — ${label.trim()} (${siteA}→${siteB})`,
          entity_type: "service",
          entity_id: serviceId,
        });
      } catch (_) {}

      setSaving(false);
      onDone();

    } catch (e) {
      if (serviceId) {
        try { await supabase.from('services').delete().eq('id', serviceId); } catch (_) {}
      }
      setErr(e.message || "Erreur lors de la création du service. Veuillez réessayer.");
      setSaving(false);
    }
  };

  const renderStep = () => {
    if (step === "SELECT_SITES") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", color: TH.text2, fontSize: "11px", fontWeight: 600, marginBottom: "5px" }}>
              Label du service *
            </label>
            <Inp value={label} onChange={setLabel} placeholder="ex: Backbone RDK-HAR MTN" TH={TH} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "10px", alignItems: "end" }}>
            <div>
              <label style={{ display: "block", color: TH.green, fontSize: "11px", fontWeight: 700, marginBottom: "5px" }}>
                Site de départ (A)
              </label>
              <Sel value={siteA} onChange={v => { setSiteA(v); setErr(""); }} TH={TH}>
                <option value="">— Choisir le site source —</option>
                {(sites || []).map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                ))}
              </Sel>
            </div>
            <div style={{ color: TH.gold, fontSize: "20px", fontWeight: 700, paddingBottom: "2px", textAlign: "center" }}>
              ›
            </div>
            <div>
              <label style={{ display: "block", color: TH.cyan, fontSize: "11px", fontWeight: 700, marginBottom: "5px" }}>
                Site de destination (B)
              </label>
              <Sel value={siteB} onChange={v => { setSiteB(v); setErr(""); }} TH={TH}>
                <option value="">— Choisir le site destination —</option>
                {(sites || []).filter(s => s.id !== siteA).map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                ))}
              </Sel>
            </div>
          </div>

          {siteA && siteB && siteA !== siteB && (
            noPath ? (
              <div style={{
                background: `${TH.red}22`, border: `1px solid ${TH.red}`,
                borderRadius: "8px", padding: "10px 14px", color: TH.red, fontSize: "12px"
              }}>
                Aucun chemin physique disponible entre {siteName(siteA)} et {siteName(siteB)}.
                Vérifiez que les câbles inter-sites sont correctement configurés.
              </div>
            ) : pathSites.length > 0 && (
              <div style={{
                background: `${TH.green}11`, border: `1px solid ${TH.green}44`,
                borderRadius: "8px", padding: "10px 14px"
              }}>
                <div style={{
                  fontSize: "10px", color: TH.text3, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px"
                }}>
                  Chemin optimal ({pathSites.length - 1} liaison{pathSites.length - 1 > 1 ? 's' : ''})
                </div>
                <RoutePathDisplay
                  pathSites={pathSites}
                  activeHopIndex={-1}
                  sitesList={sites}
                  TH={TH}
                />
              </div>
            )
          )}

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "4px" }}>
            <Btn onClick={onClose} variant="ghost" TH={TH}>Annuler</Btn>
            <Btn
              onClick={onSubmitSites}
              disabled={!siteA || !siteB || pathSites.length === 0}
              TH={TH}
            >
              Continuer — Sélectionner les liaisons ›
            </Btn>
          </div>
        </div>
      );
    }

    if (step.startsWith("HOP_")) {
      const n = parseInt(step.split("_")[1], 10);
      const fromSite = pathSites[n];
      const toSite = pathSites[n + 1];
      if (!fromSite || !toSite) return null;

      const cablesDispos = getCablesBetween(fromSite, toSite);

      const getPortNumber = (portStr) => {
        if (!portStr) return 0;
        const m = portStr.match(/P(\d+)$/);
        return m ? parseInt(m[1], 10) : 0;
      };

      const handleSelectPortEntree = (portVal) => {
        const selectedCable = cablesDispos.find(c => c.portEntree === portVal);
        if (!selectedCable) return;

        if (selectedCable.portSortieObj?.statut === "OCCUPE") {
          const selNum = getPortNumber(selectedCable.portEntree);
          const freeCables = cablesDispos.filter(c => c.portSortieObj?.statut !== "OCCUPE");
          if (freeCables.length === 0) {
            setErr(`Erreur : Tous les ports de destination sur ${siteName(toSite)} sont occupés.`);
            return;
          }
          freeCables.sort((a, b) => {
            const distA = Math.abs(getPortNumber(a.portEntree) - selNum);
            const distB = Math.abs(getPortNumber(b.portEntree) - selNum);
            if (distA !== distB) return distA - distB;
            return getPortNumber(a.portEntree) - getPortNumber(b.portEntree);
          });
          const fallbackCable = freeCables[0];
          setErr(`⚠️ Le port d'arrivée correspondant (${fallbackCable.portSortie.replace('_', '-')}) est occupé. Sélection automatique du port disponible le plus proche : ${fallbackCable.portEntree.replace('_', '-')}.`);
          onSelectCable(n, fallbackCable);
        } else {
          setErr("");
          onSelectCable(n, selectedCable);
        }
      };

      const formatPortDisplay = (pid) => {
        if (!pid) return "";
        return pid.replace('_', '-');
      };

      const uniqEntreePorts = [];
      const seenEntree = new Set();
      cablesDispos.forEach(c => {
        if (!seenEntree.has(c.portEntree)) {
          seenEntree.add(c.portEntree);
          uniqEntreePorts.push(c);
        }
      });
      uniqEntreePorts.sort((a, b) => getPortNumber(a.portEntree) - getPortNumber(b.portEntree));

      const selectedHop = hops[n] || {};
      const portTransitIn = n > 0 ? (hops[n - 1]?.portSortie || null) : null;

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <RoutePathDisplay
            pathSites={pathSites}
            activeHopIndex={n}
            sitesList={sites}
            TH={TH}
          />

          {n === 0 ? (
            <div style={{
              background: TH.bgCard, border: `1px solid ${TH.border}`,
              borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "14px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                <span style={{
                  background: TH.blue, color: "#fff", borderRadius: "50%",
                  width: "24px", height: "24px", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "11px", fontWeight: 700
                }}>{n + 1}</span>
                <div>
                  <div style={{ color: TH.text1, fontSize: "13px", fontWeight: 700 }}>
                    Liaison {siteName(fromSite)} › {siteName(toSite)}
                  </div>
                  <div style={{ color: TH.text3, fontSize: "11px" }}>
                    Sélectionnez les ports pour cette liaison directe
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: "block", color: TH.text2, fontSize: "11px", fontWeight: 600, marginBottom: "5px" }}>
                  1. Port de départ (côté {siteName(fromSite)}) *
                </label>
                <Sel value={selectedHop.portEntree || ""} onChange={handleSelectPortEntree} TH={TH}>
                  <option value="">— Sélectionner le port de départ —</option>
                  {uniqEntreePorts.map(c => (
                    <option key={c.portEntree} value={c.portEntree}>
                      {formatPortDisplay(c.portEntree)}
                    </option>
                  ))}
                </Sel>
              </div>

              {selectedHop.portSortie && (
                <div>
                  <label style={{ display: "block", color: TH.text2, fontSize: "11px", fontWeight: 600, marginBottom: "5px" }}>
                    2. Port d'arrivée (côté {siteName(toSite)})
                  </label>
                  <div style={{
                    background: TH.bgInput, border: `1px solid ${TH.border}`,
                    borderRadius: "8px", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center"
                  }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: TH.text1, fontSize: "13px", fontWeight: 700 }}>
                      {formatPortDisplay(selectedHop.portSortie)}
                    </span>
                    <span style={{
                      background: `${TH.green}22`, color: TH.green, fontSize: "10px",
                      padding: "2px 8px", borderRadius: "4px", fontWeight: 700
                    }}>
                      DISPONIBLE
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              background: TH.bgCard, border: `1px solid ${TH.border}`,
              borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "14px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                <span style={{
                  background: TH.blue, color: "#fff", borderRadius: "50%",
                  width: "24px", height: "24px", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "11px", fontWeight: 700
                }}>{n + 1}</span>
                <div>
                  <div style={{ color: TH.text1, fontSize: "13px", fontWeight: 700 }}>
                    Transit via {siteName(fromSite)} › {siteName(toSite)}
                  </div>
                  <div style={{ color: TH.text3, fontSize: "11px" }}>
                    Configurez le brassage interne et la sortie sur le site de transit {siteName(fromSite)}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: "block", color: TH.text3, fontSize: "11px", fontWeight: 600, marginBottom: "5px" }}>
                  1. Port d'entrée entrant (provenant de {siteName(pathSites[n - 1])})
                </label>
                <div style={{
                  background: TH.bgInput, border: `1px solid ${portTransitIn ? TH.border : TH.red}`,
                  borderRadius: "8px", padding: "10px 14px", color: TH.text2,
                  fontFamily: "'JetBrains Mono', monospace", fontSize: "13px",
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  {portTransitIn
                    ? <span style={{ color: TH.text1, fontWeight: 700 }}>{formatPortDisplay(portTransitIn)}</span>
                    : <span style={{ color: TH.red, fontStyle: 'italic' }}>⚠ Aucun port entrant — retournez à l'étape précédente</span>}
                  {portTransitIn && (
                    <span style={{
                      background: `${TH.green}22`, color: TH.green, fontSize: "9px",
                      padding: "2px 8px", borderRadius: "4px", fontWeight: 700, flexShrink: 0
                    }}>ODF EXTERNE</span>
                  )}
                </div>
              </div>

              {portTransitIn && (() => {
                const salleIn = (transitData?.externalPorts || []).find(p => p.id === portTransitIn)?.salle_id || null;
                const salleMid = (transitData?.internalPorts || []).find(p => p.id === selectedHop.portTransitMid)?.salle_id || null;
                const salleOut = (transitData?.externalPorts || []).find(p => p.id === selectedHop.portEntree)?.salle_id || null;

                const jar1Type = 'INTERNE';
                const jar2Type = 'INTERNE';

                const typeLabel = (t) => ({ txt: 'câble interne', color: TH.orange });

                return (
                  <div style={{
                    background: `${TH.purple}12`, border: `1px solid ${TH.purple}44`,
                    borderRadius: "10px", padding: "14px 16px"
                  }}>
                    <div style={{
                      fontSize: "10px", color: TH.purple, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px",
                      display: "flex", alignItems: "center", gap: "6px"
                    }}>
                      <span>🔀</span> Connexion locale planifiée sur {siteName(fromSite)}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                        <span style={{
                          fontSize: "9px", color: TH.text3, fontWeight: 700,
                          textTransform: "uppercase", letterSpacing: "0.5px"
                        }}>Port entrant</span>
                        <div style={{
                          background: TH.bgCard, border: `1px solid ${TH.border2}`,
                          borderRadius: "6px", padding: "6px 10px",
                          fontFamily: "'JetBrains Mono', monospace", fontSize: "11px",
                          fontWeight: 700, color: TH.text1
                        }}>
                          {formatPortDisplay(portTransitIn)}
                        </div>
                        <span style={{ fontSize: "9px", color: TH.blue }}>ODF EXTERNE</span>
                        {salleIn && <span style={{ fontSize: "8px", color: TH.text3 }}>Salle {salleIn}</span>}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", flexShrink: 0 }}>
                        <span style={{ fontSize: "9px", color: typeLabel(jar1Type).color, fontWeight: 700 }}>──►</span>
                        <span style={{ fontSize: "8px", color: typeLabel(jar1Type).color, fontWeight: 600 }}>
                          {typeLabel(jar1Type).txt}
                        </span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                        <span style={{
                          fontSize: "9px", color: TH.text3, fontWeight: 700,
                          textTransform: "uppercase", letterSpacing: "0.5px"
                        }}>Port brassage</span>
                        <div style={{
                          background: selectedHop.portTransitMid
                            ? `${TH.purple}22` : `${TH.text3}11`,
                          border: `1px solid ${selectedHop.portTransitMid ? TH.purple : TH.border}`,
                          borderRadius: "6px", padding: "6px 10px",
                          fontFamily: "'JetBrains Mono', monospace", fontSize: "11px",
                          fontWeight: 700,
                          color: selectedHop.portTransitMid ? TH.purple : TH.text3,
                          minWidth: "80px", textAlign: "center"
                        }}>
                          {selectedHop.portTransitMid
                            ? formatPortDisplay(selectedHop.portTransitMid)
                            : "— à choisir —"}
                        </div>
                        <span style={{ fontSize: "9px", color: TH.purple }}>iODF (INTERNE)</span>
                        {salleMid && <span style={{ fontSize: "8px", color: TH.text3 }}>Salle {salleMid}</span>}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", flexShrink: 0 }}>
                        <span style={{ fontSize: "9px", color: typeLabel(jar2Type).color, fontWeight: 700 }}>──►</span>
                        <span style={{ fontSize: "8px", color: typeLabel(jar2Type).color, fontWeight: 600 }}>
                          {typeLabel(jar2Type).txt}
                        </span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                        <span style={{
                          fontSize: "9px", color: TH.text3, fontWeight: 700,
                          textTransform: "uppercase", letterSpacing: "0.5px"
                        }}>Port sortant</span>
                        <div style={{
                          background: selectedHop.portEntree
                            ? `${TH.cyan}15` : `${TH.text3}11`,
                          border: `1px solid ${selectedHop.portEntree ? TH.cyan : TH.border}`,
                          borderRadius: "6px", padding: "6px 10px",
                          fontFamily: "'JetBrains Mono', monospace", fontSize: "11px",
                          fontWeight: 700,
                          color: selectedHop.portEntree ? TH.cyan : TH.text3,
                          minWidth: "80px", textAlign: "center"
                        }}>
                          {selectedHop.portEntree
                            ? formatPortDisplay(selectedHop.portEntree)
                            : "— à choisir —"}
                        </div>
                        <span style={{ fontSize: "9px", color: TH.cyan }}>ODF EXTERNE → {siteName(toSite)}</span>
                        {salleOut && <span style={{ fontSize: "8px", color: TH.text3 }}>Salle {salleOut}</span>}
                      </div>
                    </div>

                    {selectedHop.portTransitMid && selectedHop.portEntree && (
                      <div style={{
                        marginTop: "10px", padding: "6px 10px",
                        background: `${TH.green}18`, borderRadius: "6px",
                        fontSize: "10px", color: TH.green, fontWeight: 600,
                        display: "flex", alignItems: "center", gap: "6px"
                      }}>
                        <span>✓</span>
                        Connexion locale complète : 2 {jar1Type === 'INTERNE' || jar2Type === 'INTERNE' ? 'câbles (FO intersalle / jarretière)' : 'jarretières'} seront créés automatiquement sur {siteName(fromSite)}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div>
                <label style={{ display: "block", color: TH.text2, fontSize: "11px", fontWeight: 600, marginBottom: "5px" }}>
                  2. Port de sortie (côté {siteName(fromSite)}) vers {siteName(toSite)} *
                </label>
                <div style={{ fontSize: "10px", color: TH.text3, marginBottom: "6px" }}>
                  Choisissez d'abord le câble de sortie — cela permettra de recommander automatiquement le bon port iODF.
                </div>
                <Sel value={selectedHop.portEntree || ""} onChange={handleSelectPortEntree} TH={TH}>
                  <option value="">— Sélectionner le port de sortie vers {siteName(toSite)} —</option>
                  {uniqEntreePorts.map(c => (
                    <option key={c.portEntree} value={c.portEntree}>
                      {formatPortDisplay(c.portEntree)}
                    </option>
                  ))}
                </Sel>
                {selectedHop.portSortie && (
                  <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "10px", color: TH.text3 }}>Arrivée côté {siteName(toSite)} :</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", fontWeight: 700, color: TH.text1 }}>
                      {formatPortDisplay(selectedHop.portSortie)}
                    </span>
                    <span style={{ background: `${TH.green}22`, color: TH.green, fontSize: "9px", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
                      DISPONIBLE
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: "block", color: TH.text2, fontSize: "11px", fontWeight: 600, marginBottom: "5px" }}>
                  3. Port de brassage interne — iODF sur {siteName(fromSite)} *
                  {selectedHop.portEntree && <span style={{ color: TH.green, marginLeft: "6px", fontSize: "10px", fontWeight: 400 }}>
                    (recommandation affinée grâce au port de sortie)
                  </span>}
                </label>

                {transitReco.length > 0 && (
                  <div style={{
                    background: `${TH.green}18`, border: `1px solid ${TH.green}55`,
                    borderRadius: "6px", padding: "8px 12px", marginBottom: "8px",
                    fontSize: "11px", color: TH.text2, display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap",
                  }}>
                    <span style={{ color: TH.green, fontWeight: 700 }}>
                      {MATCH_LABELS[transitReco[0].matchType]}
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: TH.text1 }}>
                      {formatPortDisplay(transitReco[0].portInterne.id)}
                    </span>
                    {transitReco[0].portExterneB && (
                      <span style={{ color: TH.text3 }}>
                        › jarretière › {formatPortDisplay(transitReco[0].portExterneB.id)}
                      </span>
                    )}
                    {selectedHop.portTransitMid !== transitReco[0].portInterne.id && (
                      <button
                        onClick={() => onSelectTransitMid(n, transitReco[0].portInterne.id)}
                        style={{
                          marginLeft: "auto", padding: "2px 10px", fontSize: "10px",
                          background: TH.green, color: "#fff", border: "none",
                          borderRadius: "4px", cursor: "pointer", fontWeight: 700,
                        }}
                      >
                        Appliquer
                      </button>
                    )}
                  </div>
                )}

                <Sel value={selectedHop.portTransitMid || ""} onChange={val => onSelectTransitMid(n, val)} TH={TH}>
                  <option value="">— Sélectionner le port interne (iODF) —</option>
                  {transitLoading
                    ? <option disabled value="">Chargement des ports iODF…</option>
                    : transitPorts.length === 0
                      ? <option disabled value="">Aucun port iODF disponible sur ce site</option>
                      : (() => {
                          const pNum = (id) => { const m = id.match(/P(\d+)$/); return m ? parseInt(m[1], 10) : 0; };
                          const refNum = pNum(portTransitIn || '');
                          const recoIds = transitReco.map(r => r.portInterne.id);
                          const freePorts = transitPorts.filter(p => p.statut !== 'OCCUPE' || p.id === selectedHop.portTransitMid);
                          const recoGroup = recoIds.map(id => freePorts.find(p => p.id === id)).filter(Boolean);
                          const otherGroup = freePorts
                            .filter(p => !recoIds.includes(p.id))
                            .sort((a, b) => Math.abs(pNum(a.id) - refNum) - Math.abs(pNum(b.id) - refNum));
                          const renderOpt = (p) => {
                            const entry = transitReco.find(r => r.portInterne.id === p.id);
                            const lbl = p.id;
                            const hint = entry ? ` — ${MATCH_LABELS[entry.matchType]}` : '';
                            return <option key={p.id} value={p.id} style={{ fontWeight: entry ? 700 : 400 }}>{lbl}{hint}</option>;
                          };
                          return (
                            <>
                              {recoGroup.length > 0 && <optgroup label="── Recommandés ──">{recoGroup.map(renderOpt)}</optgroup>}
                              {otherGroup.length > 0 && <optgroup label="── Autres ports iODF libres ──">{otherGroup.map(renderOpt)}</optgroup>}
                            </>
                          );
                        })()
                  }
                </Sel>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", justifyContent: "space-between", marginTop: "4px" }}>
            <Btn onClick={() => {
              setErr("");
              if (n === 0) setStep("SELECT_SITES");
              else { setStep(`HOP_${n - 1}`); setCurrentHopIdx(n - 1); }
            }} variant="ghost" TH={TH}>‹ Retour</Btn>
            <Btn
              onClick={() => onNextHop(n)}
              disabled={n === 0 ? !selectedHop.cableId : (!selectedHop.cableId || !selectedHop.portEntree || !selectedHop.portTransitMid)}
              TH={TH}
            >
              {n + 1 < totalHops ? "Suivant — Liaison suivante ›" : "Suivant — Fournisseur ›"}
            </Btn>
          </div>
        </div>
      );
    }

    if (step === "SELECT_FOURNISSEUR") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <RoutePathDisplay
            pathSites={pathSites}
            activeHopIndex={totalHops}
            sitesList={sites}
            TH={TH}
          />

          <div style={{
            background: TH.bgCard, border: `1px solid ${TH.border}`,
            borderRadius: "10px", padding: "16px"
          }}>
            <div style={{ color: TH.text1, fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>
              Fournisseur d'accès (côté {siteName(siteA)})
            </div>
            <div style={{ color: TH.text3, fontSize: "11px", marginBottom: "12px" }}>
              Sélectionnez l'opérateur qui fournit la capacité sur le câble de départ.
            </div>
            <Sel value={fournisseurId} onChange={setFournisseurId} TH={TH}>
              <option value="">— Sélectionner un fournisseur —</option>
              {(fournisseurs || []).map(f => (
                <option key={f.id} value={f.id}>{f.nom} ({f.id})</option>
              ))}
            </Sel>

            {hops[0]?.cableId && (
              (() => {
                const cable = (cables || []).find(c => c.id === hops[0].cableId);
                if (cable?.fournisseurs?.id && cable.fournisseurs.id !== fournisseurId) {
                  return (
                    <div style={{
                      marginTop: "8px", fontSize: "11px", color: TH.text3,
                      display: "flex", alignItems: "center", gap: "8px"
                    }}>
                      <span>Suggestion :</span>
                      <button
                        onClick={() => setFournisseurId(cable.fournisseurs.id)}
                        style={{
                          background: `${TH.blue}22`, border: `1px solid ${TH.blue}`,
                          borderRadius: "6px", padding: "2px 10px",
                          color: TH.blue, fontSize: "11px", fontWeight: 700, cursor: "pointer"
                        }}
                      >
                        {cable.fournisseurs.nom}
                      </button>
                      <span style={{ color: TH.text3 }}>(fournisseur du câble {cable.cable_reference})</span>
                    </div>
                  );
                }
                return null;
              })()
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "space-between" }}>
            <Btn onClick={() => {
              setErr("");
              setStep(`HOP_${totalHops - 1}`);
              setCurrentHopIdx(totalHops - 1);
            }} variant="ghost" TH={TH}>‹ Retour</Btn>
            <Btn onClick={onNextFournisseur} disabled={!fournisseurId} TH={TH}>
              Suivant — Client final ›
            </Btn>
          </div>
        </div>
      );
    }

    if (step === "SELECT_CLIENT") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <RoutePathDisplay
            pathSites={pathSites}
            activeHopIndex={totalHops}
            sitesList={sites}
            TH={TH}
          />

          <div style={{
            background: TH.bgCard, border: `1px solid ${TH.border}`,
            borderRadius: "10px", padding: "16px"
          }}>
            <div style={{ color: TH.text1, fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>
              Client final (côté {siteName(siteB)})
            </div>
            <div style={{ color: TH.text3, fontSize: "11px", marginBottom: "12px" }}>
              Sélectionnez le client qui reçoit le service à destination.
            </div>
            <Sel value={clientId} onChange={setClientId} TH={TH}>
              <option value="">— Sélectionner un client —</option>
              {(clients || []).map(c => (
                <option key={c.id} value={c.id}>{c.nom} ({c.id})</option>
              ))}
            </Sel>
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "space-between" }}>
            <Btn onClick={() => { setErr(""); setStep("SELECT_FOURNISSEUR"); }} variant="ghost" TH={TH}>
              ‹ Retour
            </Btn>
            <Btn onClick={onNextClient} disabled={!clientId} TH={TH}>
              Vérifier et confirmer ›
            </Btn>
          </div>
        </div>
      );
    }

    if (step === "CONFIRM") {
      const fournisseurNom = (fournisseurs || []).find(f => f.id === fournisseurId)?.nom || fournisseurId;
      const clientNom = (clients || []).find(c => c.id === clientId)?.nom || clientId;
      const Row = ({ label: lbl, value }) => (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "6px 0", borderBottom: `1px solid ${TH.border}`, fontSize: "12px"
        }}>
          <span style={{ color: TH.text2, fontWeight: 600 }}>{lbl}</span>
          <span style={{ color: TH.text1, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>{value}</span>
        </div>
      );

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <RoutePathDisplay
            pathSites={pathSites}
            activeHopIndex={totalHops}
            sitesList={sites}
            TH={TH}
          />

          <div style={{
            background: TH.bgCard, border: `1px solid ${TH.border}`,
            borderRadius: "10px", padding: "16px",
            display: "flex", flexDirection: "column", gap: "2px"
          }}>
            <div style={{ color: TH.text1, fontSize: "13px", fontWeight: 700, marginBottom: "10px" }}>
              Récapitulatif du service
            </div>
            <Row label="Label" value={label} />
            <Row label="Fournisseur" value={fournisseurNom} />
            <Row label="Client" value={clientNom} />
            <Row label="Route" value={pathSites.map(s => siteName(s)).join(" › ")} />
            <Row label="Liaisons" value={hops.filter(Boolean).map(h => h.cable_reference).join(" + ")} />
            {hops.filter(Boolean).map((h, i) => (
              <Row
                key={i}
                value={`${h.portEntree} › ${h.portSortie}`}
              />
            ))}
          </div>

          {hops.length > 1 && (
            <div style={{
              background: `${TH.purple}10`, border: `1px solid ${TH.purple}33`,
              borderRadius: "10px", padding: "14px 16px"
            }}>
              <div style={{
                fontSize: "10px", color: TH.purple, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px",
                display: "flex", alignItems: "center", gap: "6px"
              }}>
                <span>🔀</span> Connexions locales (jarretières) à créer
              </div>
              {hops.slice(1).map((hop, idx) => {
                const hopIdx = idx + 1;
                const siteTransit = siteName(pathSites[hopIdx]);
                const portIn = hops[hopIdx - 1]?.portSortie;
                const portMid = hop?.portTransitMid;
                const portOut = hop?.portEntree;
                if (!portIn || !portMid || !portOut) return null;
                return (
                  <div key={hopIdx} style={{
                    marginBottom: "8px", padding: "8px 10px",
                    background: TH.bgSurface, borderRadius: "8px",
                    border: `1px solid ${TH.border}`
                  }}>
                    <div style={{ fontSize: "10px", color: TH.text2, fontWeight: 700, marginBottom: "6px" }}>
                      Site de transit : {siteTransit}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px" }}>
                      <span style={{ background: `${TH.blue}22`, color: TH.blue, padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                        {portIn.replace('_', '-')}
                      </span>
                      <span style={{ color: TH.purple, fontWeight: 700 }}>─jar1─►</span>
                      <span style={{ background: `${TH.purple}22`, color: TH.purple, padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                        {portMid.replace('_', '-')}
                      </span>
                      <span style={{ color: TH.purple, fontWeight: 700 }}>─jar2─►</span>
                      <span style={{ background: `${TH.cyan}22`, color: TH.cyan, padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                        {portOut.replace('_', '-')}
                      </span>
                    </div>
                  </div>
                );
              }).filter(Boolean)}
              <div style={{ fontSize: "10px", color: TH.text3, marginTop: "4px" }}>
                Ces connexions locales seront créées automatiquement dans la base de données.
              </div>
            </div>
          )}

          <div style={{
            background: `${TH.gold}22`, border: `1px solid ${TH.gold}66`,
            borderRadius: "8px", padding: "10px 14px", fontSize: "11px", color: TH.gold
          }}>
            Câble principal : {hops[0]?.cable_reference}.
            Cette opération est irréversible via l'interface (contacter un admin pour rollback).
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "space-between" }}>
            <Btn onClick={() => { setErr(""); setStep("SELECT_CLIENT"); }} variant="ghost" TH={TH} disabled={saving}>
              ‹ Retour
            </Btn>
            <Btn onClick={onConfirm} disabled={saving} TH={TH}>
              {saving ? "Enregistrement en cours…" : "Confirmer et créer le service"}
            </Btn>
          </div>
        </div>
      );
    }

    return null;
  };

  const stepTitle = () => {
    if (step === "SELECT_SITES") return "Nouveau service — Définir la route";
    if (step.startsWith("HOP_")) {
      const n = parseInt(step.split("_")[1], 10);
      return `Étape ${n + 1}/${totalHops} — Sélection câble ${siteName(pathSites[n])} › ${siteName(pathSites[n + 1])}`;
    }
    if (step === "SELECT_FOURNISSEUR") return "Sélection du fournisseur";
    if (step === "SELECT_CLIENT") return "Sélection du client final";
    if (step === "CONFIRM") return "Confirmation avant création";
    return "Nouveau service";
  };

  return (
    <Modal title={stepTitle()} onClose={saving ? undefined : onClose} TH={TH} width="720px">
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {renderStep()}
        {err && (
          <div style={{
            background: `${TH.red}22`, border: `1px solid ${TH.red}`,
            borderRadius: "8px", padding: "8px 12px",
            color: TH.red, fontSize: "12px", marginTop: "4px"
          }}>
            {err}
          </div>
        )}
      </div>
    </Modal>
  );
}
