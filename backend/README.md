# AgroLink backend

AgroLink uses one Django application, one PostgreSQL database, and shared Django models and permissions for its React farmer interface, Django Admin, and Django Template officer interface. The React app uses the backend for farmer registration, JWT login, profile loading, and farm listing. Other farmer-facing feature workflows are not yet connected to backend APIs; their local in-memory adapter starts empty and does not seed demonstration records.

## Structure

```text
backend/
├── apps/
│   ├── accounts/       # Email-based custom user, farmer profile, auth and permissions
│   ├── farms/          # Farm and plot models, APIs and admin
│   ├── crops/          # Crop cycles, growth stages, observations and activities
│   ├── livestock/      # Groups, individual animals, health and husbandry records
│   ├── reports/        # Farmer reports, assignment-scoped case management and audit events
│   ├── market_intelligence/ # Expandable commodities, county markets, prices and review workflow
│   ├── platform_admin/ # Platform overview, delegated administration and admin audit events
│   ├── ai_assistant/   # Farmer-owned conversations, context assembly, provider interface and usage
│   └── common/         # Shared API permissions and health check
├── config/
│   ├── settings/base.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── templates/          # Public landing page and shared staff dashboard templates
├── static/             # Source static assets, including staff.css
├── media/              # User-uploaded media (not committed)
├── private_media/      # Private crop/livestock images (not committed)
├── manage.py
├── requirements.txt
└── .env.example
```

## Local setup (Windows PowerShell)

