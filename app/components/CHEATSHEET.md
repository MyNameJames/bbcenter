# BBCenter Component Cheatsheet

> **ประตูเดียวสำหรับเลือก/ใช้ component** — เปิดไฟล์นี้ก่อนเสมอ **ห้าม glob/grep `app/components/`**
> ตัวอย่างทุกบรรทัด copy-paste ได้จริง · gallery มองด้วยตา → `/dev/components`
> source = `app/components/*.py` · ถ้า signature ไม่ตรง = ไฟล์นี้ outdated → อัปเดตหลังแก้

## วิธีใช้ร่วม (เหมือนกันทุก component)

```python
# controller (view)
from components import Empty, Button
empty = Empty('ยังไม่มีรายการ', action=Button('เพิ่ม', icon='plus'))
return render_template('page.html', empty=empty)
```
```jinja
{# jinja — render อย่างเดียว #}
{{ component(empty) }}
```

ทุก component รับ `**kw` ร่วม: `id=None · class_name='' · visible=True` (visible=False → ไม่ render)
event ทุกตัวลงท้าย `on_*` → ออกเป็น `data-action` (controller ผูก listener เอง)

---

## Form / Input

| Component | Signature | ตัวอย่าง |
|---|---|---|
| **Input** | `Input(name, label='', value='', placeholder='', icon=None, hint='', error='', type='text', disabled=False, required=False)` | `Input('phone', 'เบอร์โทร', icon='phone', required=True)` |
| **Search** | `Search(placeholder='ค้นหา…', name='', value='', on_input='')` | `Search('ค้นหาทะเบียน', on_input='search')` |
| **Button** | `Button(text='', variant='pri', size=None, icon=None, icon_only=False, disabled=False, on_click=None, type='button')` | `Button('บันทึก', 'pri', icon='check', on_click='save')` |
| **DateRange** | `DateRange(name_start='date_start', name_end='date_end', start='', end='', preset='', placeholder='ทั้งหมด', align='left')` | `DateRange(placeholder='เลือกช่วงวันที่')` |
| **Combo** | `Combo(name='', options=[{'value','label'}], value='', placeholder='เลือก…', search_placeholder='ค้นหา…')` | `Combo('driver_id', options=drivers, placeholder='เลือกคนขับ')` |
| **Upload** | `Upload(name='file', accept='', multiple=False, hint='…')` | `Upload('attachment', accept='image/*,.pdf', multiple=True)` |
| **Slider** | `Slider(min=0, max=100, step=1, unit='', dual=False, scale=True, name='value', value=None, name_min='', name_max='', start=None, end=None)` | `Slider(name='dist', min=0, max=500, step=10, start=50, end=300, unit='กม.', dual=True)` |

- Button `variant`: `pri \| sec \| ghost \| danger` · `size`: `None \| 'sm'` · `icon_only=True` = ปุ่มไอคอนล้วน
- DateRange `preset`: `'' \| today \| 7d \| 4w \| 3m \| 6m \| 12m \| mtd \| qtd \| ytd` · ต้อง include `bb-daterange.js`
- Combo `options` = list ของ dict `{'value','label'}` · event `bb-combo:change` · Upload event `bb-upload:change`
- **Slider** `dual=True` = เลือกช่วง (hidden `name_min/name_max`) · `dual=False` = ค่าเดียว (hidden `name`, ค่าเริ่ม `value`) · bubble โชว์ค่าตลอด · ลาก/คีย์บอร์ด/คลิกราง · event `bb-slider:change` (dual `{min,max}` · single `{value}`)
- **Combo/Upload + Date/Time ทุกตัว ต้อง include `core/js/bb-components.js`** (auto-init `[data-bb-*]`)

## Date / Time

| Component | Signature | ตัวอย่าง |
|---|---|---|
| **WeekStrip** | `WeekStrip(name='date', value='', counts={})` | `WeekStrip(value=sel_date, counts={'2026-06-30': 5})` |
| **DatePicker** | `DatePicker(name='date', value='', placeholder='เลือกวันที่', align='left')` | `DatePicker('due_date', value=f.due_date)` |
| **TimePicker** | `TimePicker(name='time', value='09:00', step=1)` | `TimePicker('start_time', value='09:00', step=15)` |
| **TimeRange** | `TimeRange(name_start='time_start', name_end='time_end', start='08:00', end='10:00', step=15, warn_before='')` | `TimeRange(start='08:00', end='10:00', warn_before='08:00')` |
| **Calendar** | `Calendar(events={}, year=None, month=None, max_chips=2, caption='', book_url='')` | `Calendar(events=cal_events, caption='08:00–17:00', book_url=url_for('vehicle.vehicle'))` |

