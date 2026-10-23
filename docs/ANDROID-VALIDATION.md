# ผลตรวจ Android v0.2.0 — อนิเมชัน

- PASS: build เว็บและ Android รวมทั้งตรวจ APK signature และ alignment
- PASS: ระบบเกมเดิม unit tests 16 ข้อ
- PASS: browser tests 20 กรณีบนจอจำลองสองขนาด รวมกระแสไฟตอนผลิต/กลางคืน/ซ่อม ตัวเลขจบตรงยอดเซฟ และ reduced motion จากเกม/ระบบ
- PASS: ตรวจ certificate ของ APK ตรงกับ 0.1.0 และ application ID เดิม เพิ่ม versionCode 1 → 2
- UNRUN: การติดตั้งทับและเล่นบน Android/A54 จริงในรุ่น 0.2.0 ยังไม่ได้ทดสอบ
- BLOCKED: ตัวจำลอง Android ในเครื่องนี้มีข้อจำกัด KVM/ระบบ UI ตามผลรุ่นก่อนด้านล่าง ไม่ได้นำผล browser มาอ้างแทนผล native

# ผลตรวจ Android v0.1.0

- PASS: สร้าง APK ด้วย Android SDK 35 / Build Tools 35.0.0 และ JDK 21
- PASS: APK Signature Scheme v2/v3 และ ZIP alignment
- PASS: manifest min SDK 26 / target SDK 35 ไม่มีสิทธิ์ Internet หรือเข้าถึงไฟล์แบบกว้าง
- PASS: ตรวจไฟล์ HTML, JavaScript, CSS, ฟอนต์ และ DEX ภายใน APK
- PASS: ติดตั้ง APK จริงบน Android 15 x86_64 จำลอง (`adb install` Success)
- PASS: unit tests ระบบเกม 16 ข้อ และ browser tests 14 กรณี
- PASS: ตรวจ frontend build Android ผ่านเบราว์เซอร์: bridge ส่งออก JSON, ข้อความตอบกลับ, ข้อความเซฟสำหรับ Android และไม่มี service worker
- BLOCKED: Android runtime smoke test ยังไม่ผ่านครบ ตัวจำลองไม่มี KVM เกิด Watchdog restart, Quickstep/System UI ANR และการรอ JavaScript callback timeout จึงยังไม่ยืนยันการเริ่มเกม/เซฟ/ตัวเลือกไฟล์จริงบน Android ทั้งหมด
- UNRUN: Samsung Galaxy A54 จริง / Samsung One UI จริง

ห้ามตีความผล browser tests ว่าแทนการทดสอบ native Android สำเร็จ ชุด instrumentation ใน android/smoke เป็นเครื่องมือสำหรับทดสอบต่อบนเครื่องจำลองที่ทำงานปกติ ใช้ scripts/test-android.sh เฉพาะ disposable emulator เพราะล้างเซฟก่อนเริ่ม

ไฟล์ติดตั้งลงนามสำหรับใช้งานส่วนตัว ต้องนำไปทดสอบบนโทรศัพท์จริงก่อนเรียกว่ารุ่นพร้อมเผยแพร่
