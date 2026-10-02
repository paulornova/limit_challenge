# Fleet Maintenance API — Technical Specification

## 1. Scope and principles

Implement the backend in the provided Django project, keeping all domain code in the existing `fleet` app. Use Django REST Framework viewsets/serializers for ordinary CRUD and small custom actions for the required reports and mutations. Keep SQLite as the development database.

The implementation should favor clear models, database constraints, and efficient ORM queries over new infrastructure or architectural layers. A `serializers.py`, `urls.py`, tests, and one management command are sufficient additions; a small query helper is warranted only if it makes a complex report clearer.

The README's relationships support this model: Office 1:N Vehicle; Vehicle 1:N MaintenanceRecord; Mechanic 1:N MaintenanceRecord. Mechanics have no office assignment and can work on vehicles from any office.

## 2. Domain model and rules

- **Office**: `name`, `city`.
- **Vehicle**: `vin`, `license_plate`, `make`, `model`, `year`, `office` (FK, `related_name="vehicles"`), `active` (default true).
- **Mechanic**: `name`, `certification_number`, `active` (default true). Certification number is an exact search attribute, but the challenge does not state it is globally unique, so it is not constrained as unique.
- **MaintenanceRecord**: `vehicle` (FK), `mechanic` (FK), `maintenance_date`, `maintenance_type`, `cost`, `notes`.

`cost` should be `DecimalField(max_digits=12, decimal_places=2)`, allowing values through 9,999,999,999.99 without floating-point error. Cost must be non-negative. `maintenance_date` is a completed-service date, so future dates are rejected; today is permitted. `year` is stored as an integer; the challenge defines no further model-year rule, so none is introduced.

VIN and license plate are canonicalized at the application boundary—DRF serializers and the seed command—by trimming surrounding whitespace and uppercasing before persistence. This makes uniqueness and duplicate checks consistent for logically equivalent values such as `" abc123 "` and `"ABC123"`. Database constraints enforce uniqueness over these canonical stored values; no SQLite-specific case-insensitive collation or functional constraint is introduced for this challenge.

Reassignment is only `vehicle.office = new_office`; no assignment-history model or audit/event record is created.

## 3. Database constraints and indexes

Use database constraints as the final integrity mechanism, with serializer validation for useful DRF errors:

- `Vehicle.vin`: `unique=True`.
- `Vehicle`: `UniqueConstraint(fields=["license_plate"], condition=Q(active=True), name="unique_active_license_plate")`.
- `MaintenanceRecord.cost`: `CheckConstraint(condition=Q(cost__gte=0), ...)`.

SQLite supports the conditional unique index Django creates for this constraint. Thus an active vehicle cannot be created with another active vehicle's plate; changing an active vehicle's plate and reactivating an inactive one are likewise protected. Any number of inactive vehicles may share a plate, including a plate held by an active vehicle. The database constraint remains necessary even if serializer validation is bypassed or concurrent requests race.

Django automatically indexes foreign keys and creates indexes for `unique=True` fields. In addition to those, add only indexes serving required queries:

- `Vehicle(office, active)` for common office/status filtering.
- `Vehicle(make, model)` for make-only and make-plus-model search. It does not efficiently serve model-only search because `make` is the leading B-tree column; a `model` index is deliberately deferred until the seeded dataset and `EXPLAIN QUERY PLAN` establish that it is worthwhile.
- `Mechanic(certification_number)` for the required exact certification-number filter.
- `MaintenanceRecord(vehicle, -maintenance_date)` for vehicle history and latest-maintenance lookups.
- `MaintenanceRecord(mechanic, maintenance_date)` for certified-mechanic/date searches.

The conditional unique index already services active plate-conflict lookups; a separate plate index is unnecessary initially. Reassess any extra index, including a date-leading maintenance index for workload aggregation, with query plans and realistic dummy data rather than indexing every column.

## 4. API design

All routes are under `/api/` and use trailing slashes. Standard DRF viewsets provide these resources:

| Resource | Route | Methods |
| --- | --- | --- |
| Offices | `/offices/`, `/offices/{id}/` | GET, POST; GET, PUT, PATCH, DELETE |
| Vehicles | `/vehicles/`, `/vehicles/{id}/` | GET, POST; GET, PUT, PATCH, DELETE |
| Mechanics | `/mechanics/`, `/mechanics/{id}/` | GET, POST; GET, PUT, PATCH, DELETE |
| Maintenance records | `/maintenance-records/`, `/maintenance-records/{id}/` | GET, POST; GET, PUT, PATCH, DELETE |

CRUD returns 200 for reads/updates, 201 for creates, and 204 for deletes; validation errors are 400 and absent resources are 404. Vehicle retrieve is the required vehicle-detail response: vehicle fields, nested office, and its full newest-first maintenance history with nested mechanic information.

