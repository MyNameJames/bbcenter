# หน้าค่าน้ำมัน → ระบบเงินสำรองและค่าใช้จ่าย (redesign)

**วันที่:** 2026-08-10
**สถานะ:** in-progress (planning เสร็จ · รอ implement)
**ผู้ implement:** (มอบหมายภายหลัง) · **ผู้ตรวจ:** Claude
**ไฟล์หลัก:** `app/templates/vehicle/admin/admin_fuel.html` · `app/views/vehicle/vehicle_fuel.py` · `app/models/vehicle_fuel.py`

> เอกสารนี้เป็น **spec สำหรับคนอื่น implement** — อ่านจบต้องลงมือได้เลยโดยไม่ต้องถามเพิ่ม
> ก่อนเริ่ม: อ่าน [vehicle_product_spec.md](../vehicle_product_spec.md) · [ADR 0001](../adr/0001-clean-architecture-layers.md) · [design_guideline.md](../design_guideline.md) · [CHEATSHEET.md](../../../app/components/CHEATSHEET.md)

---

## 1. เป้าหมาย

หน้านี้คือ **บัญชีเงินสดจริง** ของเจ้าหน้าที่ ไม่ใช่แค่ตัวเลขงบ
เจ้าหน้าที่ใช้สัปดาห์ละ 3–4 ครั้ง — คนขับเอาบิลน้ำมันมาแลกเงินสด เจ้าหน้าที่ควักเงินสำรองจ่าย แล้วรวมบิลไปทำเรื่องเบิกคืน

### ปัญหาที่ต้องแก้ (จากผู้ใช้จริง)

| # | ปัญหา | แก้ด้วย |
|---|---|---|
| 1 | ค่าน้ำมันใช้จริง ≠ ที่หักผ่านงบ | ยอมรับว่าคนละหน่วย (ทริป vs การเติม) → แยกบทบาท + variance report (Phase 5) |
| 2 | เงินสำรองมีหลายคน แยกไม่ออกว่าใครควักเงิน | บัญชีรายคน (`expense_holder`) + `paid_by_holder_id` บนบิล |
| 3 | สำรองไม่ใช่แค่น้ำมัน (ทางด่วน/ซ่อม/พรบ) | `fuel_bill.category` |
| 4 | 3 ช่องทางจ่าย + วงเงินบัตรคุมไม่ได้ | `vehicle_quota` kind=`card` + validate ตอนกรอก |
| 5 | แหล่งเบิกเป็น free text · วงเงินธรรมกายคุมไม่ได้ | `reimbursement_source` + `vehicle_quota` kind=`source` |

### หลักการที่ห้ามละเมิด

**ก. สมการเงินสำรองรายคน — ต้องเป็นจริงตลอดเวลา**
```
วงเงินสำรอง(H) = คงเหลือ(H) + ใช้ไปแล้ว(H) + ทำเรื่องเบิกแล้ว(H)
```
`คงเหลือ` เป็นค่า **derived** ห้ามเก็บเป็น column (ไม่งั้นจะ drift)

**ข. แยก 2 มิติเด็ดขาด — ผิดข้อนี้คือพังทั้งระบบ**

| มิติ | นับบิลไหน | ใช้ที่ไหน |
|---|---|---|
| **เงิน** | เฉพาะ `payment_method='reserve'` | KPI เงินสำรอง · ใบเบิก · tab ค้างเบิก |
| **น้ำมัน** | **ทุกใบ รวม `card` และ `self`** | pivot · ภาพรวมทั้งปี · km/ลิตร |

เหตุผล: User เติมเอง 1,000 คั่นระหว่างบิลของเจ้าหน้าที่ ถ้าไม่นับ `self` เลขไมล์จะห่างผิดปกติและ km/L เพี้ยน

**ค. ทุก mutation เงิน/สถานะ ผ่าน service เท่านั้น** (ADR 0001) — ห้ามเขียนใน controller

---

## 2. การตัดสินใจที่ล็อกแล้ว (ห้ามเปลี่ยนเองระหว่างทำ)

