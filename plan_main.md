# AgroLink — Data Connection, Admin Redesign, and RBAC Plan

Status: approved, in progress.

Decisions taken (recommended options from the planning discussion):

1. Farm-wide activity ledger is produced by a new backend aggregate endpoint.
2. `FarmPlot.soil_ph` is added to the backend because the UI already collects and displays it.
3. Dashboard alerts are derived from real backend data (reports, health observations, scheduled vaccinations).
4. Marketplace interest and Expert service requests stay on the mock, clearly labelled as demo.
5. `User.Role` stays as the account-type layer; RBAC is added alongside it because report
   assignment and scoping depend on the enum.

---

## Root causes found

- `frontend/src/context/FarmerContext.tsx` hydrates only the profile and farms from the API.
  Plots, crops, livestock, animals, vaccinations, reports, and activities are served by
  `mockApiService`, an in-memory store that starts empty.
- `alerts` is initialised to `[]` and never populated, so the dashboard alert panel is always empty.
- All create/update/delete flows write to the mock and disappear on refresh.
- The backend already exposes farms, plots, crops, crop health, crop activities, crop summary,
  livestock groups/animals/health/medical/activities, livestock summary, and reports including
  evidence. Missing pieces: a growth-stage list endpoint, a farm-wide activity feed, plot `soil_ph`,
  and farm filters on some nested collections.
- The `/platform/` admin site uses 8–11px fonts, has no roles/permissions pages, and has no
  farm/crop/livestock/report oversight pages.

---

## Phase 1 — Backend gaps

- `apps/crops/`: read-only `CropGrowthStageViewSet` at `/api/v1/crop-growth-stages/`.
- `apps/crops/`: add `?farm=` filter to `crop-health-records` and `crop-activities`.
- `apps/livestock/`: add `?farm=` filter to health records, medical records, and activities.
- New `FarmActivityFeedView` at `/api/v1/farms/<id>/activity-feed/` merging crop activities,
  livestock activities, medical records, and reports into one normalised list.
- `apps/farms/models.py`: optional `soil_ph` on `FarmPlot` plus migration and serializer field.
- Enrich `CropSerializer` with read-only `plot_name` and `growth_stage_name`.
- Add tests for the new endpoints and filters.

## Phase 2 — Frontend API client and mappers

- `frontend/src/services/apiService.ts`: typed methods for plots, crops, crop health,
  crop activities, growth stages, crop summary, livestock groups/animals/medical records,
  livestock summary, reports, evidence upload, and the farm activity feed. A `fetchAllPages`
  helper prevents 20-per-page responses from being silently truncated.
- `frontend/src/services/farmDataMappers.ts`: pure mappers from API payloads to the UI domain
  types, including derived health status, progress percentage, age, and status labels.
- `frontend/src/data/farmerData.ts`: widen types where the backend is richer (report statuses,
  severity `moderate`, animal species beyond cattle/goat/poultry).
- `mockApiService.ts` remains only for Marketplace interest and Expert service requests, labelled
  as demo.

## Phase 3 — Rewrite FarmerContext

- Per-collection `{ loading, error }` state plus `reloadFarmData()` and `retry(collection)`.
- Farm-scoped parallel hydration with `Promise.allSettled` on farm change and auth event.
- CRUD wrappers call the real API then refresh affected collections.
- Derive `alerts` from open reports, flagged health observations, and upcoming vaccinations.
- Reconcile `plotCount`/`herdCount` with the loaded arrays.

## Phase 4 — Wire the pages

- Crops, Livestock, Farm, Report Problem, and Activity pages: loading skeletons, error/retry
  banners, real empty states, and real create/update/delete.
- Dashboard and its components: real counts, alerts, summaries, and recent activity.
- Sidebar/TopBar search uses real plots, crops, and livestock.
- Report photo upload uses `POST /api/v1/reports/{id}/evidence/`.

## Phase 5 — Full RBAC

- `accounts.Role` wrapping a Django `Group` (`group` OneToOne) with name, slug, description,
  `is_system`, `is_assignable`, timestamps so `has_perm`, template `perms.*`, and existing
  group logic keep working.
- Seed migration converts the five existing groups into roles and adds Platform Supervisors.
- Permission matrix grouped by domain over the nine `User.Meta.permissions`.
- Services for role CRUD, permission assignment, role assignment, all writing `AdminAuditEvent`.
- Views/urls for role list, detail, create, edit, permission matrix, delete, and member
  assignment. `has_platform_permission` resolves through `user.has_perm`.
- Tests for role CRUD, matrix enforcement, system-role protection, assignment auditing, and 403s.

## Phase 6 — Redesign `/platform/`

- Rewrite `platform.css` on a real type scale (body 14–15px, nav 13px, labels 12px, tables 13px),
  wider sidebar, spacing tokens, focus rings, 40px touch targets, responsive tables.
- Rebuild `base.html` navigation with an Access control section and mobile sidebar.
- Add missing oversight pages: Farms & plots, Crops, Livestock, Reports.
- Restyle dashboard, user list/detail, staff form, reference data, and audit log.

## Phase 7 — Verification

- Backend: `python manage.py makemigrations` then
  `python manage.py test apps.accounts apps.farms apps.crops apps.livestock apps.reports apps.market_intelligence apps.platform_admin apps.common --settings=config.settings.test`
- Frontend: `npm run lint` and `npm run build`.
- Manual pass: create farm → plot → crop → health record → animal → vaccination → report,
  refresh and confirm persistence; create a custom role, assign permissions, assign it to a
  staff user, and verify navigation and access.
