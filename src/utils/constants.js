export const CODE = { A: "ACTIF", I: "INTERNE", N: "INCONNU", R: "RÉSERVÉ", L: "LIBRE" };
export const REF_CAP = ["", "1G", "2.5G", "10G", "25G", "100G"];
export const REF_STATUT = ["ACTIF", "INTERNE", "INCONNU", "RÉSERVÉ", "LIBRE"];
export const REF_OWNERS = ["VF", "VF / WIOCC", "VF / WIOCC / LIQUID", "VF / WINGU", "VF / SILVER", "2AF / MTN", "2AF / VF", "2AF / AIRTEL", "2AF / WIOCC", "2AF / CMCC", "2AF / CMI", "2AF / VF / WIOCC", "2AF / VF / CTG", "MTN", "AIRTEL", "DGS", "DSI", "HORMUUD", "GOLIS", "SOMTEL", "WIOCC", "LIQUID", "SOMCABLE", "LS", "DRM"];

export const SC = {
  ACTIF: { bg: "#C6EFCE", tx: "#1A5C28", bd: "#5A9E6A", dot: "#27AE60" },
  INTERNE: { bg: "#DDEEFF", tx: "#0D47A1", bd: "#6FA8DC", dot: "#2980B9" },
  INCONNU: { bg: "#FCE4D6", tx: "#7B2000", bd: "#E06C3A", dot: "#E74C3C" },
  RÉSERVÉ: { bg: "#FFF3CC", tx: "#6B4900", bd: "#E0B84A", dot: "#F39C12" },
  LIBRE: { bg: "#F4F6F8", tx: "#AAB4BE", bd: "#DDE3EA", dot: "#BDC3C7" },
};

export const NAVY = "#0F2744";
export const BLUE = "#1565C0";
export const ACCENT = "#E8F4FD";

export const CAN_EDIT = r => ["admin", "superviseur", "technicien"].includes(r);
export const CAN_ADMIN = r => ["admin", "superviseur"].includes(r);

export const DEMO_USERS = [
  { email: "admin@demo.dj", pass: "admin123", name: "Administrateur", role: "admin" },
  { email: "tech@demo.dj", pass: "tech123", name: "Technicien", role: "technicien" },
  { email: "lecture@demo.dj", pass: "lecture123", name: "Lecture Seule", role: "lecture" },
];

export const spKey = (s, p) => `S${String(s).padStart(2, "0")}P${String(p).padStart(2, "0")}`;
export const tsNow = () => new Date().toISOString();
export const fmtDt = d => d ? new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
