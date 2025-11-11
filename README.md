## KairosPulse Script Tracker Dashboard

This repository hosts the KairosPulse script tracking dashboard built with Next.js 16 (App Router + Turbopack). It ingests the Koyfin execution workbook, exposes an admin interface for managing daily status overrides, and renders a grouped dashboard for foundational and automated notebooks.

### Prerequisites

- Node.js 18+
- npm 9+
- Excel workbook at `src/components/Koyfin Dashboard and PA nbs Execution Details_Latest 1 - SriniK.xlsx`

### Installation & Local Development

```bash
npm install
npm run dev
# visit http://localhost:3000
# admin tools: http://localhost:3000/admin
```

If the workbook path differs, update `WORKBOOK_RELATIVE_PATH` in `src/lib/loadExcel.ts` or drop the file into the expected location.

### Project Structure

- `app/page.tsx` — main dashboard entry point
- `app/admin/page.tsx` — admin override interface with tabbed view
- `app/api/*` — JSON APIs for dashboard data and status overrides
- `src/lib/loadExcel.ts` — workbook ingestion + override merging
- `data/statusOverrides.json` — persisted manual overrides

### Editing Markdown Documentation

1. Open the `.md` file (e.g., this `README.md`) in your editor.
2. Use standard Markdown syntax for headings, lists, and code blocks.
3. Keep line lengths under ~100 characters for readability.
4. Run `npx prettier README.md` to format if Prettier is configured; otherwise ensure consistent spacing by hand.
5. Commit changes with a descriptive message: `git commit -am "docs: update readme with setup steps"`.

### Useful Scripts

- `npm run dev` — Start development server with Turbopack.
- `npm run lint` — Run ESLint against the project.
- `npm run build` — Generate production build.
- `npm run start` — Serve the production build locally.

### Data Override Workflow

1. Navigate to `http://localhost:3000/admin`.
2. Pick **Foundational** or **Automated** tab.
3. Use the table columns to update status, date label, and remarks.
4. Click **Save changes** to persist to `data/statusOverrides.json`.
5. Refresh the dashboard to confirm new values.

### Deployment Notes

The app can be deployed to any environment that supports Node.js (Vercel, AWS Amplify, ECS, etc.). Ensure the workbook and `data/` directory are accessible to the runtime, or replace the Excel ingestion with a data service.
