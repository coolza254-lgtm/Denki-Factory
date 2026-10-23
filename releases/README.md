# APK ที่ลงนามแล้ว

- [ดาวน์โหลด Denki Factory 0.5.0](denki-factory-0.5.0.apk?raw=1)
- [รายละเอียดรุ่น](v0.5.0.md)
- [SHA-256](SHA256SUMS)

APK นี้เป็นไฟล์ที่ลงนามไว้แล้ว กุญแจส่วนตัวไม่อยู่ใน Git การสร้าง APK ใหม่บนเครื่องอื่นจะใช้กุญแจของเครื่องนั้น จึงไม่ควรแทนที่ไฟล์เผยแพร่ด้วย build จาก CI ที่ลงนามคนละกุญแจ

`npm run verify:release` ตรวจ checksum ไฟล์ และทรัพยากรที่ฝังอยู่ใน APK เมื่อ push tag `v0.5.0` workflow จะรันทดสอบก่อนสร้าง GitHub Release และแนบ APK เดิมโดยไม่ลงนามใหม่ หากยังไม่มีหน้า GitHub Release ให้ดาวน์โหลดจากโฟลเดอร์นี้ได้

ตั้งแต่ 0.4.0 มี update.json แนบใน GitHub Release เพื่อให้แอปอ่านจาก releases/latest/download/update.json สร้างด้วย python3 scripts/prepare-update.py หลังนำ APK ที่ลงนามแล้วมาใส่ releases/ และตรวจด้วย npm run verify:release ก่อน tag