| # | เรื่อง | ผลสรุป |
|---|---|---|
| D1 | KPI bar | ของ **คนที่ล็อกอินคนเดียว** ไม่รวมทุกคน · อยากดูคนอื่น → tab เจ้าหน้าที่ |
| D2 | คนล็อกอินไม่ใช่ผู้สำรองเงิน | KPI bar **ว่างเปล่า** |
| D3 | บรรทัดโควตา | เอา **2 อันดับที่เหลือมากที่สุด** (คละบัตร/ธรรมกาย) |
| D4 | บิล `card` / `self` | เข้า tab **"จบแล้ว"** (tab 3 เปลี่ยนความหมายจาก "ได้เงินคืน") |
| D5 | filter chip | ตัวเลือก = **ทะเบียนรถ + "อื่นๆ"** · **ทุกอย่างที่ไม่ใช่ค่าน้ำมัน → อื่นๆ** (แม้ผูกรถได้) · บิลน้ำมันที่ไม่มีรถ → อื่นๆ |
| D6 | วงเงินสำรองรายคน | อยู่ **tab เจ้าหน้าที่ ที่เดียว** (ไม่อยู่ในปุ่มเฟือง) |
| D7 | เลขใบเบิก | **กรอกมือ** ไม่ gen ไม่ validate format |
| D8 | ใครตั้งวงเงินสำรอง | เจ้าหน้าที่ตั้งเองได้ → **บังคับกรอกเหตุผล + log ทุกครั้ง** |
| D9 | A แก้/ลบบิลของ B | **ได้** → ต้อง log ผู้แก้ · แต่บิลในใบเบิกที่ส่งแล้ว **ล็อก** |
| D10 | ใบเบิก | **1 ใบ = 1 แหล่งเบิก** |
| D11 | บัตรเต็มกลางบิล | **ไม่รองรับ** — 1 บิล = 1 วิธีจ่าย (ยืนยันแล้วว่าไม่เกิดจริง) |
| D12 | บิลเก่า | หมวด = "น้ำมัน" ทั้งหมด · ผู้สำรอง = เจ้าหน้าที่หลัก 1 คน |
| D13 | ยังไม่ทำ | พิมพ์ใบแนบใบเบิก · หน้ารายการบิลข้อมูลไม่ครบ (เก็บ data ไว้ ทำ UI ทีหลัง) |

### สมมติฐาน (ถ้าไม่ตรงให้ทักก่อนลงมือ)

- **A1** โควตาทั้ง 2 แบบนับตาม `bill_date` (วันเติมจริง) ไม่ใช่วันกรอก · รีเซ็ตวันที่ 1 ของเดือน
- **A2** ปีในระบบ = **ปีปฏิทิน** (ตามของเดิม) ไม่ใช่ปีงบประมาณ
- **A3** "จ่ายเอง" (`self`) ไม่ผูก booking — เก็บเป็นประวัติการเติมอย่างเดียว ไม่ซ้ำกับ flow personal ในหน้างบ

---

## 3. Database

> ⚠️ ต้อง spawn `db-helper` — gen `.sql` + sync `schema.md` Part 1+2 + `migrations-index.md` ในรอบเดียว
> ไฟล์: `app/migrations/2026-08-10_fuel-reserve-multi-holder.sql`

### 3.1 ตารางใหม่

**`expense_holder`** — ผู้สำรองเงิน
| column | type | หมายเหตุ |
|---|---|---|
| id | Integer PK | |
| user_id | FK user.id, unique, not null | 1 user = 1 บัญชีสำรอง |
| float_amount | Numeric(12,2) default 0 | วงเงินสำรองสะสมที่ได้รับ |
| is_active | Boolean default True | |
| created_at / updated_at | DateTime | `get_bkk_time` |

**`reimbursement_source`** — แหล่งเบิก
| column | type | หมายเหตุ |
|---|---|---|
| id | Integer PK | |
| name | String(100) not null | 'DCI' · 'วัดพระธรรมกาย' |
| is_default | Boolean default False | DCI = True |
| is_active | Boolean default True | |

**`vehicle_quota`** — โควตาต่อรถต่อเดือน (บัตร + แหล่งเบิก)
| column | type | หมายเหตุ |
|---|---|---|
| id | Integer PK | |
| vehicle_id | FK vehicle.id not null | |
| kind | String(20) not null | `card` \| `source` |
| source_id | FK reimbursement_source.id nullable | required เมื่อ kind=`source` |
| limit_amount | Numeric(12,2) not null | เช่น 5000 |
| effective_from | Date not null | **ห้ามเขียนทับแถวเดิม — แก้วงเงิน = insert แถวใหม่** |
| created_by / created_at | | |

