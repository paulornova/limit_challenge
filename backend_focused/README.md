# Fleet Maintenance API

A Django + Django REST Framework backend for tracking offices, vehicles, mechanics, and vehicle maintenance. The implementation uses one `fleet` app and SQLite for simple reviewer setup.

## Setup

From the repository root:

```bash
cd backend_focused/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

In Git Bash on Windows, activate the environment with:

```bash
source .venv/Scripts/activate
```

The API is available at `http://localhost:8000/api/`.

## Tests

```bash
cd backend_focused/backend
python manage.py test
python manage.py makemigrations --check
```

## Seed data

Create a small dataset with the defaults (5 offices, 100 vehicles, 20 mechanics, 500 maintenance records):

```bash
python manage.py seed_fleet_data --seed 42
```

The command refuses to overwrite existing fleet data. Use `--clear` to explicitly replace it:

```bash
python manage.py seed_fleet_data --clear --seed 42 --offices 5 --vehicles 100 --mechanics 20 --maintenance-records 750
```

For query exploration, a practical larger profile is:

```bash
python manage.py seed_fleet_data --clear --seed 42 --offices 25 --vehicles 5000 --mechanics 150 --maintenance-records 50000
```

`--seed` makes generated values reasonably reproducible. The command creates inactive historical plate sharing, no-history vehicles, old and recent maintenance, and—with 1,000 or more records—at least one vehicle with 500 maintenance records.

## API routes

Standard CRUD is available for all resources:

| Resource | Routes |
| --- | --- |
| Offices | `GET, POST /api/offices/`; `GET, PUT, PATCH, DELETE /api/offices/{id}/` |
| Vehicles | `GET, POST /api/vehicles/`; `GET, PUT, PATCH, DELETE /api/vehicles/{id}/` |
| Mechanics | `GET, POST /api/mechanics/`; `GET, PUT, PATCH, DELETE /api/mechanics/{id}/` |
| Maintenance records | `GET, POST /api/maintenance-records/`; `GET, PUT, PATCH, DELETE /api/maintenance-records/{id}/` |

Custom endpoints:

- `GET /api/offices/summary/`
- `GET /api/vehicles/{id}/maintenance-history/`
- `PATCH /api/vehicles/{id}/reassign/` with `{ "office": 123 }`
- `GET /api/mechanics/workload/`
- `GET /api/vehicles/needing-maintenance/`
- `GET /api/vehicles/duplicate-check/?vin=...&license_plate=...`

`GET /api/vehicles/` is also the vehicle search endpoint. It accepts any combination of `office`, `active`, `make`, `model`, `maintenance_date_from`, `maintenance_date_to`, and `mechanic_certification_number`.

Example:

```text
/api/vehicles/?active=true&maintenance_date_from=2026-01-01&mechanic_certification_number=CERT-42
```

## Assumptions and rules

- Mechanics are not assigned to offices.
- Reassignment updates only the vehicle's current office; there is no assignment history.
- VIN is globally unique. VINs and license plates are trimmed and uppercased before persistence.
- A plate is unique only among active vehicles. Inactive vehicles may share historical plates, including with an active vehicle.
- Duplicate check is advisory and assumes a new active vehicle candidate; database constraints remain authoritative.
- Maintenance dates cannot be in the future; today is valid.
- Costs use fixed-precision decimals and cannot be negative.
- Referenced offices, vehicles, and mechanics use protected deletion and return `409 Conflict` through the API.

## Performance decisions

Reports use database aggregation rather than Python-side loops. Vehicle search uses a correlated `Exists` subquery so date and mechanic filters apply to the same maintenance record without duplicate vehicle rows. Vehicle detail uses `select_related` for its office and a prefetched, `select_related` maintenance history for mechanics, keeping it at a small constant query count even with hundreds of records.

Indexes target the documented access patterns, and focused tests assert query counts for detail, summaries, workload, and maintenance-due results. A 50,000-record local seed profile was used for diagnostic checks; timings are local observations, not benchmark guarantees.

## Trade-offs and production evolution

SQLite is retained because it is supplied and keeps reviewer setup simple. PostgreSQL would be the likely production database for stronger concurrent-write behavior and operational tooling.

The take-home intentionally omits authentication, caching, Redis, Celery, generic idempotency infrastructure, assignment history, and deployment tooling. Custom report/history results follow the challenge semantics; a production API may paginate large responses where appropriate.
