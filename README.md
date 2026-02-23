# ⚡ Power Grid Distribution Management System

## Project Structure
```
power-grid-app/
├── database.sql          ← Run this on VM MySQL
├── backend/              ← Node.js + Express API
│   ├── package.json
│   ├── .env.example      ← Copy to .env and fill VM IP
│   └── src/
│       ├── index.js      ← Main server
│       ├── config/db.js  ← MySQL connection
│       └── routes/
│           ├── feeders.js
│           └── transformers.js
└── frontend/             ← React + Vite app
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx       ← Sidebar + routing
        └── pages/
            ├── FeederMaster.jsx       ← Screen 1
            └── TransformerMaster.jsx  ← Screen 2
```

---

## STEP 1 — Setup VM (MySQL Server)

```bash
# On your VM
sudo apt update && sudo apt upgrade -y
sudo apt install mysql-server -y
sudo systemctl start mysql
sudo systemctl enable mysql
sudo mysql_secure_installation

# Allow remote access
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
# Change: bind-address = 127.0.0.1
# To:     bind-address = 0.0.0.0
sudo systemctl restart mysql

# Create DB user for your laptop
sudo mysql -u root -p
```

```sql
CREATE DATABASE IF NOT EXISTS power_grid_demo;
CREATE USER 'gridapp'@'%' IDENTIFIED BY 'StrongPassword123';
GRANT ALL PRIVILEGES ON power_grid_demo.* TO 'gridapp'@'%';
FLUSH PRIVILEGES;
EXIT;
```

```bash
# Open firewall
sudo ufw allow 3306
sudo ufw allow 22
sudo ufw enable
```

---

## STEP 2 — Load Database

```bash
# From your laptop, copy and run the SQL file
mysql -h <VM_IP> -u gridapp -p power_grid_demo < database.sql

# You should see output like:
# type          | count
# Feeders       | 10
# L1 Trans      | 6
# L2 Trans      | 20
# Smart Meters  | 50
# Feeder Links  | 14
# Trf Links     | 85+
```

---

## STEP 3 — Setup Backend (Your Laptop - VS Code)

```bash
cd power-grid-app/backend

# Copy env file
cp .env.example .env

# Edit .env - fill in your VM IP
# DB_HOST=<YOUR_VM_IP>

# Install and run
npm install
npm run dev

# You should see: ✅ Server running on http://localhost:5000
```

Test APIs in browser:
- http://localhost:5000/api/health
- http://localhost:5000/api/feeders
- http://localhost:5000/api/transformers
- http://localhost:5000/api/transformers/T001/connections

---

## STEP 4 — Setup Frontend (Your Laptop - VS Code)

```bash
cd power-grid-app/frontend
npm install
npm run dev

# Open http://localhost:3000
```

---

## What You'll See

### Screen 1: Feeder Master
- India map with 10 feeder icons (colored by type: Thermal=red, Hydro=blue, Gas=orange, Nuclear=purple)
- Click any feeder icon → popup with details
- Table below with all feeder data
- "+ Add Feeder" button to add new feeders

### Screen 2: Transformer Master
- Varanasi map with all transformers
  - L1 = Large purple circles (outside city)
  - L2 = Medium blue circles (inside city)
  - SM = Small green circles (street level)
- Lines connecting everything (toggle on/off)
- **Click any transformer** → right panel shows:
  - Upstream connections (feeders / L1 / L2)
  - Downstream connections (L2 / SM)
  - Peer connections (for T001/T002)
  - Primary vs Backup labels

---

## API Reference

| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/feeders | All feeders |
| GET | /api/feeders/:id | Single feeder |
| GET | /api/feeders/:id/transformers | Transformers of feeder |
| POST | /api/feeders | Create feeder |
| PUT | /api/feeders/:id | Update feeder |
| GET | /api/transformers | All transformers |
| GET | /api/transformers?type=L1 | Filter by type |
| GET | /api/transformers/:id | Single transformer |
| GET | /api/transformers/:id/connections | **Upstream + Downstream** |
| GET | /api/transformers/links/all | All links (for map lines) |
| POST | /api/transformers | Create transformer |

---

## Data Summary

| Entity | Count | Details |
|--------|-------|---------|
| Feeders | 10 | UP + adjoining states (Thermal, Hydro, Gas, Nuclear) |
| L1 Transformers | 6 | 66/33 kV, outside Varanasi |
| L2 Transformers | 20 | 33/11 kV, inside Varanasi |
| Smart Meters | 50 | 11/.22 kV, consumer level |

**L1 Feeder connections:**
- T001, T002, T003, T004 → 2 feeders each (4 transformers with 2 feeders ✓)
- T005, T006 → 3 feeders each (2 transformers with 3 feeders ✓)
- T001 ↔ T002 can share power (peer link ✓)

**L2 connections:**
- T007-T021 (15) → single L1 source ✓
- T022-T026 (5) → dual L1 source (primary + optional backup) ✓

**Smart Meters:** Each has exactly 1 L2 parent ✓

---

## Packages Used

**Backend:** express, mysql2, cors, dotenv, nodemon
**Frontend:** react, react-dom, react-leaflet, leaflet, vite