> lookup: แถวที่ `vehicle_id + kind (+source_id)` ตรง และ `effective_from <= วันสุดท้ายของเดือนนั้น` · เอา `effective_from` ล่าสุด
> เหตุผลที่ต้อง effective-dated: ผู้ใช้ยืนยันว่าวงเงินเปลี่ยนได้ ถ้าเขียนทับ เดือนย้อนหลังจะคำนวณผิดทันที

**`reimbursement_settlement`** — คืนเงินรายคน
| column | type | หมายเหตุ |
|---|---|---|
| id | Integer PK | |
| reimbursement_id | FK not null | |
| holder_id | FK expense_holder.id not null | |
| amount | Numeric(12,2) not null | snapshot ตอนกด "ส่งเรื่อง" |
| settled_at | Date nullable | null = ยังไม่คืน |
| | | UniqueConstraint(reimbursement_id, holder_id) |

### 3.2 ตารางเดิมที่ต้องแก้

**`fuel_bill`** — เพิ่ม column (ไม่ rename ตาราง — แพงเกินคุ้ม)
| column | type | หมายเหตุ |
|---|---|---|
| category | String(20) not null default 'fuel' | `fuel` \| `toll` \| `repair` \| `insurance` \| `other` |
| paid_by_holder_id | FK expense_holder.id nullable | **null เมื่อ method ≠ reserve** |
| liters | Numeric(8,2) nullable | optional — ไม่บังคับ |
| vehicle_id | **เปลี่ยนเป็น nullable** | บิลไม่มีชื่อรถ → null |
| payment_method | เปลี่ยนค่า `transfer` → **`reserve`** | ชื่อเดิมสื่อผิด (label ว่า "เงินสด" แต่ค่าเป็น transfer) |

**`fuel_reimbursement`**
| column | หมายเหตุ |
|---|---|
| source_id | FK reimbursement_source.id nullable — แทน `source` (String) เดิม · เก็บ column เดิมไว้ก่อนจน migrate ครบ |
| status | String(20) default 'draft' — `draft` \| `submitted` \| `received` |
| amount_requested | Numeric(12,2) nullable — ยอดที่เขียนในใบเบิก |
| amount_received | Numeric(12,2) nullable — ยอดที่ได้จริง |

**`fuel_reserve_log`**
| column | หมายเหตุ |
|---|---|
| holder_id | FK expense_holder.id not null |
| log_type | String(20) — `set_float` \| `top_up` \| `adjust` \| `count` |

**`FuelReserveConfig`** — เลิกใช้ (deprecated) ไม่ลบตาราง เก็บไว้อ้างอิงประวัติ

### 3.3 Migration + backfill (ลำดับสำคัญ)

```
1. สร้างตารางใหม่ 4 ตัว
2. INSERT expense_holder ของเจ้าหน้าที่หลัก 1 คน
   float_amount = FuelReserveConfig.amount เดิม
3. เพิ่ม column ใน fuel_bill / fuel_reimbursement / fuel_reserve_log
4. UPDATE fuel_bill SET category='fuel'
5. UPDATE fuel_bill SET payment_method='reserve' WHERE payment_method='transfer'
6. UPDATE fuel_bill SET paid_by_holder_id=<holder หลัก> WHERE payment_method='reserve'
7. UPDATE fuel_reserve_log SET holder_id=<holder หลัก>, log_type='adjust'
8. UPDATE fuel_reimbursement SET status = CASE
       WHEN received_at IS NOT NULL THEN 'received'
       ELSE 'submitted' END
9. INSERT reimbursement_source: 'DCI' (is_default=1), 'วัดพระธรรมกาย'
10. INSERT reimbursement_settlement ย้อนหลัง — 1 แถวต่อใบเบิกเดิม
    (holder=หลัก, amount=Σ บิลในใบนั้น, settled_at=received_at)
```

⚠️ **ต้องรัน 5 ก่อน 6** ไม่งั้นจับบิลเงินสำรองไม่ครบ
⚠️ ก่อนรันจริงบน prod → backup ก่อนเสมอ

**จุดที่ต้องแก้ตามการ rename `transfer`→`reserve`** (มีแค่ 6 จุด):
`vehicle_fuel.py:44,45,62,159` · `vehicle_fuel.js:105,114` · `admin_fuel.html:320` · `modals/fuel_bill.html:69`

