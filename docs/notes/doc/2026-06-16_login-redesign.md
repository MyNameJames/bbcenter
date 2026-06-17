# Task: Redesign หน้า login (Sneat style)

status: completed
date: 2026-06-16

## Scope (5 field)
- [ไฟล์] app/templates/auth/login.html + app/static/auth/css/login.css (ใหม่) + app/static/auth/js/login.js (ใหม่)
- [ตำแหน่ง] rewrite ทั้งไฟล์ login.html
- [งาน] redesign ให้เหมือนภาพ Sneat: card กลางจอ, logo building-2 + bbcenter, login form
- [ข้อจำกัด] --vc-* tokens, no shadow→border, ไม่มี create account, subtitle = "เข้าสู่ระบบด้วยรหัสหน้าแดงที่ได้สมัครไว้แล้ว", logo icon=building-2 + คำว่า bbcenter สี --vc-accent
- [output] template + css + js ใหม่

## Checklist
- [x] 1 PLAN — scoped + log
- [ ] 2 GUARD — ไม่แตะ model/เงิน → ข้าม
- [ ] 3 BUILD
- [ ] 4 VERIFY — ผู้ใช้ทดสอบ browser เอง (server 5001)
- [ ] 5 SYNC — INDEX_ui.md (template + css/js)
- [ ] 6 CLOSE

## Files touched
- app/templates/auth/login.html (rewrite)
- app/static/auth/css/login.css (new)
- app/static/auth/js/login.js (new)
