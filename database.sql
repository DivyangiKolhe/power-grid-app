-- ============================================================
-- POWER GRID DEMO DATABASE
-- City: Varanasi | Feeders: 10 (UP Adjoining States)
-- ============================================================

CREATE DATABASE IF NOT EXISTS power_grid_demo;
USE power_grid_demo;

-- ============================================================
-- TABLE 1: FEEDERS
-- ============================================================
DROP TABLE IF EXISTS feeder_trf_links;
DROP TABLE IF EXISTS trf_trf_links;
DROP TABLE IF EXISTS transformers;
DROP TABLE IF EXISTS feeders;

CREATE TABLE feeders (
  feeder_id     VARCHAR(10)   PRIMARY KEY,
  feeder_name   VARCHAR(100)  NOT NULL,
  state         VARCHAR(50),
  city          VARCHAR(50),
  lat           DECIMAL(9,6)  NOT NULL,
  lng           DECIMAL(9,6)  NOT NULL,
  capacity_mw   DECIMAL(10,2),
  feeder_type   ENUM('Thermal','Hydro','Gas','Nuclear') NOT NULL,
  status        ENUM('Active','Inactive','Fault') DEFAULT 'Active',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE 2: TRANSFORMERS (L1, L2, SM all in one table)
-- ============================================================
CREATE TABLE transformers (
  trf_id        VARCHAR(10)   PRIMARY KEY,
  trf_name      VARCHAR(100)  NOT NULL,
  city          VARCHAR(50),
  lat           DECIMAL(9,6)  NOT NULL,
  lng           DECIMAL(9,6)  NOT NULL,
  capacity_kva  DECIMAL(10,2),
  voltage       ENUM('66/33','33/11','11/.22') NOT NULL,
  trf_type      ENUM('L1','L2','SM') NOT NULL,
  status        ENUM('Active','Inactive','Fault') DEFAULT 'Active',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE 3: FEEDER → TRANSFORMER LINKS
-- ============================================================
CREATE TABLE feeder_trf_links (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  feeder_id     VARCHAR(10) NOT NULL,
  trf_id        VARCHAR(10) NOT NULL,
  is_primary    BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (feeder_id) REFERENCES feeders(feeder_id),
  FOREIGN KEY (trf_id)    REFERENCES transformers(trf_id)
);

-- ============================================================
-- TABLE 4: TRANSFORMER ↔ TRANSFORMER LINKS
-- (L1→L2, L2→SM, L1↔L1 peer)
-- ============================================================
CREATE TABLE trf_trf_links (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  source_trf_id   VARCHAR(10) NOT NULL,
  target_trf_id   VARCHAR(10) NOT NULL,
  link_type       ENUM('upstream','peer') NOT NULL,
  is_primary      BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_trf_id) REFERENCES transformers(trf_id),
  FOREIGN KEY (target_trf_id) REFERENCES transformers(trf_id)
);

-- ============================================================
-- SEED DATA: 10 FEEDERS
-- States adjoining UP: Uttarakhand, HP, Haryana, Rajasthan,
-- MP, Chhattisgarh, Jharkhand, Bihar + UP itself
-- ============================================================
INSERT INTO feeders VALUES
('F001','Tehri Hydro Dam',        'Uttarakhand',     'Tehri',        30.3784, 78.4800, 1000.00, 'Hydro',    'Active', NOW()),
('F002','Singrauli Thermal',      'Madhya Pradesh',  'Singrauli',    24.1997, 82.6690, 1200.00, 'Thermal',  'Active', NOW()),
('F003','Narora Nuclear Plant',   'Uttar Pradesh',   'Bulandshahr',  28.1900, 78.3900,  440.00, 'Nuclear',  'Active', NOW()),
('F004','Obra Thermal Station',   'Uttar Pradesh',   'Sonbhadra',    24.4500, 83.0667,  750.00, 'Thermal',  'Active', NOW()),
('F005','Rihand Hydro Dam',       'Uttar Pradesh',   'Sonbhadra',    24.2167, 83.0167,  500.00, 'Hydro',    'Active', NOW()),
('F006','Barauni Thermal',        'Bihar',           'Begusarai',    25.4600, 86.0700,  600.00, 'Thermal',  'Active', NOW()),
('F007','Bokaro Gas Plant',       'Jharkhand',       'Bokaro',       23.6693, 85.9644,  400.00, 'Gas',      'Active', NOW()),
('F008','Panki Thermal Kanpur',   'Uttar Pradesh',   'Kanpur',       26.4800, 80.3300,  800.00, 'Thermal',  'Active', NOW()),
('F009','Yamuna Hydro Station',   'Uttarakhand',     'Dehradun',     30.3165, 78.0322,  250.00, 'Hydro',    'Active', NOW()),
('F010','Dadri Gas Plant',        'Uttar Pradesh',   'Gautam Nagar', 28.5800, 77.5500,  700.00, 'Gas',      'Active', NOW());

-- ============================================================
-- SEED DATA: 6 L1 TRANSFORMERS (66/33 kV)
-- Outside Varanasi — large substations 10-20km from city
-- Rules:
--   T001, T002, T003, T004 → 2 feeders each
--   T005, T006             → 3 feeders each
--   T001 ↔ T002            → peer share power
-- ============================================================
INSERT INTO transformers VALUES
('T001','Varanasi North Grid Sub', 'Varanasi', 25.4300, 82.9500, 50000.00, '66/33', 'L1', 'Active', NOW()),
('T002','Varanasi South Grid Sub', 'Varanasi', 25.2000, 82.9800, 50000.00, '66/33', 'L1', 'Active', NOW()),
('T003','Varanasi East Grid Sub',  'Varanasi', 25.3300, 83.1200, 40000.00, '66/33', 'L1', 'Active', NOW()),
('T004','Varanasi West Grid Sub',  'Varanasi', 25.3100, 82.8200, 40000.00, '66/33', 'L1', 'Active', NOW()),
('T005','Sarnath Main Grid Sub',   'Varanasi', 25.4000, 83.0500, 35000.00, '66/33', 'L1', 'Active', NOW()),
('T006','Ramnagar Main Grid Sub',  'Varanasi', 25.2500, 83.0500, 35000.00, '66/33', 'L1', 'Active', NOW());

-- ============================================================
-- SEED DATA: 20 L2 TRANSFORMERS (33/11 kV)
-- Inside Varanasi city — medium substations in neighborhoods
-- Rules:
--   T007-T021 (15 transformers) → 1 L1 source only
--   T022-T026 (5 transformers)  → 2 L1 sources (backup optional)
-- ============================================================
INSERT INTO transformers VALUES
-- 15 single source L2
('T007','Godowlia Sub',       'Varanasi', 25.3094, 82.9992, 5000.00, '33/11', 'L2', 'Active', NOW()),
('T008','Lanka BHU Sub',      'Varanasi', 25.2677, 82.9913, 5000.00, '33/11', 'L2', 'Active', NOW()),
('T009','Sigra Sub',          'Varanasi', 25.3250, 82.9750, 4000.00, '33/11', 'L2', 'Active', NOW()),
('T010','Cantt Sub',          'Varanasi', 25.3400, 82.9580, 4000.00, '33/11', 'L2', 'Active', NOW()),
('T011','Bhelupur Sub',       'Varanasi', 25.2950, 82.9850, 3500.00, '33/11', 'L2', 'Active', NOW()),
('T012','Sunderpur Sub',      'Varanasi', 25.3500, 82.9400, 3500.00, '33/11', 'L2', 'Active', NOW()),
('T013','Shivpur Sub',        'Varanasi', 25.3650, 82.9200, 3000.00, '33/11', 'L2', 'Active', NOW()),
('T014','Pahadia Sub',        'Varanasi', 25.3750, 82.9600, 3000.00, '33/11', 'L2', 'Active', NOW()),
('T015','Mahmoorganj Sub',    'Varanasi', 25.3000, 82.9650, 3000.00, '33/11', 'L2', 'Active', NOW()),
('T016','Orderly Bazar Sub',  'Varanasi', 25.3250, 82.9880, 2500.00, '33/11', 'L2', 'Active', NOW()),
('T017','Maldahiya Sub',      'Varanasi', 25.3150, 82.9700, 2500.00, '33/11', 'L2', 'Active', NOW()),
('T018','Jaitpura Sub',       'Varanasi', 25.2850, 83.0050, 2500.00, '33/11', 'L2', 'Active', NOW()),
('T019','Nagwa Sub',          'Varanasi', 25.2750, 82.9950, 2000.00, '33/11', 'L2', 'Active', NOW()),
('T020','Manduadih Sub',      'Varanasi', 25.3050, 83.0150, 2000.00, '33/11', 'L2', 'Active', NOW()),
('T021','Sarnath Local Sub',  'Varanasi', 25.3810, 83.0250, 2000.00, '33/11', 'L2', 'Active', NOW()),
-- 5 dual source L2 (primary + optional backup)
('T022','Babatpur Sub',       'Varanasi', 25.4400, 82.8600, 2000.00, '33/11', 'L2', 'Active', NOW()),
('T023','Chaukaghat Sub',     'Varanasi', 25.3100, 83.0050, 1500.00, '33/11', 'L2', 'Active', NOW()),
('T024','Assi Ghat Sub',      'Varanasi', 25.2800, 82.9980, 1500.00, '33/11', 'L2', 'Active', NOW()),
('T025','Dashashwamedh Sub',  'Varanasi', 25.3080, 83.0100, 1500.00, '33/11', 'L2', 'Active', NOW()),
('T026','Rohania Sub',        'Varanasi', 25.3900, 83.0400, 1500.00, '33/11', 'L2', 'Active', NOW());

-- ============================================================
-- SEED DATA: 50 SMART METERS (11/.22 kV)
-- At consumer/street level — smallest transformers
-- Rule: Each SM has exactly 1 L2 source
-- ============================================================
INSERT INTO transformers VALUES
('SM001','Godowlia SM-1',      'Varanasi', 25.3090, 82.9990, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM002','Godowlia SM-2',      'Varanasi', 25.3098, 83.0000, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM003','Godowlia SM-3',      'Varanasi', 25.3102, 83.0005, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM004','Lanka SM-1',         'Varanasi', 25.2670, 82.9910, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM005','Lanka SM-2',         'Varanasi', 25.2685, 82.9920, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM006','Lanka SM-3',         'Varanasi', 25.2690, 82.9930, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM007','Sigra SM-1',         'Varanasi', 25.3195, 82.9748, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM008','Sigra SM-2',         'Varanasi', 25.3205, 82.9760, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM009','Cantt SM-1',         'Varanasi', 25.3345, 82.9575, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM010','Cantt SM-2',         'Varanasi', 25.3360, 82.9590, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM011','Bhelupur SM-1',      'Varanasi', 25.2945, 82.9845, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM012','Bhelupur SM-2',      'Varanasi', 25.2955, 82.9855, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM013','Sunderpur SM-1',     'Varanasi', 25.3445, 82.9395, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM014','Sunderpur SM-2',     'Varanasi', 25.3455, 82.9410, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM015','Shivpur SM-1',       'Varanasi', 25.3595, 82.9195, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM016','Shivpur SM-2',       'Varanasi', 25.3605, 82.9210, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM017','Pahadia SM-1',       'Varanasi', 25.3695, 82.9595, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM018','Pahadia SM-2',       'Varanasi', 25.3705, 82.9610, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM019','Mahmoorganj SM-1',   'Varanasi', 25.2995, 82.9645, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM020','Mahmoorganj SM-2',   'Varanasi', 25.3005, 82.9655, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM021','Orderly SM-1',       'Varanasi', 25.3245, 82.9875, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM022','Orderly SM-2',       'Varanasi', 25.3255, 82.9885, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM023','Maldahiya SM-1',     'Varanasi', 25.3145, 82.9695, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM024','Maldahiya SM-2',     'Varanasi', 25.3155, 82.9705, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM025','Jaitpura SM-1',      'Varanasi', 25.2845, 83.0045, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM026','Jaitpura SM-2',      'Varanasi', 25.2855, 83.0055, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM027','Nagwa SM-1',         'Varanasi', 25.2745, 82.9945, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM028','Nagwa SM-2',         'Varanasi', 25.2755, 82.9955, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM029','Nagwa SM-3',         'Varanasi', 25.2760, 82.9960, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM030','Manduadih SM-1',     'Varanasi', 25.3045, 83.0145, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM031','Manduadih SM-2',     'Varanasi', 25.3055, 83.0155, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM032','Sarnath SM-1',       'Varanasi', 25.3805, 83.0245, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM033','Sarnath SM-2',       'Varanasi', 25.3815, 83.0255, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM034','Babatpur SM-1',      'Varanasi', 25.4395, 82.8595, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM035','Babatpur SM-2',      'Varanasi', 25.4405, 82.8605, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM036','Babatpur SM-3',      'Varanasi', 25.4410, 82.8615, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM037','Chaukaghat SM-1',    'Varanasi', 25.3095, 83.0045, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM038','Chaukaghat SM-2',    'Varanasi', 25.3105, 83.0055, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM039','Assi Ghat SM-1',     'Varanasi', 25.2795, 82.9975, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM040','Assi Ghat SM-2',     'Varanasi', 25.2805, 82.9985, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM041','Assi Ghat SM-3',     'Varanasi', 25.2810, 82.9990, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM042','Dashashwamedh SM-1', 'Varanasi', 25.3075, 83.0095, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM043','Dashashwamedh SM-2', 'Varanasi', 25.3085, 83.0105, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM044','Dashashwamedh SM-3', 'Varanasi', 25.3090, 83.0110, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM045','Rohania SM-1',       'Varanasi', 25.3895, 83.0395, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM046','Rohania SM-2',       'Varanasi', 25.3905, 83.0405, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM047','Rohania SM-3',       'Varanasi', 25.3910, 83.0410, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM048','Cantt SM-3',         'Varanasi', 25.3370, 82.9600, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM049','Bhelupur SM-3',      'Varanasi', 25.2960, 82.9860, 100.00, '11/.22', 'SM', 'Active', NOW()),
('SM050','Mahmoorganj SM-3',   'Varanasi', 25.3010, 82.9660, 100.00, '11/.22', 'SM', 'Active', NOW());

-- ============================================================
-- LINKS: FEEDER → L1 TRANSFORMER
-- T001,T002,T003,T004 = 2 feeders each
-- T005,T006           = 3 feeders each
-- ============================================================
INSERT INTO feeder_trf_links (feeder_id, trf_id, is_primary) VALUES
-- T001: F001 primary, F002 backup
('F001','T001', TRUE),  ('F002','T001', FALSE),
-- T002: F003 primary, F004 backup
('F003','T002', TRUE),  ('F004','T002', FALSE),
-- T003: F005 primary, F006 backup
('F005','T003', TRUE),  ('F006','T003', FALSE),
-- T004: F007 primary, F008 backup
('F007','T004', TRUE),  ('F008','T004', FALSE),
-- T005: F001 primary, F009 backup, F010 third
('F001','T005', TRUE),  ('F009','T005', FALSE), ('F010','T005', FALSE),
-- T006: F002 primary, F004 backup, F005 third
('F002','T006', TRUE),  ('F004','T006', FALSE), ('F005','T006', FALSE);

-- ============================================================
-- LINKS: L1 ↔ L1 PEER (T001 ↔ T002 can share power)
-- ============================================================
INSERT INTO trf_trf_links (source_trf_id, target_trf_id, link_type, is_primary) VALUES
('T001','T002','peer', TRUE),
('T002','T001','peer', TRUE);

-- ============================================================
-- LINKS: L1 → L2
-- Single source (15): each has 1 L1
-- Dual source  (5):  T022-T026 have primary + optional backup
-- ============================================================
INSERT INTO trf_trf_links (source_trf_id, target_trf_id, link_type, is_primary) VALUES
-- T001 feeds
('T001','T007','upstream', TRUE),
('T001','T009','upstream', TRUE),
('T001','T010','upstream', TRUE),
('T001','T012','upstream', TRUE),
('T001','T013','upstream', TRUE),
-- T002 feeds
('T002','T008','upstream', TRUE),
('T002','T011','upstream', TRUE),
('T002','T019','upstream', TRUE),
-- T003 feeds
('T003','T016','upstream', TRUE),
('T003','T017','upstream', TRUE),
('T003','T020','upstream', TRUE),
-- T004 feeds
('T004','T014','upstream', TRUE),
('T004','T015','upstream', TRUE),
-- T005 feeds
('T005','T021','upstream', TRUE),
-- T006 feeds
('T006','T018','upstream', TRUE),
-- DUAL SOURCE L2 — primary + optional backup
('T001','T022','upstream', TRUE),  ('T004','T022','upstream', FALSE),
('T002','T023','upstream', TRUE),  ('T003','T023','upstream', FALSE),
('T002','T024','upstream', TRUE),  ('T006','T024','upstream', FALSE),
('T003','T025','upstream', TRUE),  ('T001','T025','upstream', FALSE),
('T005','T026','upstream', TRUE),  ('T006','T026','upstream', FALSE);

-- ============================================================
-- LINKS: L2 → SMART METERS
-- Each SM has exactly 1 L2 parent
-- ============================================================
INSERT INTO trf_trf_links (source_trf_id, target_trf_id, link_type, is_primary) VALUES
-- T007 Godowlia → SM001, SM002, SM003
('T007','SM001','upstream',TRUE),('T007','SM002','upstream',TRUE),('T007','SM003','upstream',TRUE),
-- T008 Lanka    → SM004, SM005, SM006
('T008','SM004','upstream',TRUE),('T008','SM005','upstream',TRUE),('T008','SM006','upstream',TRUE),
-- T009 Sigra    → SM007, SM008
('T009','SM007','upstream',TRUE),('T009','SM008','upstream',TRUE),
-- T010 Cantt    → SM009, SM010, SM048
('T010','SM009','upstream',TRUE),('T010','SM010','upstream',TRUE),('T010','SM048','upstream',TRUE),
-- T011 Bhelupur → SM011, SM012, SM049
('T011','SM011','upstream',TRUE),('T011','SM012','upstream',TRUE),('T011','SM049','upstream',TRUE),
-- T012 Sunderpur→ SM013, SM014
('T012','SM013','upstream',TRUE),('T012','SM014','upstream',TRUE),
-- T013 Shivpur  → SM015, SM016
('T013','SM015','upstream',TRUE),('T013','SM016','upstream',TRUE),
-- T014 Pahadia  → SM017, SM018
('T014','SM017','upstream',TRUE),('T014','SM018','upstream',TRUE),
-- T015 Mahmoorg → SM019, SM020, SM050
('T015','SM019','upstream',TRUE),('T015','SM020','upstream',TRUE),('T015','SM050','upstream',TRUE),
-- T016 Orderly  → SM021, SM022
('T016','SM021','upstream',TRUE),('T016','SM022','upstream',TRUE),
-- T017 Maldahiya→ SM023, SM024
('T017','SM023','upstream',TRUE),('T017','SM024','upstream',TRUE),
-- T018 Jaitpura → SM025, SM026
('T018','SM025','upstream',TRUE),('T018','SM026','upstream',TRUE),
-- T019 Nagwa    → SM027, SM028, SM029
('T019','SM027','upstream',TRUE),('T019','SM028','upstream',TRUE),('T019','SM029','upstream',TRUE),
-- T020 Manduadih→ SM030, SM031
('T020','SM030','upstream',TRUE),('T020','SM031','upstream',TRUE),
-- T021 Sarnath  → SM032, SM033
('T021','SM032','upstream',TRUE),('T021','SM033','upstream',TRUE),
-- T022 Babatpur → SM034, SM035, SM036
('T022','SM034','upstream',TRUE),('T022','SM035','upstream',TRUE),('T022','SM036','upstream',TRUE),
-- T023 Chaukaghat→ SM037, SM038
('T023','SM037','upstream',TRUE),('T023','SM038','upstream',TRUE),
-- T024 Assi Ghat→ SM039, SM040, SM041
('T024','SM039','upstream',TRUE),('T024','SM040','upstream',TRUE),('T024','SM041','upstream',TRUE),
-- T025 Dashaswa → SM042, SM043, SM044
('T025','SM042','upstream',TRUE),('T025','SM043','upstream',TRUE),('T025','SM044','upstream',TRUE),
-- T026 Rohania  → SM045, SM046, SM047
('T026','SM045','upstream',TRUE),('T026','SM046','upstream',TRUE),('T026','SM047','upstream',TRUE);

-- ============================================================
-- VERIFY COUNTS
-- ============================================================
SELECT 'Feeders'      AS type, COUNT(*) AS count FROM feeders
UNION ALL
SELECT 'L1 Trans',    COUNT(*) FROM transformers WHERE trf_type='L1'
UNION ALL
SELECT 'L2 Trans',    COUNT(*) FROM transformers WHERE trf_type='L2'
UNION ALL
SELECT 'Smart Meters',COUNT(*) FROM transformers WHERE trf_type='SM'
UNION ALL
SELECT 'Feeder Links',COUNT(*) FROM feeder_trf_links
UNION ALL
SELECT 'Trf Links',   COUNT(*) FROM trf_trf_links;