---

## 4. Business rules (ให้ implement ใน service — ห้าม inline ใน controller/template)

ไฟล์ใหม่: **`app/services/vehicle/fuel_service.py`** (ตาม ADR 0001 — orchestrate + commit)
pure logic ที่ไม่แตะ DB → **`app/domain/vehicle/fuel.py`** (ไฟล์เดิม)

### 4.1 KPI เงินสำรองรายคน

```
H = expense_holder ของ current_user (ไม่มี → KPI ว่างเปล่า, D2)

ใช้ไปแล้ว(H)        = Σ amount WHERE payment_method='reserve'
                              AND paid_by_holder_id = H
                              AND (reimbursement_id IS NULL
                                   OR ใบเบิกนั้น status='draft')

ทำเรื่องเบิกแล้ว(H)  = Σ settlement.amount WHERE holder_id = H
                                       AND settled_at IS NULL

คงเหลือ(H)          = H.float_amount − ใช้ไปแล้ว(H) − ทำเรื่องเบิกแล้ว(H)
```

**เงินหมุนกลับ:** กด "คืนเงิน" ให้ H → `settlement.settled_at` มีค่า → ยอดหลุดจาก *ทำเรื่องเบิกแล้ว* → ไหลกลับ *คงเหลือ* อัตโนมัติ (เพราะ derived)

### 4.2 โควตา

```
โควตาใช้ไป(รถ V, เดือน M, kind=card)
    = Σ amount WHERE vehicle_id=V AND payment_method='card'
                 AND YEAR(bill_date)+MONTH(bill_date) = M

โควตาใช้ไป(รถ V, เดือน M, kind=source, source S)
    = Σ amount WHERE vehicle_id=V
                 AND bill อยู่ในใบเบิกที่ source_id=S
                 AND YEAR(bill_date)+MONTH(bill_date) = M

เหลือ = limit(V, kind, M) − ใช้ไป
```

**ใช้ 3 จุด — ต้องเรียก helper ตัวเดียวกันทั้งหมด:**
1. บรรทัดโควตาใน KPI bar (top 2 ที่เหลือมากสุด, เฉพาะที่เหลือ > 0)
2. ตอนกรอกบิล เลือก `card` → โชว์เหลือเท่าไหร่ + เกิน = block
3. ตอนใส่บิลเข้าใบเบิกที่ source มีโควตา → เตือน/block ถ้าเกิน

### 4.3 สถานะบิล (derived ห้ามเก็บ)

| สถานะ | เงื่อนไข | อยู่ tab |
|---|---|---|
| ใช้ไปแล้ว | `reserve` + (`reimbursement_id IS NULL` **หรืออยู่ในใบเบิก `draft`**) | ค้างเบิก (ติ๊กเลือกได้ · ถ้าอยู่ในร่างแล้วให้ badge บอกว่าอยู่ร่างไหน) |
| ทำเรื่องเบิกแล้ว | `reserve` + อยู่ในใบเบิก + settlement ยังไม่ settled | ค้างเบิก (ติ๊กไม่ได้) |
| ได้เงินคืนแล้ว | `reserve` + settlement settled | จบแล้ว |
| ตัดบัตร | `payment_method='card'` | จบแล้ว |
| จ่ายเอง | `payment_method='self'` | จบแล้ว |

### 4.4 สถานะใบเบิก + การล็อก

| สถานะ | ทำอะไรได้ | บิลข้างในล็อกไหม |
|---|---|---|
| `draft` (ร่าง) | เพิ่ม/ถอดบิล · แก้ข้อมูลใบ · ลบใบ | ไม่ล็อก |
| `submitted` (ส่งแล้ว) | บันทึกได้เงิน · คืนเงินรายคน | **ล็อก** — แก้/ลบ/ย้ายไม่ได้ (D9) |
| `received` (ได้เงิน) | ดูอย่างเดียว | ล็อก |

**ตอน `draft → submitted`:** snapshot `reimbursement_settlement` 1 แถวต่อผู้สำรอง (amount = Σ บิลของคนนั้นในใบ) + บันทึก `amount_requested` + `submitted_at`
**ตอนได้เงิน:** บันทึก `amount_received` + ติ๊กคืนเงินรายคน (`settled_at`) — คืนคนละวันได้

### 4.5 Validation ตอนกรอกบิล

