---
name: module-context
description: "Load module README for context and update it after implementation. Use when: working on any module under src/modules/ (subscriptions, bundled-product, algolia, wishlist, contact, newsletter, region-zipcodes); implementing features, workflows, steps, adapters, API routes, models, or types tied to a module; updating or debugging module-level logic; fixing bugs in module services. Reads the module README before starting to inform decisions, then keeps it in sync after the work is done."
argument-hint: "module name (e.g. subscriptions, bundled-product, algolia)"
---

# Module Context

Loads the relevant module README for context before starting work, then updates it to reflect any changes made.

## When to Use

- Starting work on any module under `src/modules/<name>/`
- Implementing or changing workflows, steps, adapters, API routes, or models that belong to a module
- After any implementation or adjustment that changes module behaviour, architecture, or public interface

## Procedure

### Phase 1 — Identify Module

1. From the user's prompt and the files being discussed, determine which module is the primary target.
   - Module names map to folder names under `src/modules/`: `subscriptions`, `bundled-product`, `algolia`, `wishlist`, `contact`, `newsletter`, `region-zipcodes`.
   - If a file path clearly belongs to a module (e.g. `src/workflows/subscriptions/`, `src/api/store/customers/me/subscriptions/`), infer the module from the path.
   - If multiple modules are in scope, run Phase 2 for each.

### Phase 2 — Load README

2. Look for a README in the module folder using this priority order:
   - `src/modules/<name>/README.md`
   - `src/modules/<name>/*_README.md` (e.g. `SUBSCRIPTION_README.md`)
3. **If found**: read the full file into context before planning or writing any code.
4. **If not found**: note the absence, proceed without it, and create one after implementation (see template below).

### Phase 3 — Update README After Implementation

After completing any implementation or adjustment, update the module README to reflect the change:

5. Identify which sections are affected:
   - New workflow → add/update entry under **Workflows**
   - New or changed step → update the step description inside the relevant workflow or **Shared Steps**
   - New adapter method → update the **Provider Adapter Pattern** interface block
   - New model field or type change → update **Models** and/or **Types**
   - New API route → add row to the **API Routes** table
   - Resolved TODO → remove that item from **Known TODOs**
   - New invariant or business rule → add to an appropriate section (or create a **Business Rules** section)
6. Keep the existing prose style and heading structure.
7. Only update sections that changed — do not rewrite unrelated content.

### New Module README Template

Use this skeleton when a module has no README yet:

```markdown
# <Module Name> Module

Brief description of what this module does and why it exists.

## Architecture

### Models

- **`<Model>`** (`models/<model>.ts`) — fields and purpose

### Service

`service.ts` extends `MedusaService`. Key methods:

### Types (`types.ts`)

Key interfaces and enums.

## Workflows

### `<workflow-name>`

Step-by-step description.

## API Routes

| Method | Path | Description |
|---|---|---|

## Known TODOs

- [ ] item
```

## Notes

- The README file name may be `README.md` or `<MODULE>_README.md` — both are valid; do not rename existing files.
- Keep README updates minimal and scoped to what actually changed.
- The `subscriptions` module README is at `src/modules/subscriptions/SUBSCRIPTION_README.md` and is the most complete example of the expected format.