- ค่า `value`/`counts` ISO: วัน `'YYYY-MM-DD'` · เวลา `'HH:MM'` · `counts` = `{iso: จำนวนงาน}` (badge แดง)
- event: `bb-weekstrip:change {date}` · `bb-datepicker:change {date}` · `bb-timepicker:change {value}` · `bb-timerange:change {start,end}`
- TimeRange: end เลือกก่อน start ไม่ได้ · เลือก start เสร็จเด้งไป end · `warn_before='HH:MM'` = ค่าก่อนเกณฑ์เป็นสีเตือน
- **Calendar** ปฏิทินรายเดือน: `events` = dict `{'YYYY-MM-DD': [{time, title, status, url}]}` · `status ∈ ok|wr|dg|info|neutral` (Controller แมป booking status เอง) · ช่องสูงเท่ากัน · เกิน `max_chips` → `+N รายการ` กดเป็น popover + ปุ่มจองรถ · `book_url` ตั้ง=นำทาง `url?date=…` · event `bb-calendar:daychange {date}` · `bb-calendar:eventclick {date,index}` · `bb-calendar:book {date}`
- ทุกตัว include `core/js/bb-components.js` (auto-init) — เซ็ต hidden input ให้ · DatePicker/TimePicker step ตั้ง default ได้

## Navigation / Filter

| Component | Signature | ตัวอย่าง |
|---|---|---|
| **Tabs** | `Tabs(tabs=[Tab(...)])` | `Tabs([Tab('ทั้งหมด', count=12, active=True, value='all', on_click='tab'), Tab('รออนุมัติ', count=3, value='wait')])` |
| **Segmented** | `Segmented(items=[Seg(...)])` | `Segmented([Seg('เดือน', active=True, value='m', on_click='seg'), Seg('ปี', value='y')])` |
| **Chip** | `Chip(label='', count=None, active=False, value='', on_click='')` | `Chip('เปิดทริป', count=5, active=True, value='open', on_click='chip')` |
| **Token** | `Token(field='', op='=', value='', on_remove='')` | `Token('แผนก', '=', 'การเงิน', on_remove='rm')` |
| **Dropdown** | `Dropdown(label='', items=[...], hint='', width=0, on_toggle='')` | `Dropdown('เรียงตาม', [MenuLabel('ทิศทาง'), MenuItem('ล่าสุด', active=True, value='new', on_click='sort'), MenuDivider(), MenuItem('เก่าสุด', value='old')])` |
| **Pagination** | `Pagination(total=0, page=1, limit=20, edge=1, on_click='')` | `Pagination(total=137, page=3, limit=20, on_click='page')` |

- **Tab** fields: `label, count=None, active=False, value='', on_click=''`
- **Seg** fields: `label, active=False, value='', on_click=''`
- **Dropdown items**: `MenuLabel(text) · MenuItem(label, active, value, on_click) · MenuDivider() · MenuRich(title, desc, checked)`
- Pagination คำนวณ window ใน Python (`total_pages`, gap) — macro แค่ render
- **bb_filter** (shell macro · ไม่มี Python class — เหมือน `bb_table` shell): `{% call bb_filter(label='ตัวกรอง', align='left') %}…controls…{% endcall %}` — filter button ที่ filter ข้างใน · live (ไม่มี apply) · ออกจาก default = active (badge **dot แดง** + border) · มีแค่ปุ่มล้าง
  - control ที่ JS track (ใส่ใน slot): `<div data-filter-group="key" data-multi>` + ปุ่ม `[data-value]` (active `.is-on`) = เลือกหลายค่า · ไม่มี `data-multi` = เลือกอันเดียว · หรือ `<select name>`/`<input name>`
  - event `bb-filter:change` {detail: state} · ต้อง include `bb-components.js`

## Data Display

