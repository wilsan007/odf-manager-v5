-- =====================================================================
-- FO Manager — Version corrigée (PostgreSQL) — script autonome
-- Hiérarchie : Sites -> Salles -> Racks -> ODFs -> Cassettes -> Ports
-- =====================================================================

DROP FUNCTION IF EXISTS auto_set_port_occupe() CASCADE;
DROP VIEW  IF EXISTS Vue_Interconnexions;
DROP TABLE IF EXISTS Cables_Fibre CASCADE;
DROP TABLE IF EXISTS Ports        CASCADE;
DROP TABLE IF EXISTS Cassettes    CASCADE;
DROP TABLE IF EXISTS Odfs         CASCADE;
DROP TABLE IF EXISTS Racks        CASCADE;
DROP TABLE IF EXISTS Salles       CASCADE;
DROP TABLE IF EXISTS Sites        CASCADE;

CREATE TABLE Sites (
    Site_Id  INTEGER PRIMARY KEY,
    Site_Nom VARCHAR(50) NOT NULL
);
INSERT INTO Sites (Site_Id, Site_Nom) VALUES
  (1, 'SiteA'), (2, 'SiteB'), (3, 'SiteC'), (4, 'SiteD');

CREATE TABLE Salles (
    Salle_Id  SERIAL PRIMARY KEY,
    Salle_Nom VARCHAR(50) NOT NULL,
    Site_Nom  VARCHAR(50) NOT NULL
);
INSERT INTO Salles (Salle_Nom, Site_Nom)
WITH RECURSIVE GenerateurSalles AS (
    SELECT 1 AS Numero_Salle, Site_Nom FROM Sites
    UNION ALL
    SELECT Numero_Salle + 1, Site_Nom FROM GenerateurSalles WHERE Numero_Salle < 2
)
SELECT 'Salle_' || Numero_Salle, Site_Nom
FROM GenerateurSalles ORDER BY Site_Nom, Numero_Salle;

CREATE TABLE Racks (
    Rack_Id   SERIAL PRIMARY KEY,
    Site_Nom  VARCHAR(50),
    Salle_Nom VARCHAR(50),
    Rack_Nom  VARCHAR(50) NOT NULL
);
INSERT INTO Racks (Site_Nom, Salle_Nom, Rack_Nom)
WITH RECURSIVE GenerateurRacks AS (
    SELECT 1 AS Numero_Rack, Salle_Nom, Site_Nom FROM Salles
    UNION ALL
    SELECT Numero_Rack + 1, Salle_Nom, Site_Nom FROM GenerateurRacks WHERE Numero_Rack < 2
)
SELECT Site_Nom, Salle_Nom, 'Rack_' || Numero_Rack
FROM GenerateurRacks ORDER BY Site_Nom, Salle_Nom, Numero_Rack;

CREATE TABLE Odfs (
    Odf_Id  SERIAL PRIMARY KEY,
    Rack_Id INTEGER NOT NULL REFERENCES Racks(Rack_Id),
    Odf_Nom VARCHAR(50) NOT NULL
);
INSERT INTO Odfs (Rack_Id, Odf_Nom)
WITH RECURSIVE GenerateurOdfs AS (
    SELECT 1 AS Numero_Odf, Rack_Id FROM Racks
    UNION ALL
    SELECT Numero_Odf + 1, Rack_Id FROM GenerateurOdfs WHERE Numero_Odf < 2
)
SELECT Rack_Id, 'ODF_' || Numero_Odf
FROM GenerateurOdfs ORDER BY Rack_Id, Numero_Odf;

CREATE TABLE Cassettes (
    Cassette_Id  SERIAL PRIMARY KEY,
    Odf_Id       INTEGER NOT NULL REFERENCES Odfs(Odf_Id),
    Cassette_Nom VARCHAR(50) NOT NULL
);
INSERT INTO Cassettes (Odf_Id, Cassette_Nom)
WITH RECURSIVE GenerateurCassettes AS (
    SELECT 1 AS Numero_Cassette, Odf_Id FROM Odfs
    UNION ALL
    SELECT Numero_Cassette + 1, Odf_Id FROM GenerateurCassettes WHERE Numero_Cassette < 4
)
SELECT Odf_Id, 'Cassette_' || Numero_Cassette
FROM GenerateurCassettes ORDER BY Odf_Id, Numero_Cassette;

