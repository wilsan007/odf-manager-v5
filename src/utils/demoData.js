export const DEFAULT_SITES = [
  { id: "RDK", name: "Ras-Dika", description: "Cable Landing Station (côté Mosquée)" },
  { id: "YAC", name: "YAC", description: "Site YAC — bâtiment côté ville" },
  { id: "HAR", name: "Haramous", description: "Station Haramous (via Siesta)" },
  { id: "DDC", name: "DDC", description: "Data Center Djibouti" },
];

export const DEFAULT_RACKS = [
  { id: "RDK-R1", site_id: "RDK", name: "R1", description: "Main Management Room" },
  { id: "RDK-R2", site_id: "RDK", name: "R2", description: "Rack secondaire" },
  { id: "YAC-R1", site_id: "YAC", name: "R1", description: "Salle technique YAC" },
  { id: "HAR-R1", site_id: "HAR", name: "R1", description: "Salle technique Haramous" },
];

export const DEFAULT_ODFS = [
  {
    id: "RDK-R1-ODF1", rack_id: "RDK-R1", site_a: "RDK", site_b: "YAC", odf_type: "EXTERNE",
    route: "Ras-Dika ↔ YAC (côté Mosquée)", cable: "Câble 144 Fibres", slots: 6, ports_per_slot: 12,
    is_active: false, odf_number: null, activated_at: null
  },
  {
    id: "RDK-R1-ODF2", rack_id: "RDK-R1", site_a: "RDK", site_b: "YAC", odf_type: "EXTERNE",
    route: "Ras-Dika → YAC — IODF CIENA", cable: "CIENA Shelf", slots: 6, ports_per_slot: 12,
    is_active: false, odf_number: null, activated_at: null
  },
  {
    id: "RDK-R1-ODF3", rack_id: "RDK-R1", site_a: "RDK", site_b: "RDK", odf_type: "INTERNE",
    route: "Ras-Dika MMR ↔ ODF L2", cable: "48 Fibres", slots: 6, ports_per_slot: 12,
    is_active: false, odf_number: null, activated_at: null
  },
  {
    id: "RDK-R1-ODF4", rack_id: "RDK-R1", site_a: "RDK", site_b: "YAC", odf_type: "EXTERNE",
    route: "Ras-Dika → YAC (BACK, Mosquée)", cable: "Câble 144 Fibres", slots: 6, ports_per_slot: 12,
    is_active: false, odf_number: null, activated_at: null
  },
  {
    id: "RDK-R1-ODF5", rack_id: "RDK-R1", site_a: "RDK", site_b: "HAR", odf_type: "EXTERNE",
    route: "Ras-Dika ↔ Haramous (Siesta)", cable: "96 Fibres", slots: 6, ports_per_slot: 12,
    is_active: false, odf_number: null, activated_at: null
  },
  {
    id: "RDK-R1-ODF6", rack_id: "RDK-R1", site_a: "RDK", site_b: "YAC", odf_type: "EXTERNE",
    route: "Ras-Dika → YAC-B (BACK cable)", cable: "Câble 144 Fibres", slots: 6, ports_per_slot: 12,
    is_active: false, odf_number: null, activated_at: null
  },
  {
    id: "RDK-R1-ODF7", rack_id: "RDK-R1", site_a: "RDK", site_b: "YAC", odf_type: "EXTERNE",
    route: "Ras-Dika → YAC — Backhaul TEJAS", cable: "Backhaul TEJAS", slots: 6, ports_per_slot: 12,
    is_active: false, odf_number: null, activated_at: null
  },
  {
    id: "RDK-R1-ODF8", rack_id: "RDK-R1", site_a: "RDK", site_b: "HAR", odf_type: "EXTERNE",
    route: "Ras-Dika ↔ Haramous — CIENA 2", cable: "CIENA SHELF 2", slots: 6, ports_per_slot: 12,
    is_active: false, odf_number: null, activated_at: null
  },
];