| Component | Signature | ตัวอย่าง |
|---|---|---|
| **Table** | `Table(columns=[Column(...)], data=rows, total=None, limit=None, page=None, pagination=False, info=False, empty='ไม่พบรายการ')` หรือใช้ `.add_column(**kw)` | ดูบล็อกล่าง |
| **KPI** | `KPI(label, value, icon=None, variant='card', den='', delta='', delta_dir='')` | `KPI('ค่าน้ำมันเดือนนี้', '฿12,400', icon='fuel', delta='+8%', delta_dir='up')` |
| **Card** | `Card(title='', link='', body='')` | `Card('สรุป', body=[kpi1, kpi2])` (body รับ component/list/str) |
| **Badge** | `Badge(text, variant='neutral', icon=None)` | `Badge('ใหม่', 'accent')` |
| **Status** | `Status(text, tone='neutral', inline=False, icon=None)` | `Status('อนุมัติแล้ว', 'ok')` · ในตารางใช้ `inline=True` |
| **Timeline** | `Timeline(items=[TLItem(...)])` | `Timeline([TLItem('จอง', '09:00', state='done'), TLItem('อนุมัติ', '10:30', state='cur'), TLItem('ปิดทริป', state='todo')])` |

- KPI `variant`: `card \| plain` · `delta_dir`: `up \| down \| ''`
- Badge `variant`: `neutral \| accent` · Status `tone`: `ok \| wr \| dg \| info \| neutral`
- **TLItem** `state`: `done \| cur \| todo`
- **Column** fields: `key, label, sort='', align='', fmt='', cls='', cell=None`
  - `fmt`: `'money' \| 'num' \| '฿{:,.0f}'` · `align`: `'' \| 'end' \| 'center'`
  - `cell=callable(row)->Component` → render component ต่อแถว (เช่น Status ในคอลัมน์สถานะ)

```python
# Table — สองสไตล์
t = Table(data=rows, pagination=True, info=True, total=137, page=1, limit=20)
t.add_column(key='plate',  label='ทะเบียน', sort='plate')
t.add_column(key='cost',   label='ค่าใช้จ่าย', fmt='money', align='end')
t.add_column(key='status', label='สถานะ',
             cell=lambda r: Status(r['status'], 'ok' if r['ok'] else 'wr', inline=True))
```

## Feedback / State

| Component | Signature | ตัวอย่าง |
|---|---|---|
| **Empty** | `Empty(title='', desc='', icon='inbox', action=None)` | `Empty('ยังไม่มีรายการ', 'เพิ่มทริปเพื่อเริ่ม', action=Button('เพิ่มรายการ', 'pri', icon='plus'))` |
| **Modal** | `Modal(title='', body='', actions=[...], sub='', mid='', on_close='', overlay=True)` | `Modal('ยืนยันลบ?', body='ลบแล้วกู้ไม่ได้', actions=[Button('ยกเลิก','ghost',on_click='close'), Button('ลบ','danger',on_click='del')], on_close='close')` |
| **Spinner** | `Spinner(size='', text='')` | `Spinner('sm', 'กำลังโหลด…')` |
| **Skeleton** | `Skeleton(lines=[...], height='14px')` | `Skeleton(['70%', '90%', '50%'])` |
| **Callout** | `Callout(text='', tone='info', title='', icon='', dismissible=False)` | `Callout('งบใกล้หมด เหลือ 8%', tone='wr', title='แจ้งเตือน', dismissible=True)` |
| **Bell** | `Bell(count=0, icon='bell', ghost=False, on_click='')` | `Bell(count=unread, on_click='open-notif')` |
| **ToastRegion** | `ToastRegion(flashes=[])` + JS `bbToast({type,title,msg,duration})` | `ToastRegion()` แล้วเรียก `bbToast({type:'ok', title:'บันทึกสำเร็จ'})` |

- Modal `body`/`actions` รับ component/list/str · `overlay=False` = ฝัง inline ไม่มีฉากหลัง
- Spinner `size`: `'' \| 'sm'` · มี `text` = แบบ inline
- **Callout** (อยู่กับที่ในหน้า) vs **Toast** (เด้งมุมจอ ตั้ง duration ได้) — คนละตัว · Callout `tone`: `info \| ok \| wr \| dg` · `dismissible` ต้อง include `bb-components.js`
- **Toast**: วาง `ToastRegion()` 1 ครั้งใน base layout + include `bb-components.js` → ยิงด้วย `bbToast({type, title, msg, duration})` (`duration` ms · 0 = ค้างไว้) · `type`: `ok \| info \| wr \| dg` · flash bridge: `ToastRegion(flashes=[{...}])`
- **Bell** count badge แดง (>99 → 99+) · static (count จาก server)

## Layout

