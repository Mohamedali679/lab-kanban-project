# lost2found 🔍 — Sprint 4 MVP

**Roehampton University Community Lost & Found Board**  
Module: CMP-N204-0 Software Engineering · Group: 5 Engineers · Sprint 4

---

## The Team

| Name | Student ID |
|------|-----------|
| Uthman Vahora | A00015026 |
| Ibrahim Al-kutubi | ALK22612424 |
| Mohamed Ali | Z23614747 |
| Abdiaziz Ismail | ISM23592710 |
| Lyes Boudehane | A00015772 |

---

## Sprint 4 Features

| Feature | Status |
|---------|--------|
| User login & registration | ✅ |
| Roehampton-only accounts | ✅ |
| Post lost/found items | ✅ |
| Image upload | ✅ |
| Reward points on items | ✅ |
| Smart matching algorithm | ✅ |
| In-app messaging | ✅ |
| User ratings & reviews | ✅ |
| Points leaderboard | ✅ |
| Notifications | ✅ |
| Docker + phpMyAdmin | ✅ |
| GitHub Actions CI/CD | ✅ |

---

## Quick Start

```bash
# 1. Make sure Docker Desktop is running
# 2. In the lost2found-sprint4 folder:
docker compose up --build
```

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| phpMyAdmin | http://localhost:8081 |

### phpMyAdmin login
- Server: `db`
- Username: `root`
- Password: `rootpassword`

---

## Test Accounts (password: `password123`)

| Email | Name |
|-------|------|
| daniel.james@roehampton.ac.uk | Daniel James |
| sara.johnson@roehampton.ac.uk | Sara Johnson |
| uthman.vahora@roehampton.ac.uk | Uthman Vahora |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, JavaScript, PUG |
| Backend | Node.js, Express.js |
| Database | MySQL 8.0 |
| DevOps | Docker, Docker Compose |
| CI/CD | GitHub Actions |
| DB Admin | phpMyAdmin (port 8081) |

---

## Matching Algorithm

The algorithm scores each lost item against every found item using:
- **Category match** — 40% weight
- **Location overlap** — 30% weight (keyword similarity)
- **Date proximity** — 20% weight (within 7 days)
- **Title/description keywords** — 10% weight

Matches scoring ≥ 30% are stored and users are notified.

---

## GitHub Links

- Repository: https://github.com/Mohamedali679/lab-kanban-project
- Project Board: https://github.com/users/Mohamedali679/projects/2/views/1