CREATE TABLE Ports (
    Port_Id     SERIAL PRIMARY KEY,
    Cassette_Id INTEGER NOT NULL REFERENCES Cassettes(Cassette_Id),
    Port_Nom    VARCHAR(50) NOT NULL,
    Port_Statut VARCHAR(10) DEFAULT 'Libre',
    CONSTRAINT CHK_Port_Statut CHECK (Port_Statut IN ('Libre', 'Occupe', 'Mauvais'))
);
INSERT INTO Ports (Cassette_Id, Port_Nom)
WITH RECURSIVE GenerateurPorts AS (
    SELECT 1 AS Numero_Port, Cassette_Id FROM Cassettes
    UNION ALL
    SELECT Numero_Port + 1, Cassette_Id FROM GenerateurPorts WHERE Numero_Port < 6
)
SELECT Cassette_Id, 'Port_' || Numero_Port
FROM GenerateurPorts ORDER BY Cassette_Id, Numero_Port;

CREATE TABLE Cables_Fibre (
    Cable_Id        SERIAL PRIMARY KEY,
    Cable_Reference VARCHAR(50) UNIQUE NOT NULL,
    Port_Source_Id  INTEGER NOT NULL REFERENCES Ports(Port_Id),
    Port_Dest_Id    INTEGER NOT NULL REFERENCES Ports(Port_Id),
    Type_Fibre      VARCHAR(20) DEFAULT 'Monomode',
    CONSTRAINT CHK_Pas_Auto_Connexion CHECK (Port_Source_Id <> Port_Dest_Id),
    CONSTRAINT UNQ_Port_Source UNIQUE (Port_Source_Id),
    CONSTRAINT UNQ_Port_Dest   UNIQUE (Port_Dest_Id)
);

CREATE OR REPLACE FUNCTION auto_set_port_occupe()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE Ports SET Port_Statut = 'Occupe'
    WHERE Port_Id IN (NEW.Port_Source_Id, NEW.Port_Dest_Id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER TRG_Cables_Fibre_Insert
    AFTER INSERT ON Cables_Fibre
    FOR EACH ROW EXECUTE FUNCTION auto_set_port_occupe();

CREATE VIEW Vue_Interconnexions AS
SELECT
    c.Cable_Reference,
    c.Type_Fibre,
    src_r.Site_Nom || '/' || src_r.Salle_Nom || '/' || src_r.Rack_Nom || '/' ||
    src_o.Odf_Nom  || '/' || src_cas.Cassette_Nom || '/' || src_p.Port_Nom AS Chemin_Source,
    '->' AS Liaison,
    dst_r.Site_Nom || '/' || dst_r.Salle_Nom || '/' || dst_r.Rack_Nom || '/' ||
    dst_o.Odf_Nom  || '/' || dst_cas.Cassette_Nom || '/' || dst_p.Port_Nom AS Chemin_Destination
FROM Cables_Fibre c
JOIN Ports     src_p   ON c.Port_Source_Id = src_p.Port_Id
JOIN Cassettes src_cas ON src_p.Cassette_Id = src_cas.Cassette_Id
JOIN Odfs      src_o   ON src_cas.Odf_Id    = src_o.Odf_Id
JOIN Racks     src_r   ON src_o.Rack_Id     = src_r.Rack_Id
JOIN Ports     dst_p   ON c.Port_Dest_Id   = dst_p.Port_Id
JOIN Cassettes dst_cas ON dst_p.Cassette_Id = dst_cas.Cassette_Id
JOIN Odfs      dst_o   ON dst_cas.Odf_Id    = dst_o.Odf_Id
JOIN Racks     dst_r   ON dst_o.Rack_Id     = dst_r.Rack_Id;

-- Brassage automatique des 24 ports (SiteA ODF_1 -> SiteB ODF_5)
INSERT INTO Cables_Fibre (Cable_Reference, Port_Source_Id, Port_Dest_Id)
WITH RECURSIVE IterateurBrassage AS (
    SELECT 1 AS Rang, 1 AS Id_Port_A, 193 AS Id_Port_B
    UNION ALL
    SELECT Rang + 1, Id_Port_A + 1, Id_Port_B + 1
    FROM IterateurBrassage WHERE Rang < 24
)
SELECT 'FIBRE-INTER-A-B-F' || to_char(Rang, 'FM00'), Id_Port_A, Id_Port_B
FROM IterateurBrassage;

SELECT * FROM Vue_Interconnexions;