| Purpose | Route and method | Input | Success response / status |
| --- | --- | --- | --- |
| Office summary | `GET /offices/summary/` | none | 200 array of `{id, name, city, active_vehicle_count, maintenance_cost_last_year, last_maintenance}` |
| Vehicle search | `GET /vehicles/` | optional `office`, `active`, `make`, `model`, `maintenance_date_from`, `maintenance_date_to`, `mechanic_certification_number` | 200 normal vehicle list; invalid boolean/date or reversed dates is 400 |
| Maintenance history | `GET /vehicles/{id}/maintenance-history/` | none | 200 newest-first records, each with mechanic data; 404 for vehicle |
| Reassign vehicle | `PATCH /vehicles/{id}/reassign/` | `{ "office": <office id> }` | 200 updated vehicle; 400 invalid office/body; 404 vehicle |
| Mechanic workload | `GET /mechanics/workload/` | none | 200 array `{id, name, certification_number, maintenance_count_current_year, maintenance_cost_current_year}`, busiest first |
| Needing maintenance | `GET /vehicles/needing-maintenance/` | none | 200 active vehicles with `last_maintenance`; never-maintained vehicles have `null` and appear first |
| Duplicate check | `GET /vehicles/duplicate-check/` | required `vin`, `license_plate` | 200 `{ "conflicts": ["vin", "license_plate"] }` (possibly empty); malformed input 400 |

The duplicate check assumes a new active-vehicle candidate. A VIN conflict is any existing vehicle with the normalized VIN. A license-plate conflict is an existing active vehicle with the normalized plate. Inactive historical matches alone do not conflict. This deliberately mirrors the active-plate invariant rather than incorrectly treating plates as globally unique. Update-form exclusions are not part of this challenge endpoint and can be added later only if a frontend need justifies them.

## 5. Query and performance strategy

- **Office summary:** one annotated `Office` queryset: filtered `Count("vehicles", distinct=True)` for active vehicles, filtered `Sum("vehicles__maintenance_records__cost")` for records on/after the rolling calendar-year cutoff (coalesced to `0.00`), and `Max("vehicles__maintenance_records__maintenance_date")`. This returns offices with no vehicles/records and avoids per-office queries. “Last 12 months” starts on the equivalent calendar date one year earlier (with the normal end-of-February adjustment for leap day) and is inclusive.
- **Vehicle search:** apply direct vehicle filters and `select_related("office")`. When maintenance-related filters are supplied, use one correlated `Exists(MaintenanceRecord...)` subquery containing the date range and certification filter. It guarantees both record conditions apply to the same maintenance record and avoids duplicate vehicles without relying on broad `distinct()`.
- **Vehicle detail:** retrieve through `select_related("office")` and a `Prefetch` of maintenance records ordered by `-maintenance_date, -id`, whose queryset uses `select_related("mechanic")`. This is a constant number of queries (normally two) even with hundreds of records, not one per record.
- **Maintenance history:** filter by vehicle, order `-maintenance_date, -id`, and `select_related("mechanic")`; use the same serializer shape as nested history. The endpoint may use normal DRF pagination if the history grows beyond the challenge's hundreds-of-records expectation; the detail response remains complete as required.
- **Mechanic workload:** annotate `Mechanic` with filtered current-calendar-year `Count("maintenance_records")` and `Sum("maintenance_records__cost")`, coalescing cost/count to zero; order by count descending, then cost descending and stable ID/name. This includes mechanics with no work.
- **Vehicles needing maintenance:** annotate active vehicles with `Max("maintenance_records__maintenance_date")`, filter for null or strictly earlier than `today - 365 days`, and order nulls first then oldest date. This includes vehicles with no records without loading history into Python.
- **Duplicate check/reassignment:** use indexed `exists()` conflict checks for friendly errors, but let the unique constraints decide final correctness. Reassignment is a single model update after normal foreign-key validation.

## 6. Dummy data and testing

Provide `python manage.py seed_fleet_data` using Faker, with optional deterministic seed and scale arguments. A reviewer should be able to create either a small exploratory dataset or a larger one that exposes inefficient query patterns (for example, independently configurable vehicle and maintenance-record counts). It should create multiple offices, a meaningful number of vehicles and mechanics, no-history vehicles, selected vehicles with hundreds of records, old and recent records, and inactive vehicles sharing historical plates. Generated records must honor all constraints.

Focused tests should cover:

- VIN uniqueness; conditional active-plate uniqueness at model/database level; plate changes and activation conflicts.
- CRUD validation (including money and future dates), reassignment, and duplicate-check semantics, including inactive-only plate matches.
- Every vehicle-search filter in combination, particularly that joins do not duplicate results and that a date/certification combination matches one record.
- Date boundaries, office aggregates, mechanic current-year aggregates, and needing-maintenance ordering/null behavior.
- Full vehicle detail and history ordering. Use `assertNumQueries` where practical to confirm hundreds of prefetched records do not cause N+1 queries. Query-count tests protect against structural regressions; wall-clock timing is not asserted because it is environment-dependent. Use seeded data and `EXPLAIN QUERY PLAN` for manual profiling when needed.

## 7. Explicit non-goals and trade-offs

This take-home intentionally excludes authentication (aside from optional bonus work), caching, Redis, asynchronous workers/queues, generic idempotency keys, assignment history, event sourcing, deployment infrastructure, and splitting the small domain across multiple Django apps. Normal HTTP semantics plus database constraints are sufficient; generic create-request idempotency would only be warranted later for unreliable clients and operations without natural uniqueness.

## 8. Production evolution notes

SQLite is retained because it is supplied, simple for reviewer setup, and appropriate for the expected data volume. The models and ORM remain PostgreSQL-portable. A production system would likely move to PostgreSQL for stronger concurrent-write behavior, operational tooling, and broader indexing options. At that point, transactions and possibly row-level locking may be considered for workflows with multiple dependent updates; the current unique constraints already protect VIN and active-plate invariants against ordinary races. Caching, background processing, and audit history should be introduced only if later requirements establish a concrete need.
