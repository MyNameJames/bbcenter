# Task: Mileage Admin — Redesign to .bb-* P1 Layout

**Date:** 2026-06-28  
**Status:** completed

## Checklist
- [x] 1 PLAN — scoped 5 field ครบ + log file
- [x] 2 GUARD — ไม่แตะ models/budget/approve → skip db-helper + test-first
- [x] 3 BUILD — template + CSS + JS
- [ ] 4 VERIFY — UI check (user verifies in browser at port 5001)
- [x] 5 SYNC — INDEX_ui.md (template row + CSS row + components.css first-adopter note)
- [x] 6 CLOSE — see notes below

## Bug Fix (2026-06-28)
`.mlg-summary-mode--hidden { display: none !important; }` → `display: none;`
— `!important` blocked `$modeSel.style.display = 'flex'` from showing the selected-mode KPI strip when rows were checked.

## Files Changed
- `app/templates/vehicle/admin/vehicle_mileage.html`
- `app/static/vehicle/css/vehicle_mileage.css`
- `app/static/vehicle/js/vehicle_mileage.js`
- `docs/notes/INDEX_ui.md`

## Zone → Component Mapping
| Zone | Component |
|---|---|
| KPI Strip | `.bb-kpi.is-ghost` × 3 (count / distance / cost) |
| Toolbar tabs | `.bb-tabs` / `.bb-tab.is-on` |
| Search | `.bb-search` |
| Buttons | `.bb-btn.is-sec` (Export, Filter) · `.bb-btn.is-pri.is-sm` (adv apply) |
| Table | `.bb-table` + `.bb-th.sortable` + `.bb-sort-icon` |
| Status | `.bb-status.is-ok/wr/neutral` + `.bb-dot` |
| Badges | `.bb-badge.is-accent` |
| Action | `.bb-icon-btn` |
| Nums | `.bb-cell-num` |
| Empty | `.bb-empty` |
| Modal | Bootstrap modal shell · `.bb-btn.*` · `.bb-label` · `.bb-input` · `.bb-hint` |

## Legacy Classes Removed
zen-tabs, zen-tab, zen-search, vc-btn-*, vc-td-*, vc-checkbox,
badge-pill b-full/b-partial/b-neutral/b-accent, kpi-tile, kpi-num,
.sort-icon, .data-table (table class), .vc-modal (simplified)