Prerequisites: Python 3.10–3.14 (Django 5.2's supported range) and PostgreSQL. From the repository root:

1. Create a database and a dedicated local application user using `psql` as a PostgreSQL administrator:

   ```sql
   CREATE USER agrolink_user WITH PASSWORD 'replace-with-a-local-password';
   CREATE DATABASE agrolink OWNER agrolink_user;
   ```

2. Create and activate a virtual environment, install dependencies, and create the local environment file:

   ```powershell
   cd .\backend
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   Copy-Item .env.example .env
   ```

   Edit `.env` with the database credentials and generate a unique Django key:

   ```powershell
   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```

   Set `DJANGO_SECRET_KEY` to the generated value. Keep `.env` private and never use the example key outside a local setup. `DJANGO_DEBUG=True` is for local development only.

   To enable live agricultural assistance, create a Gemini API key in
   [Google AI Studio](https://aistudio.google.com/apikey), then set `GEMINI_API_KEY`
   in `backend/.env`. The credential must remain in the backend environment; do not
   place it in `frontend/.env`, React source, or browser storage. The example uses
   `gemini-3.5-flash-lite`, which Google's model documentation currently lists as
   a stable Gemini API model. Set `AI_ENABLED=True`, `AI_PROVIDER=gemini`, and
   `AI_MOCK_MODE=False`. The request timeout is controlled by
   `AI_REQUEST_TIMEOUT_SECONDS`.

   For UI development without a provider key, set `AI_ENABLED=True` and
   `AI_MOCK_MODE=True`. Responses are explicitly labelled demonstrations and do
   not provide agricultural guidance. Failed live requests are returned as errors;
   they are never replaced with mock responses.

3. Apply the checked-in schema migrations (including the custom user model's initial migration):

   ```powershell
   python manage.py migrate
   ```

4. Create an administrative account and start Django:

   ```powershell
   python manage.py createsuperuser
   python manage.py runserver
   ```

   The API is available at `http://127.0.0.1:8000/api/v1/`, Platform Administration at `http://127.0.0.1:8000/platform/`, and Django Admin at `http://127.0.0.1:8000/admin/`.
   The backend root at `http://127.0.0.1:8000/` serves the AgroLink landing page; `/api/v1/health/` remains the JSON health endpoint. A bare `/health` alias is available for deployment health probes.

The database engine is PostgreSQL and depends only on environment configuration, so the same models and migrations can later target a hosted PostgreSQL service without changing the domain model. No hosted database is configured here.

## AI assistant

The React assistant calls only the authenticated Django API. Django owns
conversations, messages, authorization, context selection, provider configuration,
and usage records. The provider interface in `apps.ai_assistant.providers` is
replaceable; Gemini uses Google's maintained `google-genai` Python SDK and keeps
the system instruction and API key on the server.

Available endpoints:

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/v1/ai/status/` | Authenticated farmer | AI enabled/configured status; no credential values |
| GET/POST | `/api/v1/ai/conversations/` | Authenticated farmer | List owned conversations or create one |
| GET | `/api/v1/ai/conversations/{id}/` | Conversation owner | Read the conversation and message history |
| POST | `/api/v1/ai/conversations/{id}/messages/` | Conversation owner | Save a text question or photo, generate a response, and record usage |

Messages are limited to 4,000 characters. A message may also include one JPEG,
PNG, or WebP `image` upload of up to 5 MB using `multipart/form-data`; the image
is optional when text is present. Attached photos are stored privately and sent
to Gemini as inline image data. Because Gemini does not retain state between
requests, the most recent photo in the conversation is re-sent with follow-up
questions. Message images are readable only by the conversation owner through
`/api/v1/private-images/ai-message/{message_id}/`.

Context is assembled only from the
authenticated farmer's profile location, farms/plots, active crops, livestock,
and their reported health observations. It excludes account contact details and
staff-only case notes. Relevant context, the question, and recent conversation
history are sent to Google for live responses; users are told this in the
assistant interface. Avoid entering sensitive personal information.

Usage records store request outcome, provider, response duration, and token counts
when Gemini provides them; prompt text is not copied into operational usage logs.
Provider errors, timeouts, disabled service, and invalid responses are surfaced to
the client without exposing credentials or provider error payloads.

To confirm which models Google currently supports, consult the official
[Gemini model catalog](https://ai.google.dev/gemini-api/docs/models). A configured
model's availability may still depend on the API key's project access and current
Google service status.

## Authentication and permissions

- Public registration always creates an active `farmer` and a farmer profile; privileged role/status/staff fields are rejected.
- Super Admin access is a protected account type (`platform_admin`) or Django superuser status. Only Super Admins can create administrative `staff` accounts, change staff platform roles, manage roles, and perform platform-wide configuration. A platform role cannot grant Super Admin access.
- Administrative staff receive named, audited platform roles such as Case Coordinator, Farmer Account Support, Professional Account Support, Agricultural Data Manager, or Operational Reporting. Assign only the roles required for the person's duties; built-in roles are locked and custom roles are available for exceptions.
- Agricultural officers, veterinary officers, agronomists, and field agents use their account type plus an active case assignment. Their specialty limits eligible cases; they do not receive broad Platform Administration access from being an officer. The staff case workspace limits handlers to assigned cases and restricts case assignment and transfers to coordinators.
- The role migration converts existing `organization_admin` accounts to `staff` and assigns the Case Coordinators group. Agricultural officers, veterinary officers, agronomists, and field agents remain separate professional account types.
- Platform Staff do not receive Django Admin access (`is_staff`) by default. Only Super Admins can create Staff or change delegated responsibilities.
- Login uses email and password and returns a short-lived access JWT and a refresh JWT. Send `Authorization: Bearer <access>` for protected API calls.
- Refresh tokens rotate and are blacklisted after rotation. Authenticated logout blacklists the submitted refresh token. Access tokens expire after five minutes.
- Passwords use Django's configured validators and password hashers.
- Farmer farm and plot querysets are scoped to the authenticated farmer. A foreign farmer's farm or plots are not disclosed (404); only an authorized farmer role can access these endpoints.
- Officer account types have no broad farm-record access. Case access is limited to active assignments and eligible specialties; platform roles do not grant case-handler access. Read access to full farm, crop, and livestock oversight pages is a separate `view_farm_oversight` capability.
- Session authentication is enabled for future same-backend template views; its state-changing requests require CSRF validation. CORS is limited to the configured frontend development origins.

## Versioned API

All responses are JSON. DRF validation errors use the standard field-to-error-list shape.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/v1/health/` | Public | Service status |
| GET | `/health` | Public | Deployment health-probe alias |
| POST | `/api/v1/auth/register/` | Public | Create farmer account and profile |
| POST | `/api/v1/auth/login/` | Public | Obtain access and refresh JWTs |
| POST | `/api/v1/auth/refresh/` | Public | Rotate a refresh JWT |
| POST | `/api/v1/auth/logout/` | Authenticated | Blacklist submitted refresh token |
| GET | `/api/v1/auth/me/` | Authenticated | Current farmer profile, or safe account details |
| PATCH/PUT | `/api/v1/auth/me/` | Authenticated farmer | Update current farmer profile |
| GET/PATCH/PUT | `/api/v1/farmer/profile/` | Authenticated farmer | Alias for the mock frontend's planned profile route |
| GET/POST | `/api/v1/farms/` | Authenticated farmer | List owned farms or create one |
| GET/PUT/PATCH/DELETE | `/api/v1/farms/{id}/` | Authenticated owner | Read or manage an owned farm |
| GET/POST | `/api/v1/farms/{id}/plots/` | Authenticated farm owner | List or add plots |
| GET/PUT/PATCH/DELETE | `/api/v1/farms/{id}/plots/{plot_id}/` | Authenticated farm owner | Read or manage a plot |

### Register and log in

```http
POST /api/v1/auth/register/
Content-Type: application/json

{
  "first_name": "Amina",
  "last_name": "Otieno",
  "email": "amina@example.com",
  "phone_number": "+254700000001",
  "password": "a-strong-password",
  "password_confirm": "a-strong-password",
  "farmer_profile": {
    "county": "Busia",
    "sub_county": "Samia",
    "ward": "Nangina",
    "village": "Bumala",
    "preferred_language": "sw"
  }
}
```

Successful registration returns `201 Created` with a safe account object:

```json
{
  "id": 1,
  "email": "amina@example.com",
  "first_name": "Amina",
  "last_name": "Otieno",
  "phone_number": "+254700000001",
  "role": "farmer",
  "account_status": "active",
  "date_joined": "2026-01-15T10:00:00Z"
}
```

```http
POST /api/v1/auth/login/
Content-Type: application/json

{"email": "amina@example.com", "password": "a-strong-password"}
```

Successful login returns `access` and `refresh` JWTs. Protect them as credentials; do not put secrets in frontend source.

### Farms and plots

```http
POST /api/v1/farms/
Authorization: Bearer <access>
Content-Type: application/json

{
  "name": "Green Valley Farm",
  "location": "Bumala",
  "county": "Busia",
  "sub_county": "Samia",
  "ward": "Nangina",
  "village": "Bumala",
  "size": "3.50",
  "size_unit": "acres",
  "farming_type": "mixed",
  "description": "Family farm"
}
```

`size` must be greater than zero. Valid farm types are `mixed`, `crops`, and `livestock`; valid size units are `acres` and `hectares`. Plot sizes use the farm's unit; each plot records soil type and irrigation status. The API sets ownership from the authenticated user and ignores client-supplied owner IDs.

## Crop management

Crop records belong to an existing farm and may optionally reference a plot on that same farm. Crop names are free text, so common Kenyan crops (maize, beans, rice, cassava, sweet potatoes, tomatoes, kale, cabbage, onions, bananas, groundnuts, sorghum, millet) and local/custom names are accepted. Growth stages are configurable through Django Admin; the initial migration seeds common stages. Stages are optional because crop cycles differ.

Health observations contain farmer-reported symptoms and condition only; they are not diagnoses. `CropAssessment` stores separate AI or professional assessment data for future authorized workflows and is not exposed as a farmer-write API. Crop activities record what was done; the backend does not prescribe pesticide or treatment use.

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/api/v1/crops/` | List or register crops |
| GET/PUT/PATCH/DELETE | `/api/v1/crops/{id}/` | Read or manage an owned crop |
| GET/POST | `/api/v1/crops/{id}/health-records/` | List or record observations |
| GET/POST | `/api/v1/crops/{id}/activities/` | List or record crop activities |
| GET/POST/PUT/PATCH/DELETE | `/api/v1/crop-health-records/` | Browse or manage owned observations |
| GET/POST/PUT/PATCH/DELETE | `/api/v1/crop-activities/` | Browse or manage owned activities |
| GET | `/api/v1/farms/{id}/crop-summary/` | Summarize authorized farm crops |

List APIs are paginated (`page`, `page_size`, default 20, maximum 100). Search uses `?search=...`; filtering includes `farm`, `plot`, `growth_stage`, `status`, and `crop_name`. Ordering can use supported fields, for example `?ordering=expected_harvest_date`.

Create a crop and add a farmer-reported observation:

```http
POST /api/v1/crops/
Authorization: Bearer <access>
Content-Type: application/json

{
  "farm": 12,
  "plot": 4,
  "crop_name": "Maize",
  "variety": "H513",
  "planting_date": "2026-03-01",
  "expected_harvest_date": "2026-08-01",
  "area_planted": "1.25",
  "area_unit": "acres",
  "growth_stage": 5,
  "status": "active",
  "notes": "Short rains planting"
}
```

```http
POST /api/v1/crops/37/health-records/
Authorization: Bearer <access>
Content-Type: application/json

{
  "observation_date": "2026-04-15",
  "symptoms_observed": "Yellowing along lower leaves",
  "general_condition": "fair",
  "severity": "low",
  "notes": "Farmer observation; no diagnosis made"
}
```

The crop summary returns total and active crops, the number with an expected harvest date within the next 30 days, and crop counts by configured stage (including an `Unspecified` group).

## Livestock management

Livestock groups support group-only management. Individual animals are optional and can be linked to a group on the same farm; identification numbers are unique per farm when supplied. Species and breed are free text for standard Kenyan categories (dairy/beef cattle, goats, sheep, poultry, pigs, rabbits) and custom categories. Animals and groups can have incomplete historical dates.

Health observations are farmer-reported, not veterinary diagnoses. AI and professional assessments are separate `LivestockAssessment` records and are not exposed as farmer-write APIs. Vaccination and treatment APIs store records without recommending a product or dosage. Farmer API submissions are always marked `farmer_reported`; professional-origin records require an authorized internal process.

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/api/v1/livestock/groups/` | List or create livestock groups |
| GET/PUT/PATCH/DELETE | `/api/v1/livestock/groups/{id}/` | Read or manage an owned group |
| GET/POST | `/api/v1/livestock/animals/` | List or register individual animals |
| GET/PUT/PATCH/DELETE | `/api/v1/livestock/animals/{id}/` | Read or manage an owned animal |
| GET/POST | `/api/v1/livestock/groups/{id}/health-records/` | Group health observations |
| GET/POST | `/api/v1/livestock/animals/{id}/health-records/` | Animal health observations |
| GET/POST | `/api/v1/livestock/groups/{id}/activities/` | Group husbandry activities |
| GET/POST | `/api/v1/livestock/animals/{id}/activities/` | Animal husbandry activities |
| GET/POST | `/api/v1/livestock/groups/{id}/medical-records/` | Group vaccination/treatment history |
| GET/POST | `/api/v1/livestock/animals/{id}/medical-records/` | Animal vaccination/treatment history |
| GET/POST/PUT/PATCH/DELETE | `/api/v1/livestock/health-records/` | Browse or manage owned health records |
| GET/POST/PUT/PATCH/DELETE | `/api/v1/livestock/activities/` | Browse or manage owned activities |
| GET/POST/PUT/PATCH/DELETE | `/api/v1/livestock/medical-records/` | Browse or manage owned medical history |
| GET | `/api/v1/farms/{id}/livestock-summary/` | Summarize authorized farm livestock |

Livestock lists are also paginated with search and ordering. Group filters include `farm`, `species`, and `is_active`; animal filters include `farm`, `group`, `species`, and `status`. Record lists accept subject IDs (`farm`, `animal`, or `group`) plus their resource-specific filters.

Register a group and an individual animal when individual tracking is needed:

```http
POST /api/v1/livestock/groups/
Authorization: Bearer <access>
Content-Type: application/json

{
  "farm": 12,
  "species": "dairy cattle",
  "breed": "Friesian",
  "group_name": "Dairy herd",
  "animal_count": 8,
  "production_purpose": "milk"
}
```

```http
POST /api/v1/livestock/animals/
Authorization: Bearer <access>
Content-Type: application/json

{
  "farm": 12,
  "group": 3,
  "identification_number": "COW-0042",
  "name_or_tag": "Akinyi",
  "species": "dairy cattle",
  "sex": "female",
  "estimated_age_months": 30
}
```

The livestock summary counts active groups and animals. An individually tracked animal linked to a group is not counted twice; group totals are reconciled with the number of active individually tracked animals. Upcoming health activities are drawn only from recorded future medical follow-up dates and scheduled vaccination, deworming, or veterinary-checkup activities.

## Market intelligence foundation

The `apps.market_intelligence` app adds a separate trade catalogue; it does not replace farmer-owned crop cycles, livestock groups, farms, users, or farmer-entered county text. `AgriculturalCommodity.kind` distinguishes expandable crop and livestock/product catalogues. Categories, alternate/local names, descriptions, scientific names, optional image URLs, active/market-available flags, supported units, and livestock price bases are configurable through Django Admin. Initial migrations add starter commodity examples and all 47 Kenyan counties, but do not seed markets or price observations. Administrators should add markets only when their locations are verified.

Trading units are reference records. Standard conversions (such as a 50 kg bag) are explicit; variable-size crates, baskets, and bunches have no assumed weight. Each observation also records the quantity represented by its selected unit. Prices are stored in KES. Livestock observations have a separate basis (per animal, live weight, carcass, meat, milk, eggs, honey, or other) and optional breed, age, sex, body condition, and weight. Indicative valuation is available only for verified observations whose units and basis support per-animal or live-weight conversion; meat, carcass, and other bases are never converted into live-animal values.

All market APIs require an authenticated active account. Catalogue and directory lists use the standard `page`/`page_size` pagination (30 items by default, maximum 100); the fixed reference lists for counties, categories, units, and sources are returned as arrays. Published price endpoints expose only `verified` and `estimated` observations. Pending submissions, reporter contact details, and review queues are not exposed through those endpoints.

| Method | Endpoint | Access and purpose |
|---|---|---|
| GET | `/api/v1/market/crops/`, `/api/v1/market/livestock/` | Search/filter the active crop or livestock catalogue |
| GET | `/api/v1/market/crop-categories/`, `/api/v1/market/livestock-categories/` | Read active commodity categories |
| GET | `/api/v1/market/counties/`, `/api/v1/market/markets/?county={id}` | Browse the seeded county directory and configured markets |
| GET | `/api/v1/market/units/`, `/api/v1/market/sources/` | Read active trading units and registered sources |
| GET | `/api/v1/market/prices/`, `/api/v1/market/prices/crops/`, `/api/v1/market/prices/livestock/` | Browse published observations; filters include `commodity`, `category`, `county`, `market`, `unit`, `price_type`, `observed_after`, `observed_before`, and `freshness` |
| GET | `/api/v1/market/prices/{id}/history/` | Read published history for the same commodity, market, unit, price type, quantity, and variety/grade |
| GET | `/api/v1/market/coverage/` | Actual verified/estimated observation and market coverage by active county; empty counties remain visible |
| GET | `/api/v1/market/overview/` | Category counts, actual coverage, and latest published observations for the farmer marketplace |
| POST | `/api/v1/market/comparisons/` | Compare selected markets using their latest published observation in the requested date range; date range defaults to the last 30 days |
| GET | `/api/v1/market/prices/trend/` | Paginated observed price points and period summary for a single commodity, unit, package quantity, price type, and optional market/county/grade |
| POST | `/api/v1/market/livestock/valuation/` | Estimate value using only fresh, verified prices with a compatible per-animal or live-weight basis |
| GET/POST | `/api/v1/market/watchlist/` | List or save the authenticated farmer's commodity, county, or market watch items |
| DELETE | `/api/v1/market/watchlist/{id}/` | Delete an owned watchlist item |
| GET/POST | `/api/v1/market/price-submissions/` | Farmer or field-agent reads their own submissions or submits a price for review |
| GET/POST | `/api/v1/market/commodity-suggestions/` | Farmer or field-agent reads their own suggestions or proposes an unlisted commodity |
| GET/POST | `/api/v1/market/staff/price-submissions/`, `/api/v1/market/staff/price-submissions/{id}/review/` | Authorized agricultural/veterinary officers, agronomists, or reference-data managers review prices |
| GET/POST | `/api/v1/market/staff/commodity-suggestions/`, `/api/v1/market/staff/commodity-suggestions/{id}/review/` | The same authorized reviewers approve or reject catalogue suggestions |
| GET | `/api/v1/market/staff/price-audit/` | Authorized reviewers read the append-only price and catalogue audit trail |
| GET | `/api/v1/market/staff/import-batches/`, `/api/v1/market/staff/import-batches/{id}/` | Reference-data administrators inspect preview/import counts and row-level validation or duplicate results |
| POST | `/api/v1/market/staff/import-batches/upload/` | Upload a CSV/XLSX with `source` and `file` multipart fields; validates and creates a preview only |
| POST | `/api/v1/market/staff/import-batches/{id}/confirm/` | Re-upload the exact same file to confirm its preview and import valid rows as pending |
| POST | `/api/v1/market/staff/import-batches/{id}/rollback/` | Reject all rows in a batch only while every imported observation is still pending; keeps records and audit history |

Submission approval atomically records the reviewer, publishes a verified observation, and writes audit events. Rejected/pending records stay out of public price results. Admin-created observations default to pending; an authorized reviewer can verify or estimate them through the audited admin workflow. Duplicate active observations for the same source, commodity, market, unit, price type, date, and grade are rejected. Commodity suggestions never modify an existing catalogue record; approval creates a new entry, and duplicate names are rejected.

Freshness is derived from `observation_date`, not from API polling or publication time. Defaults are 7 days for fresh, 30 days for recent, 90 days for aging, and older for stale; `MARKET_PRICE_FRESH_DAYS`, `MARKET_PRICE_RECENT_DAYS`, and `MARKET_PRICE_AGING_DAYS` can override these thresholds. Historical stale observations remain available through the API and are labelled in the marketplace as historical, not current. The React marketplace loads observations on entry and refreshes only when the farmer requests it or changes filters; no upstream update frequency has been established to justify rapid polling. It exposes actual category and county/market coverage, latest published updates with source references when available, price search suggestions, and same-market history. If no published observation matches the filters, it shows an unavailable state rather than estimating or fabricating a price. The buyer/listing demonstration content remains separate and is labelled as such.

Market comparisons choose the latest observation per selected market within the requested date range and keep unit, package quantity, grade, and livestock basis in separate groups. The mean is the unweighted mean of available market average prices; it is not a volume-weighted market price. Trends return the observed points and summary statistics without interpolating missing dates. Livestock valuation uses the latest date of compatible, verified observations no older than `MARKET_PRICE_RECENT_DAYS`; per-animal prices require a count unit based on head/animal, and live-weight prices require a mass unit with a documented kilogram conversion. The farmer watchlist stores saved commodities or places only; it does not send notifications or price alerts. The Django Admin import-batch page summarizes published observation counts, coverage, stale records, counties without observations, and sources with failed imports. These are counts of data actually stored, not provider availability.

### Authorized CSV import

Administrators may use the restricted upload/preview/confirm API or the management command. They configure a `PriceSource` in Django Admin, record its access and reuse terms, and mark data use authorized only after confirming permission. Imports from official and organizational sources are blocked until `data_use_authorized=True`. The upload API accepts multipart `file` and source ID fields, previews without saving observations, and requires re-uploading the same SHA-256 file to confirm; only the preview's creator can confirm it. CSV must be UTF-8; Excel must be `.xlsx` (the first worksheet is used and formulas are rejected). Both formats are limited to 10 MB and 10,000 rows. They use the documented columns, refer to active catalogues/markets/units, and retain the original observation date and optional source record ID. Unit compatibility, county-market match, price ranges, duplicates, and model validation are checked before saving. Import batches store the file hash/name, actor, source, counts, completion time, and row-level invalid/duplicate messages. Valid rows are created as **pending verification**; imports never publish prices. Invalid records are reported, not silently discarded. A batch can be rolled back only before any row has been independently reviewed; rollback rejects pending observations and preserves them with audit history rather than deleting records. Batch records are read-only to farmers and visible only to reference-data administrators.

```powershell
python manage.py import_market_prices --file C:\data\market-prices.csv --source-slug approved-provider --actor-email admin@example.org --dry-run
python manage.py import_market_prices --file C:\data\market-prices.csv --source-slug approved-provider --actor-email admin@example.org
python manage.py import_market_prices --file C:\data\market-prices.xlsx --source-slug approved-provider --actor-email admin@example.org --dry-run
```

Required columns, in any column order (the optional `source_reference` column may also be supplied):

```text
commodity_slug,county_code,market_id,price_type,unit_slug,unit_quantity,minimum_price,maximum_price,average_price,variety_grade,livestock_price_basis,livestock_breed,animal_age_category,animal_sex,body_condition,animal_weight_kg,observation_date
```

Blank optional price fields are accepted if at least one of minimum, maximum, or average is supplied. `source_reference` is optional and preserves a provider's external record ID. The source slug is provided separately by the operator and is not trusted from the file. `--dry-run` validates and records a preview batch without saving observations; run again without `--dry-run` to confirm/import. Duplicate rows and invalid rows are included in the batch result. Re-imports are identified as duplicates rather than overwriting historical observations.

### Data-source status (reviewed 2026-11-14)

Investigated source metadata is available through `/api/v1/market/sources/` and Django Admin. Publicly visible website content is not, by itself, permission to automate extraction or republish records. An investigated source is not an integration:

| Source | Finding | Status |
|---|---|---|
| KAMIS | [Official overview](https://kamis.kilimo.go.ke/index.php/site/about) describes national coverage and wholesale, retail, and farm-gate prices. Its [market page](https://kamis.kilimo.go.ke/site/market) and [search page](https://kamis.kilimo.go.ke/site/market_search) are public web pages. This review did not confirm a documented API, downloadable dataset/export, or reuse permission. | Awaiting an approved data feed/export and written authorization; no scraper or endpoint adapter is enabled |
| Kenya Livestock Marketing Council | The [public site](https://livestockcouncil.or.ke/) describes livestock-marketing programs and publications. No supported price dataset/API/export was identified. Contact the [Council](https://livestockcouncil.or.ke/contact-us/) for a data-sharing arrangement. | Awaiting a supported dataset and written authorization |
| FEWS NET Kenya | Market-price data and analysis are described; Data Explorer download/API extraction requires an account and dataset terms must be reviewed. | Awaiting account/terms review |
| NDMA | National and county drought/seasonal bulletins are available; a market-price dataset was not confirmed. | Investigated; reports are not price observations |
| Kenya Agricultural Observatory Platform (KAOP) | The [public dashboard](https://kenya.agdatahub.ilri.org/dashboard.html) displays market-information tables. A visible example is dated 2023-06-05; no supported API/export, current livestock price coverage, or reuse terms were confirmed. | Awaiting platform-owner confirmation of a supported dataset and written authorization |

No live external provider adapter has been connected and **zero real crop or livestock price observations have been imported**. All 47 counties are configured, but actual observation coverage is zero until authorized observations are supplied and approved. The existing CSV/XLSX adapters and pending-only import/review flow support manual imports of authorized files after operators map source records to AgroLink's documented schema. Original numeric prices and units are retained as supplied; conversion is not inferred. Imported rows remain pending until an authorized reviewer acts. No Celery/Redis or other scheduled-task system exists in the project, so there is no automatic collection, synchronization history, or provider retry schedule. A scheduled integration requires a supported provider method, written reuse rights, source-specific update cadence, and deployment operations for scheduling and bounded retry/backoff.

The CSV adapter is registered in `apps.market_intelligence.providers.PROVIDER_ADAPTERS`. New provider adapters must normalize source dates, markets, units, and provenance into this same validated observation workflow; they must not scrape restricted sources or silently publish estimates.

## Image handling

Crop, livestock, health-observation, report-evidence, AI-message, and farmer-profile images accept JPEG, PNG, or WebP up to 5 MB. Images are stored under the private local `private_media/` directory, not in PostgreSQL and not under Django's public `MEDIA_URL`. Crop and livestock image routes require an authenticated farmer who owns the associated farm. Profile pictures require the profile owner; AI-message images require the conversation owner. Report evidence is readable only by the reporting farmer or a currently assigned, category-authorized case handler. Other users receive 404. The download response is sent as an attachment with `nosniff` and `private, no-store` headers.

The common storage class isolates local filesystem storage from model definitions. A future storage backend can replace that adapter without changing crop or livestock relationships. The React app must send its bearer token when fetching an image (for example, fetch the URL as a blob); a plain `<img src>` request does not attach an Authorization header.

## Agricultural reports and case management

Reports are linked to an existing farmer-owned farm and may optionally reference a plot, crop, livestock group, or animal. The API validates that every linked record belongs to the selected farm and prevents mixed crop/livestock references. Farmers may edit a report only while it is in `submitted` status. Farmer observations remain separate from professional updates; the system does not automatically diagnose conditions or prescribe treatments.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET/POST | `/api/v1/reports/` | Active farmer | List owned reports or submit a report |
| GET/PATCH | `/api/v1/reports/{id}/` | Report owner | Read or edit a submitted report |
| GET/POST | `/api/v1/reports/{id}/updates/` | Report owner | View farmer-visible updates or answer a request for information |
| GET/POST | `/api/v1/reports/{id}/evidence/` | Report owner | List or upload private evidence images |
| GET | `/api/v1/staff/reports/` | Currently assigned handler | List assigned cases |
| GET | `/api/v1/staff/reports/{id}/` | Currently assigned handler | Read an assigned case |
| GET/POST | `/api/v1/staff/reports/{id}/updates/` | Currently assigned handler | View case updates or add a staff update |
| GET/POST | `/api/v1/staff/reports/{id}/evidence/` | Currently assigned handler | View or add private case evidence |
| GET | `/api/v1/staff/reports/{id}/assignments/` | Currently assigned handler | View assignment history |
| GET | `/api/v1/staff/reports/unassigned/` | Organization/platform coordinator | Search and filter the unassigned queue |
| POST | `/api/v1/staff/reports/{id}/assignments/` | Organization/platform coordinator | Assign or transfer a case |
| POST | `/api/v1/staff/reports/{id}/transition/` | Assigned handler or coordinator | Perform an allowed status transition |
| POST | `/api/v1/staff/reports/{id}/reopen/` | Assigned handler or coordinator | Reopen a terminal case |

List routes are paginated (`page`, `page_size`, default 20, maximum 100), support `?search=...`, and accept `status`, `category`, `severity`, `submitted_after`, and `submitted_before` filters. Ordering is available on submitted time, updated time, severity, status, and category where applicable.

Create a farmer report:

```http
POST /api/v1/reports/
Authorization: Bearer <access>
Content-Type: application/json

{
  "farm": 12,
  "plot": 4,
  "title": "Yellowing maize leaves",
  "description": "Several lower leaves are yellowing on the north plot.",
  "category": "crop_health",
  "severity": "moderate",
  "location_details": "North plot"
}
```

The response includes the generated `report_reference`, linked record IDs, source, status, and timestamps. Privileged fields such as farmer, source, assignment, and status cannot be supplied by a farmer.

Coordinators can assign a case to an active agricultural officer, agronomist, veterinary officer, or field agent, subject to category-specific role restrictions:

```http
POST /api/v1/staff/reports/42/assignments/
Authorization: Bearer <coordinator-access>
Content-Type: application/json

{"assigned_user": 17, "reason": "Assigned for crop assessment."}
```

Crop-related reports can be assigned to agricultural officers, agronomists, or field agents. Livestock-related reports can be assigned to veterinary officers or field agents. Unrelated or inactive accounts cannot be assigned. Transfers close the prior assignment and add an internal reassignment note; only one assignment can be active for a report.

Case updates distinguish farmer clarifications, information requests, field visits, investigation findings, recommendations, interventions, resolution summaries, and internal notes. Internal notes are never returned by the farmer update endpoint. Information requests move a case to `awaiting_farmer`; resolution summaries move it to `resolved`; coordinators can close or reopen cases. Every submission, assignment, transition, update, and evidence upload creates a timestamped audit event. A signal is published after transaction commit for future integrations; no notification or external event delivery is implemented yet.

Officer querysets are scoped to active assignments rather than broad geographic or organizational access. This project does not yet have county, organization, or caseload scope models; no such scope is implied or fabricated. Coordinators can see the unassigned queue and use assignment/workflow endpoints, but officers can only retrieve their active assigned cases. Django Admin remains a trusted platform-management interface, not the custom officer dashboard.

## Platform administration

The session-authenticated Django Template interface at `/platform/` is the operational administration experience; it is separate from case management and Django Admin. It uses existing account, farm, crop, livestock, and report data and presents national aggregates, county filtering, operational distributions, and recent activity without inventing revenue or unsupported service metrics.

| URL | Access | Purpose |
|---|---|---|
| `/platform/login/` | Redirects to the shared staff sign-in | Reuse the existing Django session authentication |
| `/platform/dashboard/` | Super Admin or delegated Staff | View permitted platform or operational summaries |
| `/platform/farms/` | Super Admin or Operational Reporting | Search registered farms and review associated plot and production counts |
| `/platform/crops/` | Super Admin or Operational Reporting | Search read-only crop records |
| `/platform/livestock/` | Super Admin or Operational Reporting | Search livestock groups and individual animal records |
| `/platform/reports/` | Super Admin or Operational Reporting | Search report metadata; private evidence and case handling stay in their existing workflows |
| `/platform/users/farmers/` | Super Admin or Farmer Account Support | Search farmer accounts |
| `/platform/users/staff/` | Super Admin | Search Staff and create Staff accounts |
| `/platform/users/professionals/` | Super Admin or Professional Account Support | Search agricultural professionals |
| `/platform/users/{category}/{id}/` | Authorized directory access | Review permitted account information and status |
| `/platform/reference-data/` | Super Admin or Agricultural Data Managers | Manage existing crop growth-stage reference records |
| `/platform/audit-logs/` | Super Admin or explicitly permitted Staff | Review append-only administrative audit events |

Delegated groups are `Case Coordinators`, `Farmer Account Support`, `Professional Account Support`, `Agricultural Data Managers`, and `Operational Reporting`. A Staff account may belong to more than one group. Every protected view and account service enforces permissions; navigation visibility is not an authorization boundary. Farmer and professional status changes require POST, CSRF, confirmation, and a reason. Staff creation and permission changes are Super Admin-only. Staff accounts receive no Django Admin access and start with a random password; a Super Admin can initiate a time-limited password-reset email through Django's reset flow. Email delivery must be configured by the deployment.

Farm, crop, livestock, and report oversight pages are read-only and available to Super Admins and Staff with operational-reporting permission. The platform navigation collapses into an accessible menu on narrow screens.

Sensitive account, permission, password-reset, and reference-data actions create append-only `AdminAuditEvent` records. The existing `ReportEvent` remains the audit source for case workflow. Super Admins cannot suspend themselves, and account controls prevent deactivating the last active Super Admin. Private report evidence remains governed by the existing farmer/assigned-handler rules; platform oversight does not grant evidence access.

The initial module only exposes features supported by current models. Organization/partnerships, marketplace moderation, AI operations, revenue, generic platform settings, and professional qualification verification are not implemented and are not represented by fabricated metrics. Agricultural professionals keep their existing roles and case-assignment restrictions.

Role and audit-model changes require the checked-in migrations to be reviewed and applied with `python manage.py migrate`.

## Officer and coordinator dashboards

The session-authenticated Django Template interface is served by the same backend, models, permissions, and report workflow services as the APIs. Open `/staff/login/` and sign in with an authorized staff account's email and password. Farmer accounts cannot sign in to staff pages. Dashboard pages require an active account; state-changing forms use Django CSRF protection, and logout is POST-only.

| URL | Access | Purpose |
|---|---|---|
| `/staff/login/` | Public sign-in; authorized Staff and professional accounts | Create a shared staff session |
| `/staff/logout/` | Authenticated staff; POST | End the session |
| `/staff/dashboard/` | Active handler or coordinator | Role-scoped case statistics and recent cases |
| `/staff/cases/` | Active handler or coordinator | Search, filter, and paginate visible cases |
| `/staff/cases/{id}/` | Assigned handler; coordinator for case coordination | View permitted case details and history |
| `/staff/cases/{id}/updates/` | Assigned handler | Add field updates, findings, recommendations, interventions, information requests, resolution summaries, or internal notes |
| `/staff/cases/{id}/transition/` | Assigned handler or coordinator, subject to workflow rules | Perform an allowed status transition |
| `/staff/cases/{id}/reopen/` | Assigned handler or coordinator, subject to workflow rules | Reopen a terminal case |
| `/staff/cases/{id}/assignments/` | Assigned handler or coordinator | Review assignment history; coordinators can assign or transfer cases |
| `/staff/unassigned/` | Coordinator | Review the unassigned queue and assign eligible professionals |
| `/staff/officers/` | Coordinator | Review eligible staff for case assignment |

Handlers are agricultural officers, veterinary officers, agronomists, and field agents. Super Admins and Staff in the Case Coordinators group act as coordinators. Handler pages use the same active-assignment and category eligibility rules as the report API; changing a case ID cannot grant access to another handler's case. Coordinators use existing assignment and workflow services, including category-specific assignee restrictions. No geographic or organizational boundaries are assumed where the project has no such scope model.

Staff updates, assignment changes, and workflow transitions create the existing case audit events. Internal notes are visible only in the staff interface and are excluded from farmer-facing responses. Private evidence links remain restricted to the reporting farmer or a currently assigned, category-authorized handler; coordinator or Super Admin status alone does not grant evidence access. Django Admin at `/admin/` remains available for authorized technical administration and is separate from both custom interfaces.

## Permissions and validation for the new apps

- All crop, livestock, summary, and private-image APIs require an active farmer account. Officer roles do not receive broad data access; scoped officer assignments must be built before exposing records to them.
- Querysets start from farms owned by the authenticated farmer. Foreign farm, crop, group, animal, and image IDs cannot be accessed by changing URL or request IDs.
- Farm and plot IDs are checked against the farmer's farms; a crop plot must belong to its selected farm. Livestock groups must match the selected farm and animals must match their group's farm and species.
- Decimal measurements must be positive. Dates are checked for invalid chronology and future observations. Livestock health observations, activities, assessments, and medical records must reference exactly one animal or one group; database checks enforce the exclusive subject relation.
- `CropAssessment` and `LivestockAssessment` keep AI/professional assessments separate from farmer observations. They are currently admin/internal models only; no AI or professional workflow is implemented in this stage.

## Testing and schema changes

Run all API tests against the configured in-memory SQLite test database (runtime and production settings remain PostgreSQL):

```powershell
python manage.py test apps.accounts apps.farms apps.crops apps.livestock apps.reports apps.market_intelligence apps.platform_admin apps.common --settings=config.settings.test
```

Whenever a model changes, create and review a migration, then apply it:

```powershell
python manage.py makemigrations
python manage.py migrate
```

Migrations are the source of truth for database schema evolution. Do not edit the database schema manually.