| กฎ | ระดับ |
|---|---|
| คนขับ — **บังคับ** | block |
| รถ — ไม่บังคับ (เลือก "ไม่ระบุ" ได้ ไม่ใช่เว้นว่าง) | — |
| เลขไมล์ — ไม่บังคับ · ถ้ากรอกต้อง ≥ ไมล์ล่าสุดของคันนั้น | block |
| เลขไมล์กระโดด > 2,000 กม. จากครั้งก่อน | เตือน (ไม่ block) |
| `card` + เกินโควตาเดือนนั้น | **block** + แนะให้เปลี่ยนเป็นเงินสำรอง (D11) |
| `reserve` → `paid_by_holder_id` = holder ของคนล็อกอิน (default) แต่เปลี่ยนได้ | — |
| `card` / `self` → `paid_by_holder_id` = **null เสมอ** | block ถ้าไม่ null |
| หมวด ≠ `fuel` → ไม่ต้องมีเลขไมล์/ลิตร | — |

---

## 5. UI spec

### 5.1 โครงหน้า

```
page-title: "เงินสำรองและค่าใช้จ่าย"                        [⚙ ตั้งค่า]
────────────────────────────────────────────────────────────
KPI BAR (ของคนล็อกอิน — D1)
  เงินสำรอง
  ฿20,000
  ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░
  ● ใช้ไปแล้ว ฿5,000  ● ทำเรื่องเบิกแล้ว ฿10,000  ● คงเหลือ ฿5,000
  ──────────────────────────
  เหลืออีก 6 วันสิ้นเดือน
  ศม 139 ตัดบัตรได้อีก ฿3,000 · ฮฉ 5064 เบิกธรรมกายได้อีก ฿2,000
────────────────────────────────────────────────────────────
[ ภาพรวมทั้งปี ][ ค้างเบิก ][ จบแล้ว ][ ใบเบิกเงิน ][ เจ้าหน้าที่ ]
```

- shell: `_base_ue.html` (migrate แล้ว 2026-08-10 — เหลือ retokenize `--vc-*` → `--bb-*`)
- tab: `_shared/tab2.html` → `tab2_tabs([...])` (macro render markup อย่างเดียว — ผูก click สลับ panel เองใน JS เหมือน `vehicle_fleet.js`)
- **KPI bar อ้างอิงดีไซน์จากหน้า budget** (label เล็ก → ตัวเลขใหญ่ + meta → progress bar → legend dot → เส้นคั่น → บรรทัดล่าง)
- KPI ว่างเปล่า (D2): แสดงกล่องเดิม + ข้อความบรรทัดเดียว "คุณไม่ได้เป็นผู้สำรองเงิน" + ลิงก์ไป tab เจ้าหน้าที่ — **ห้าม** ใส่ empty-state ใหญ่ (layout จะกระโดด)

### 5.2 Tab 1 — ภาพรวมทั้งปี

- pivot **รถ × เดือน** (ของเดิม) — **นับทุก payment_method** (หลักการ ข.)
- filter ปี
- คลิกช่อง → ไป tab ค้างเบิก/จบแล้ว พร้อม filter รถ+เดือน
- ยังไม่ต้องทำ km/L + variance (Phase 5)

### 5.3 Tab 2 — ค้างเบิก

- ปุ่ม **"บิลใหม่"** อยู่ที่ tab นี้ **ที่เดียว** (ตาม D)
- filter chip (`ue_chip` จาก `_components/bb/ue_chip.html`): ทะเบียนรถแต่ละคัน + "อื่นๆ" (D5)
- ตาราง: วันที่ · รถ · คนขับ · จำนวน · ช่องทาง · เลขไมล์ · ผู้สำรอง · สถานะ · action
- เรียง `bill_date` ใหม่ → เก่า
- checkbox **เฉพาะแถว "ใช้ไปแล้ว"** · แถว "ทำเรื่องเบิกแล้ว" ติ๊กไม่ได้ + badge ต่างสี
- ปุ่ม "ใส่ใบเบิก" (enable เมื่อเลือก ≥1) → modal เลือกใบเบิก `draft` ที่มีอยู่ **หรือกด "+ สร้างใบเบิกใหม่" ในตัว** (ห้ามบังคับให้ไป tab 4 ก่อน)
- ⚠️ modal เลือกใบเบิก: กรองเหลือเฉพาะใบที่ **ทุกบิลที่เลือกมีสิทธิ์ในแหล่งนั้น** (D10)
- ตาราง: `class="bb-table"` เท่านั้น — ห้าม `table-striped/hover/bordered/light`

