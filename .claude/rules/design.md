---
paths:
  - "app/templates/**"
  - "app/static/**/*.css"
  - "app/static/**/*.js"
---

## Design Quick Rules

**ทุกการออกแบบ/แก้ UI · CSS · template → ยึด [design_guideline.md](docs/notes/design_guideline.md) (canonical เดียว).** ของเก่า (design_system / design_dna_redesign / zendenta_migration) = **ลบแล้ว 2026-06-28**.

> 🟢 **guideline v2.1 (2026-07-21) "ink คือโครง เขียวคือสัญญาณ"** — ฐาน ink/monochrome (ปุ่มหลัก/active/text = ink `#000000`), เขียวจำกัดแค่ 2 จุด (พื้น tint `#EAFBF2` + ลิงก์/ghost `#0B7A3E`) · px · เงาดำ · radius binary. โค้ดเดิมยังใช้ `--vc-*` (indigo) + `components.css :root` (น้ำเงิน) จน migrate → **UI ใหม่/redesign ยึด guideline · หน้าเก่ายังไม่แตะ = legacy** · drift ที่ค้าง → guideline §14

**⛔ ผิดบ่อยที่สุด:** `#06C167` contrast บนขาว = **2.38:1** ตกทุกเกณฑ์ → **fill ชิ้นเล็กเท่านั้น** (dot/check). เขียวที่เป็นตัวหนังสือ/ลิงก์/เส้นขอบบนพื้นขาว ต้องใช้ `--bb-accent-dk` `#0B7A3E` (5.43:1) เสมอ · **ปุ่มหลักไม่ใช่เขียวแล้ว ใช้ `--bb-ink`** (v2.1)

**Binary ที่ผิดซ้ำบ่อย (รายละเอียดเต็มใน guideline §8):**
- ✅ ตาราง `<table class="data-table">` — ❌ ห้าม `table-striped`/`table-hover`/`table-bordered`/`table-light`/`table-dark` · ไม่มี zebra · ไม่มีเส้นแนวตั้ง
- ❌ ห้าม `border-left/top` สีพิเศษ บน card/KPI · ❌ ห้าม inline `<script>` ใน modal (JS อยู่ใน .js) · partials กลาง `_shared/` · macro `_components/`
