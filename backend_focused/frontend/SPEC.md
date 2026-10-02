# Fleet Tracker Frontend Specification

## 1. Scope and goals

Build a focused Next.js client for the existing Django API using Material UI, axios, and TanStack React Query. The primary workflow is finding and managing vehicles; the UI will demonstrate vehicle CRUD, search, detail/history, and one operational report without becoming a general-purpose admin system.

In scope:

- Vehicle list and combined search
- Vehicle create, edit, delete, and detail views
- Complete maintenance history on vehicle detail
- Vehicles-needing-maintenance report

## 2. Navigation and page structure

Use a small app shell with a top navigation bar:

- **Vehicles** — `/vehicles` (also the landing page)
- **Maintenance due** — `/maintenance-due`

Vehicle pages use routes rather than modal-only navigation:

- `/vehicles/new`
- `/vehicles/[id]`
- `/vehicles/[id]/edit`

This keeps browser navigation, refreshes, and demo flow straightforward. Create/edit pages have an obvious cancel path back to the list or detail page.

## 3. Vehicle list and filters

`GET /api/vehicles/` drives a paginated table showing VIN, plate, make/model, year, office, active status, and row actions. The list API provides an office ID; the UI may map IDs to the paged office reference query where available and otherwise display `Office #<id>` rather than inventing unavailable data.

The filter panel maps directly to backend query parameters:

- `office`
- `active`
- `make`
- `model`
- `maintenance_date_from`
- `maintenance_date_to`
- `mechanic_certification_number`

Filters are controlled locally and applied with an explicit **Apply filters** button, avoiding a network request per keystroke. Applied filters and page number are stored in URL query parameters, so refresh, sharing, and browser navigation preserve the search. **Clear filters** resets the form, URL, and page to defaults. Pagination uses the backend `count`, `next`, `previous`, and `results` response fields.

## 4. Vehicle CRUD

Create and edit forms use controlled Material UI fields. Required-field feedback is limited to obvious UX validation; the API remains authoritative for uniqueness, active-plate conflicts, and other domain rules.

On mutation success, show a success snackbar, invalidate vehicle-list/detail queries, and navigate to the relevant detail or list page. Field-level API validation errors appear beside fields; non-field errors appear in an alert. Delete requires a confirmation dialog. A `409` protected-delete response is presented as a clear message that maintenance history must be removed first.

The office field loads the existing offices endpoint for the ordinary small reviewer dataset. If an office is not present in the reference page, preserve the backend value rather than replacing it with a guessed label.

## 5. Vehicle detail

`GET /api/vehicles/{id}/` displays a vehicle summary, nested office information, and the complete maintenance history returned by the optimized endpoint. History is a responsive table with date, service type, cost, notes, and mechanic name/certification number, already ordered newest first by the API.

Show a clear empty state when there is no maintenance history. The detail page includes Edit and Delete actions; reassignment is intentionally left out of the initial UI because it is not required to demonstrate the selected frontend scope.

## 6. Additional report: Maintenance due

Use `GET /api/vehicles/needing-maintenance/` at `/maintenance-due`. This is preferred over office summary because it is an immediately actionable fleet workflow that stays centered on vehicles. Present a prioritized table with plate, make/model, office ID, and last maintenance date. `Never maintained` is a textual status, not color alone; stale dates receive a warning chip. Each row links to vehicle detail.

## 7. Data-fetching strategy

Keep API functions in the existing `lib/api-client.ts` area, with small resource helpers/types rather than a generated SDK. Base URL remains `NEXT_PUBLIC_API_BASE_URL` with the supplied `http://localhost:8000/api` default.

React Query keys are predictable:

- `['vehicles', appliedFilters]`
- `['vehicle', id]`
- `['offices']`
- `['maintenance-due']`

Vehicle mutations invalidate `['vehicles']`, the affected `['vehicle', id]` when applicable, and `['maintenance-due']`; no global state library is needed. Queries expose loading, refetching, empty, and error states directly in each page.

## 8. States and accessibility

- Initial loads use skeleton/table placeholders; filter refresh keeps current results visible with a compact loading indicator.
- Empty searches and empty maintenance-due results explain what happened and offer a clear next action.
- API failures use visible alerts with retry controls; mutation failures remain visible until dismissed or corrected.
- Forms have explicit labels, required indicators, keyboard-accessible buttons, and server error text associated with fields.
- Tables horizontally scroll on narrow screens; laptop/desktop is the primary target.

## 9. Component structure

Keep components close to their pages:

- `AppShell` and navigation
- `VehicleFilters`, `VehicleTable`, `VehicleForm`, `DeleteVehicleDialog`
- `VehicleSummary`, `MaintenanceHistoryTable`
- `MaintenanceDueTable`
- Small shared `PageState`/alert components only if reuse is evident

Use Material UI for layout, forms, tables, chips, dialogs, and feedback. Avoid a custom design-system layer or charts.

## 10. Testing strategy

The scaffold has no frontend test framework, so do not add a large test stack for this take-home. Verify `npm run lint` and `npm run build`, then perform focused manual checks against seeded API data:

- URL filters map to request parameters, combine correctly, clear correctly, and paginate.
- Create, edit, delete, validation, and protected-delete feedback work.
- Detail history renders nested office/mechanic data and empty history.
- Maintenance-due loading, empty, and error states work.

## 11. Explicit non-goals

No authentication, role management, maintenance-record editing UI, assignment-history UI, caching, optimistic updates, Redux/Zustand, charts, WebSockets, offline support, or duplicated backend business rules.

## 12. Demo flow

In under two minutes: open Vehicles, apply combined filters, create or edit a vehicle, open its detail/history, then open Maintenance due and follow a prioritized row back to its detail. This demonstrates CRUD, URL-backed search, nested API detail data, and the selected additional endpoint.