### 5.4 Tab 3 — จบแล้ว (D4)

- บิลที่ได้เงินคืนแล้ว **+ ตัดบัตร + จ่ายเอง**
- filter chip เดียวกับ tab 2 + chip สถานะย่อย (ได้เงินคืน / ตัดบัตร / จ่ายเอง)
- ปุ่ม **Export Excel** (route เดิม `fuel.export_excel`)

### 5.5 Tab 4 — ใบเบิกเงิน

- ตาราง: เลขที่ · แหล่งเบิก · สถานะ · จำนวนบิล · ยอดรวม · วันส่ง · วันได้เงิน
- ปุ่ม "สร้างใบเบิก" → modal: เลขที่ (กรอกมือ D7) · แหล่งเบิก (dropdown) · หมายเหตุ → สร้างเป็น `draft`
- เปิดใบ → เห็นบิลข้างใน + **ยอดรวมตัวใหญ่ให้คัดลอกไปเขียนในใบเบิกจริง** (แก้ปัญหาเขียนเลขผิด) + ปุ่มเพิ่ม/ถอดบิล (เฉพาะ `draft`)
- ปุ่ม "ส่งเรื่อง" → กรอก `amount_requested` (default = ยอดรวมบิล) · **ถ้าพิมพ์ไม่ตรงยอดรวม → เตือนก่อนยืนยัน** · snapshot settlement · ล็อกบิล
- ปุ่ม "บันทึกได้เงิน" → `amount_received` + วันที่
- **ตารางคืนเงินรายคน**: A ฿10,000 [คืนแล้ว ✓] · B ฿5,000 [ปุ่มคืนเงิน] — คืนคนละวันได้
- ใบ `draft` ที่ค้าง > 14 วัน → badge เตือน

### 5.6 Tab 5 — เจ้าหน้าที่ (เดิม "ผู้ดูแลงบ")

- ตาราง: ชื่อ · account ที่ผูก · วงเงินสำรอง · ใช้ไปแล้ว · ทำเรื่องเบิกแล้ว · คงเหลือ · สถานะ
- ปุ่ม "เพิ่มเจ้าหน้าที่" → เลือก user + ตั้งวงเงินเริ่มต้น
- ปุ่มต่อแถว: **ตั้ง/แก้วงเงิน** (D6) · **เติมเงินสำรอง** · **นับเงินจริง** · ดูประวัติ
- **นับเงินจริง**: กรอกเงินในมือจริง → ระบบเทียบกับ `คงเหลือ` → โชว์ส่วนต่าง → บันทึก log `count` (ไม่แก้ float) → ถ้าต้องปรับ ให้กด `adjust` แยกอีกขั้น (auditable 2 ขั้น ไม่รวบ)
- ทุก action **บังคับกรอกเหตุผล** (D8)

### 5.7 ปุ่มเฟือง (มุมขวาบน → modal)

- ราคาน้ำมัน/ลิตร (ของเดิม)
- แหล่งเบิก (CRUD `reimbursement_source`)
- งบทั้งปี (`SystemConfig['fuel_annual_budget']` ของเดิม)
- ❌ **ไม่มี** วงเงินรายคน (อยู่ tab 5 — D6)

### 5.8 หน้า fleet (`vehicle_fleet.html`)

- `#addVehicleModal` เพิ่ม section **"วงเงินและสิทธิ์เบิก"** (โผล่เฉพาะ edit เหมือน `#avServiceSection`)
  - ☑ มีบัตรน้ำมัน + วงเงิน/เดือน
  - ☑ เบิกธรรมกายได้ + วงเงิน/เดือน
- ตาราง tab รถ: เพิ่ม chip เล็ก "บัตร ฿5,000 · ธรรมกาย ฿5,000"
- **บันทึก = insert `vehicle_quota` แถวใหม่ (effective_from = วันที่ 1 ของเดือนปัจจุบัน) ห้าม UPDATE แถวเดิม**

---

## 6. Routes