| Component | Signature | ตัวอย่าง |
|---|---|---|
| **Sidebar** | `Sidebar(brand={}, sections=[], logout=None)` | ดูบล็อกล่าง |

```python
Sidebar(
  brand={'mark':'B', 'name':'BBCenter', 'sub':'ผู้ดูแลระบบ', 'on_click':'switch-account'},
  sections=[
    {'items':[{'label':'แดชบอร์ด', 'icon':'layout-dashboard', 'href':url_for('dashboard.index')},
              {'label':'งานของฉัน', 'icon':'inbox', 'badge':4, 'href':'#'}]},
    {'label':'ระบบงาน', 'items':[
       {'group':'ระบบจองรถ', 'icon':'car', 'open':True, 'children':[
          {'label':'อนุมัติรถ', 'href':url_for('vehicle.admin'), 'active':True},
          {'label':'บันทึกเลขไมล์', 'href':'#'}]},
       {'label':'ตั้งค่า', 'icon':'settings', 'href':'#'}]},
  ],
  logout={'label':'ออกจากระบบ', 'href':url_for('auth.logout')})
```

- **item (link)** = `{label, icon?, href?, on_click?, active?, badge?}` · **item (group)** = `{group, icon?, open?, badge?, children:[link...]}` · **section** = `{label?, items:[...]}`
- `active` = พื้น accent-bg (server เซ็ต) · `badge` = แดง/ขาว เหมือนกันทุกอัน · sub ไม่มี icon (text เยื้อง) · `open=True` = group กางไว้
- layout: `position:fixed` ซ้าย → **เนื้อหาหลักใส่ class `.bb-sidebar-main`** (margin-left) · พับ/กาง group ต้อง include `bb-components.js`
- **Responsive: ≥1200px = expanded · <1200px = drawer** (off-canvas + overlay อัตโนมัติ) · ปุ่มเปิดใส่ใน topbar ของหน้า `<button data-bb-sidebar-open>` (เจาะจง sidebar = `data-bb-sidebar-open="#id"`) · ปิดด้วยปุ่ม X (มีในตัว) / overlay / Esc / กด nav-link
- prefix `.bb-sidebar-*` (กันชน `.sidebar` legacy ของ `_shared/sidebar.html`)
- Skeleton `lines`: list ของ width-str เช่น `'70%'` หรือ dict `{height, width}`

---

## ประกอบหลายตัวเป็นหน้า (mini example)

> โครงเต็ม (model→controller→component→jinja) → [page_pattern.md](../../docs/notes/page_pattern.md). นี่แค่ pattern wiring สั้นๆ

```python
# controller — สร้าง object แล้วส่งเข้า template (ตัวเดียวหรือ list ก็ได้)
@bp.route('/fuel')
def fuel():
    kpis = [KPI('ค่าน้ำมันเดือนนี้', '฿12,400', icon='fuel', delta='+8%', delta_dir='up'),
            KPI('จำนวนทริป', '37', icon='route')]
    tabs = Tabs([Tab('ทั้งหมด', count=37, active=True, value='all', on_click='tab'),
                 Tab('รออนุมัติ', count=3, value='wait')])
    table = Table(data=rows, info=True)
    table.add_column(key='plate', label='ทะเบียน')
    table.add_column(key='status', label='สถานะ',
                     cell=lambda r: Status(r['status'], 'ok', inline=True))
    body = table if rows else Empty('ยังไม่มีรายการ', action=Button('เพิ่ม', icon='plus'))
    return render_template('vehicle/admin/admin_fuel.html', kpis=kpis, tabs=tabs, body=body)
```
```jinja
{# jinja — render อย่างเดียว · list ใช้ loop #}
<div class="kpi-row">{% for k in kpis %}{{ component(k) }}{% endfor %}</div>
{{ component(tabs) }}
{{ component(body) }}   {# Table หรือ Empty — controller ตัดสินใจแล้ว #}
```

จุดสำคัญ: **logic อยู่ controller** (เลือก Table vs Empty, loop kpi) · jinja แค่ `{{ component(x) }}`

---

## รายการครบ (19 component / 28 export)

`Table·Column · Badge·Status · Button · Card · KPI · Input · Search · Tabs·Tab · Segmented·Seg · Chip·Token · DateRange · Dropdown·MenuItem·MenuLabel·MenuDivider·MenuRich · Pagination · Modal · Timeline·TLItem · Empty · Spinner · Skeleton`

import door เดียว: `from components import <ชื่อ>` (re-export ครบใน `__init__.py`)
