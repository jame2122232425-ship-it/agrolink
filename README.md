# AgroLink

## Gamma slide-generation brief

Create a polished 8-slide project overview for **AgroLink**, a Kenya-focused digital farm management and agricultural support platform. The intended audience is agricultural partners, farmer organizations, county teams, and potential pilot supporters. Present AgroLink as a working product in development, not as a scaled service with proven impact.

### One-line pitch

AgroLink brings farm records, crop and livestock monitoring, and agricultural support workflows into one connected workspace for farmers and the teams who serve them.

### The challenge

Farmers and support teams need a practical way to keep farm information, field observations, and requests for help connected. When these activities are handled separately, it is harder to maintain a shared history and follow a case from the initial report through to follow-up.

Do not add unsupported statistics about farmer incomes, crop losses, internet access, or the size of the market.

### Who it serves

- **Farmers:** manage farm and plot records, crops, livestock, and reports.
- **Agricultural and veterinary professionals:** review and follow up on cases assigned to them.
- **Coordinators and platform staff:** oversee permitted workflows, users, and reference information.

### What the product offers

- **Farm workspace:** farmer profiles, farms, plots, and farm activity records.
- **Crop management:** crop cycles, growth stages, farmer-reported observations, and activities.
- **Livestock management:** groups and individual animals, health observations, and care records.
- **Reports and case follow-up:** submit agricultural concerns, attach evidence, and exchange updates with authorized handlers.
- **Market information foundation:** county and commodity catalogues, price observations, and review workflows. The market-trends screen also contains clearly labelled demonstration estimates.
- **Optional AI assistant:** a configurable, Gemini-powered assistant that can use permitted farm context. It is not a substitute for professional agricultural or veterinary advice.

### Example farmer journey

1. Register and create a farmer profile.
2. Add a farm and its plots.
3. Record crops, livestock, and field observations.
4. Submit a concern and, where useful, attach evidence.
5. Follow the case as an authorized professional or coordinator reviews it.

### Why AgroLink

- Keeps farm records and support requests connected to the farmer's operation.
- Supports distinct farmer, professional, coordinator, and administrator workflows.
- Uses role-scoped access for farm data and assigned cases.
- Provides a foundation for county-level agricultural and market information without presenting unverified prices as facts.

### Technology

- **Frontend:** React, TypeScript, and Vite.
- **Backend:** Django and Django REST Framework.
- **Data:** PostgreSQL.
- **Authentication:** email-based accounts and JWT API authentication.
- **Optional AI:** Gemini through a backend provider integration.
- **Deployment setup:** Vercel frontend and Render API; the project also documents hosted PostgreSQL configuration.

### Current status and presentation caveats

- Core farmer account and farm-management workflows connect to the backend. The repository also contains crop, livestock, report, staff, and market API foundations.
- Some adjacent screens and workflows remain demonstrations or local/mock experiences; do not describe every screen as fully integrated.
- The market-trends screen labels its sample prices as demonstration estimates. Project documentation reports that no live external price provider is connected and real price coverage has not been established. Do not present sample prices as live market quotes.
- The AI assistant depends on deployment configuration and a backend API key; do not imply it is enabled in every environment.
- The production frontend is published, but browser requests to the Render API currently fail CORS until the Render service's `CORS_ALLOWED_ORIGINS` environment variable is updated to `https://agrolink-psi-seven.vercel.app` and the service is restarted or redeployed. Do not claim the production registration flow is working until it is verified.
- No adoption, revenue, yield-improvement, or farmer-impact metrics are provided. Do not invent statistics, testimonials, funding, or partnerships.

### Suggested slide sequence

1. **AgroLink — Grow smarter, respond faster**
   Introduce the platform and its connected farm-support promise.
2. **The coordination challenge**
   Explain the need to keep farm records, field observations, and support follow-up together. Use no fabricated statistics.
3. **One workspace for farm operations and support**
   Show how farmers and authorized support teams use the same platform for different tasks.
4. **A farmer's journey**
   Visualize registration → farm records → observations → report → professional follow-up.
5. **The core product modules**
   Cover farms and plots, crops, livestock, reports/cases, market information, and optional AI assistance.
6. **Built for coordinated follow-up**
   Explain assigned cases, role-scoped access, and coordinator workflows.
7. **Technology and responsible data use**
   Show the React frontend, Django API, PostgreSQL, optional Gemini integration, and the distinction between verified observations and demonstrations.
8. **Current status and next steps**
   Be transparent about demo data and production readiness. Propose validating the live deployment, onboarding a pilot group, and establishing authorized market-data sources as next steps—not completed achievements.

### Visual direction for Gamma

Use a clean, modern agricultural-technology style in deep green, leaf green, warm cream, and restrained gold. Combine authentic Kenyan farming imagery with simple product-workflow diagrams and restrained UI mockups. Avoid fake dashboards, invented charts, unsupported partner logos, and unlabelled sample prices. Keep each slide concise, with one main idea and no more than a few short bullets.

## Repository

- The React frontend is in [`frontend/`](./frontend/).
- Backend setup, API details, and implementation notes are in [`backend/README.md`](./backend/README.md).
- Render, Vercel, database, and environment setup are in [`deploy_guide.md`](./deploy_guide.md).