| Endpoint | Method | สถานะ | หมายเหตุ |
|---|---|---|---|
| `fuel.admin_fuel` | GET | 🔧 | ส่ง context ครบ 5 tab |
| `fuel.create_bill` / `edit_bill` / `delete_bill` | POST | 🔧 | + category · paid_by · liters · validate §4.5 |
| `fuel.create_reimbursement` | POST | 🔧 | สร้าง `draft` เปล่า (ไม่ต้องมีบิล) |
| `fuel.attach_bills` | POST | 🆕 | ใส่บิลเข้าใบเบิก (เช็กสิทธิ์แหล่ง) |
| `fuel.detach_bill` | POST | 🆕 | ถอดบิล (เฉพาะ `draft`) |
| `fuel.submit_reimbursement` | POST | 🆕 | `draft→submitted` + snapshot settlement + ล็อก |
| `fuel.receive_reimbursement` | POST | 🔧 | + `amount_received` |
| `fuel.settle_holder` | POST | 🆕 | คืนเงินรายคน |
| `fuel.holder_create/update` | POST | 🆕 | เจ้าหน้าที่ + วงเงิน |
| `fuel.holder_topup` / `holder_adjust` / `holder_count` | POST | 🆕 | บังคับ note |
| `fuel.source_create/update/delete` | POST | 🆕 | แหล่งเบิก |
| `fuel.api_quota` | GET | 🆕 | JSON โควตาเหลือของรถ+เดือน (ให้ JS ตอนกรอกบิล) |
| `fuel.export_excel` | GET | ✅ | ย้ายปุ่มไป tab จบแล้ว |
| `vehicle.manage_fleet` | POST | 🔧 | + action บันทึก `vehicle_quota` |

Response pattern ตาม `.claude/rules/backend-python.md`: form POST → flash+redirect · AJAX → `jsonify({'ok':…})`
Error: `current_app.logger.exception('<route> failed')` + flash ข้อความกลาง — **ห้าม `flash(str(e))`**

---

## 7. Phase + Definition of Done

| Phase | งาน | DoD |
|---|---|---|
| **P1** | DB + migration + backfill + `fuel_service.py` (KPI + โควตา) | `pytest` เขียว · รัน .sql บน dev แล้วยอดรวมบิลเท่าเดิม · KPI ของเจ้าหน้าที่หลักตรงกับ `FuelReserveConfig` เดิม |
| **P2** | tab เจ้าหน้าที่ + KPI bar | เพิ่มเจ้าหน้าที่คนที่ 2 → KPI แยกกัน · นับเงินจริงบันทึก log ได้ · สมการ §1.ก เป็นจริง |
| **P3** | tab ค้างเบิก + บิลใหม่ + validate โควตา | กรอกบิล `card` เกินโควตา → block · บิล `self` ไม่กระทบ KPI แต่โผล่ใน pivot |
| **P4** | tab ใบเบิก + คืนเงินรายคน | ใบเบิก 1 ใบ บิล 2 คน → คืนแยกกันได้ · หลังคืน KPI ทั้ง 2 คนถูกต้อง · บิลใน `submitted` แก้ไม่ได้ |
| **P5** | tab จบแล้ว + ภาพรวม + fleet config | บิล card/self มีที่อยู่ · แก้วงเงินแล้วเดือนเก่าไม่เปลี่ยน |

**ทุก Phase ต้องมี test** สำหรับ logic เงิน/สถานะ (`tests/`) — เขียน test **ก่อน** แก้ code (devloop GUARD)

### Test ที่ต้องมีอย่างน้อย
1. สมการ `float = คงเหลือ + ใช้ไปแล้ว + ทำเรื่องเบิกแล้ว` ทุก state transition
2. บิล 2 คนในใบเบิกเดียว → คืนทีละคน → ยอดแต่ละคนถูก
3. โควตาบัตรข้ามเดือน (บิล 31 ก.ค. ไม่กินโควตา ส.ค.)
4. แก้ `vehicle_quota` แล้วเดือนย้อนหลังไม่เปลี่ยน
5. บิล `card`/`self` ไม่กระทบ KPI เงินสำรอง แต่เข้า pivot
6. บิลใน `submitted` แก้/ลบไม่ได้

---

## 8. Review checklist (Claude ใช้ตรวจ)