export const RAW = { "RDK-R1-ODF1": [[1, 1, "I", "LAN 1", "", "", "", ""], [1, 2, "N", "", "", "", "", ""], [1, 3, "N", "", "", "", "", ""], [1, 4, "I", "ISP-IP/DATA", "", "", "", ""], [1, 5, "A", "DJT-22072025091210", "615", "100G", "2AF / MTN", "SEACOM"], [1, 6, "A", "DJT-18092025114423", "621", "100G", "VF / WIOCC / LIQUID", "AAE1"], [1, 7, "A", "DJT-08092025103023", "627", "100G", "VF", "SEACOM"], [1, 8, "I", "IXP-DDC 100G", "", "", "", ""], [1, 9, "N", "", "", "", "", ""], [1, 10, "N", "", "", "", "", ""], [1, 12, "A", "OT-000520", "OT-000520", "", "", ""], [2, 1, "I", "LAN 1", "", "", "", ""], [2, 3, "I", "D-MONEY 1", "", "", "", ""], [2, 4, "I", "D-MONEY 2", "", "", "", ""], [2, 5, "I", "BSS 1", "", "", "", ""], [2, 6, "I", "BSS 2", "", "", "", ""], [2, 7, "N", "", "", "", "", ""], [2, 11, "A", "DJT-05112025155228", "632", "100G", "2AF / AIRTEL", "SEACOM"], [2, 12, "I", "LAN 2", "", "", "", ""], [3, 1, "N", "", "", "", "", ""], [3, 2, "N", "", "", "", "", ""], [3, 4, "N", "", "", "", "", ""], [3, 5, "N", "", "", "", "", ""], [3, 6, "N", "", "", "", "", ""], [3, 7, "N", "", "", "", "", ""], [3, 10, "I", "IMS (DGS)", "", "", "", ""], [3, 11, "I", "IMS (DGS)", "", "", "", ""], [3, 12, "N", "", "", "", "", ""], [4, 1, "A", "DJT-16102025092520", "623", "100G", "2AF / VF", "SEACOM"], [4, 2, "I", "LINE CIENA RDK-YAC 1", "", "", "", ""], [4, 6, "I", "LINE CIENA RDK-YAC 2", "", "", "", ""], [4, 7, "A", "DJT-20052025100622", "", "", "", ""], [4, 8, "I", "SEACOM ROAMING", "", "", "", ""], [4, 9, "I", "LINE CIENA RDK-HAR 1", "", "", "", ""], [4, 10, "I", "LINE CIENA RDK-HAR 2", "", "", "", ""], [4, 12, "I", "DSSD", "", "", "", ""], [5, 1, "N", "", "", "", "", ""], [5, 3, "I", "DRM 2ETGE RDK", "", "", "", ""], [5, 5, "I", "ISP-CSM-HAR", "", "", "", ""], [5, 6, "N", "", "", "", "", ""], [5, 7, "N", "", "", "", "", ""], [5, 8, "I", "DMZ 3 DGS", "", "", "", ""], [5, 10, "I", "LINE TEJAS RDK", "", "", "", ""], [5, 12, "I", "ADSL FIREWALL", "", "", "", ""], [6, 1, "I", "DGS", "", "", "", ""], [6, 2, "I", "DGS", "", "", "", ""], [6, 3, "I", "DGS", "", "", "", ""], [6, 4, "I", "DGS", "", "", "", ""], [6, 5, "I", "COGENT 1", "", "", "", ""], [6, 6, "I", "COGENT 2", "", "", "", ""], [6, 7, "I", "COLT", "", "", "", ""], [6, 12, "I", "DCN (WIOCC)", "", "", "", ""]], "RDK-R1-ODF2": [[1, 1, "A", "DJT-03122024085532", "554", "100G", "VF / WIOCC", "DDC"], [1, 2, "A", "DJT-05112025155741", "633", "100G", "2AF / AIRTEL", "SEACOM"], [1, 3, "A", "DJT-06032025104529", "529", "100G", "VF / WINGU", "WINGU"], [1, 4, "A", "DJT-27022025100033", "530", "100G", "VF / WINGU", "WINGU"], [1, 5, "A", "DJT-03122024092607", "531", "100G", "VF / WIOCC", "DDC"], [1, 6, "A", "FJT-29022024114509", "430", "100G", "VF / WIOCC", ""], [1, 7, "A", "DJT-09072024172147", "424", "100G", "VF", "WINGU"], [1, 8, "A", "DJT-09072024172628", "425", "100G", "VF", "WINGU"], [1, 10, "A", "DJT-21112024112430", "483", "10G", "VF / SILVER", ""], [1, 12, "A", "DJT-03122024092024", "520", "100G", "VF / WIOCC", "DDC"], [2, 1, "A", "DJT-20082024092642", "433", "10G", "VF / SILVER", "DDC"], [2, 2, "A", "DJT-20082024092952", "434", "10G", "VF / SILVER", "DDC"], [2, 3, "I", "MULTIVISION-TO7", "", "10G", "DGS", "DDC"], [2, 4, "A", "DJT-10112024164855", "475", "10G", "VF", "WINGU"], [2, 5, "A", "DJT-10112024165053", "476", "10G", "VF", "WINGU"], [2, 6, "A", "DJT-10112024165344", "477", "10G", "VF", "WINGU"], [2, 7, "A", "DJT-15012025153824", "536", "10G", "AIRTEL", "EIG"], [3, 1, "A", "DJT-28012025145313", "541", "10G", "MTN", "DDC"], [3, 2, "A", "DJT-19052025144325", "583", "10G", "MTN", "DDC"], [3, 3, "I", "BRINGCOM 2.5G", "", "", "", "DARE-1"]], "RDK-R1-ODF8": [[1, 1, "A", "DJT-03033035101141", "OT-000565", "100G", "2AF / VF / WIOCC", "DDC"], [1, 2, "A", "DJT-22052025122110", "OT-000563", "100G", "2AF / MTN", ""], [1, 3, "A", "DJT-22072025090632", "OT-000586", "", "2AF / MTN", ""], [1, 4, "A", "DJT-12012023143045", "OT-000552", "", "2AF / CMCC", ""], [1, 5, "A", "OT-000679", "OT-000679", "", "2AF / WIOCC", ""], [1, 6, "A", "OT-000680", "OT-000680", "", "2AF / WIOCC", ""], [1, 7, "A", "OT-000681", "OT-000681", "", "2AF / WIOCC", ""], [1, 8, "A", "OT-000682", "OT-000682", "", "2AF / WIOCC", ""], [1, 12, "A", "DJT-03033035101341", "OT-000593", "", "2AF / VF / WIOCC", ""], [2, 1, "A", "DJT-03082025150002", "OT-000594", "", "2AF / VF / CTG", ""], [2, 4, "A", "DJT-11112025085042", "OT-000639", "", "2AF / CMI", ""], [2, 5, "A", "DJT-22012026090237", "OT-000683", "", "2AF / WIOCC", ""], [2, 6, "A", "DJT-10022026013546", "OT-000715", "", "2AF / MTN", ""], [2, 7, "A", "DJT-14042026135807", "OT-000717", "", "2AF / CMI", ""], [2, 8, "A", "DJT-14042026140240", "OT-000718", "", "2AF / CCMC", ""]] };