**เงิน/ความถูกต้อง**
- [ ] `คงเหลือ` เป็น derived ไม่มี column
- [ ] `paid_by_holder_id` = null ทุกบิล `card`/`self`
- [ ] มิติเงิน vs มิติน้ำมัน แยกจริง (pivot รวม self ไหม)
- [ ] `vehicle_quota` insert ไม่ update
- [ ] โควตานับตาม `bill_date`
- [ ] settlement snapshot ตอน submit ไม่ใช่คำนวณสดทุกครั้ง
- [ ] บิลใน `submitted`/`received` ล็อกจริงทั้ง server-side (ไม่ใช่แค่ซ่อนปุ่ม)

**Architecture**
- [ ] logic เงิน/สถานะอยู่ `services/vehicle/fuel_service.py` ไม่ใช่ controller
- [ ] โควตา/KPI มี helper ตัวเดียว ไม่ copy สูตร
- [ ] ไม่มี `print()` · ไม่มี import กลางฟังก์ชัน · ไม่มี `flash(str(e))`
- [ ] function ≤ 60 บรรทัด

**Design**
- [ ] `class="bb-table"` ไม่มี Bootstrap table class
- [ ] token `--bb-*` (ไม่เพิ่ม `--vc-*` ใหม่)
- [ ] ไม่มี inline `<script>` ใน modal
- [ ] icon = `material-symbols-rounded` ตรงๆ ไม่ใช่ `data-lucide`
- [ ] KPI ว่างเปล่าแล้ว layout ไม่กระโดด

**Docs (Maintenance Protocol)**
- [ ] `schema.md` Part 1 + Part 2 (มีเหตุผล)
- [ ] `migrations-index.md` + ไฟล์ `.sql`
- [ ] `INDEX_routes.md` (route ใหม่ 10+ ตัว)
- [ ] `INDEX_code.md` § Key Functions + Database Models
- [ ] `INDEX_ui.md` § Templates
- [ ] `vehicle_product_spec.md` §11 (gotcha เงินสำรองรายคน)
- [ ] `.claude/rules/vehicle-domain.md` (แก้บรรทัด `_depletes_reserve` เดิม)

---

## 9. นอก scope (บันทึกไว้ ไม่ทำรอบนี้)

→ ย้ายเข้า [future_features.md](../future_features.md) เมื่อปิดงาน

1. พิมพ์ใบแนบใบเบิก (D13)
2. หน้ารายการบิลข้อมูลไม่ครบ + สถิติคนขับส่งบิลไม่ครบ (D13)
3. km/ลิตร จริง + calibrate `vehicle.fuel_rate` (ปัญหา #1 เต็มรูปแบบ)
4. variance งบตัด vs จ่ายจริง ต่อรถต่อเดือน
5. เตือน "ไมล์ห่างผิดปกติ ไม่มีบิลคั่น" (จับบิลหาย/น้ำมันรั่ว)
6. เตือนโควตาใกล้หมดอายุสิ้นเดือน (use-it-or-lose-it)
7. retokenize `admin_fuel.html` `--vc-*` → `--bb-*` ครบไฟล์

---

## 10. ไฟล์ที่จะถูกแก้

```
app/models/vehicle_fuel.py                         (+4 model, +column)
app/models/__init__.py                             (+__all__)
app/migrations/2026-08-10_fuel-reserve-multi-holder.sql   (ใหม่)
app/services/vehicle/fuel_service.py               (ใหม่)
app/views/vehicle/vehicle_fuel.py                  (+10 route)
app/views/vehicle/vehicle_admin.py                 (manage_fleet + quota)
app/templates/vehicle/admin/admin_fuel.html        (5 tab)
app/templates/vehicle/admin/modals/fuel_*.html     (บิล/ใบเบิก/เจ้าหน้าที่/ตั้งค่า)
app/templates/vehicle/admin/vehicle_fleet.html     (section วงเงิน)
app/static/vehicle/js/vehicle_fuel.js              (tab + validate + AJAX)
app/static/vehicle/js/vehicle_fleet.js             (quota field)
tests/test_fuel_*.py                               (ใหม่)
```

---

## Docs sync checklist (ก่อน `จบงาน`)
- [ ] INDEX.md
- [ ] INDEX_routes.md
- [ ] INDEX_code.md
- [ ] INDEX_ui.md
- [ ] schema.md Part 1 + Part 2
- [ ] migrations-index.md
- [ ] vehicle_product_spec.md §11
- [ ] .claude/rules/vehicle-domain.md
- [ ] future_features.md (ข้อ 9)
