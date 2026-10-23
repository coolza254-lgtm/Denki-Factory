# ผลตรวจ Android v0.4.0 — อัปเดตในเกม

- PASS: unit tests 19 ข้อ และ browser tests 28 กรณี รวมเริ่มเช็กด้วยการกดเอง progress ดาวน์โหลด การส่งต่อให้ Android สิทธิ์ติดตั้ง เน็ตขาด รุ่นล่าสุด และกลับเข้าเมนู
- Native checks รอตรวจบน GitHub: metadata/HTTPS allowlist, APK จริงที่ลงนามด้วยกุญแจถูก/ผิด, checksum และ version, provider แบบอ่านอย่างเดียว, ขอสิทธิ์และเปิด/ยกเลิก Package Installer
- หลัง publish จะรัน native check ที่อ่าน metadata จาก GitHub จริงเพิ่มเติม
- UNRUN: การยืนยันติดตั้งแทนแอปจนจบ (ทดสอบเปิด/ยกเลิกตัวติดตั้ง) และ Galaxy A54 จริง

# ผลตรวจ Android v0.3.0 — จักรยานปั่นไฟ

- PASS: unit tests 19 ข้อ และ browser tests 22 กรณี รวมปั่นไฟตอนกลางคืน ยอดขาย/หน่วยพลังงาน cooldown เซฟเก่า บัญชีรายวัน และ reduced motion
- PASS: native smoke test รุ่น 0.3.0 บน Android 15 / x86_64 + KVM ใน GitHub Actions รวม 11 checkpoints: เพิ่มการแตะจักรยานด้วย touchscreen event จริงและยืนยันรายได้ในเซฟ ก่อนตรวจธุรกรรม โหลดเซฟกลับ และ file pickers ตามเดิม ดู [รอบที่ผ่าน](https://github.com/coolza254-lgtm/Denki-Factory/actions/runs/40004994354)
- PASS: สร้าง APK, ตรวจ signature/alignment และ certificate ตรงกับ 0.2.0; ดาวน์โหลดกลับจาก GitHub แล้วตรวจ SHA-256 ตรงกับไฟล์ที่ลงนาม
- UNRUN: Galaxy A54 จริง และการส่งออก/นำเข้าเนื้อหาไฟล์ผ่าน Android DocumentsUI จนจบ

# ผลตรวจ Android v0.2.0 — อนิเมชัน

- PASS: build เว็บและ Android รวมทั้งตรวจ APK signature และ alignment
- PASS: ระบบเกมเดิม unit tests 16 ข้อ
- PASS: browser tests 20 กรณีบนจอจำลองสองขนาด รวมกระแสไฟตอนผลิต/กลางคืน/ซ่อม ตัวเลขจบตรงยอดเซฟ และ reduced motion จากเกม/ระบบ
- PASS: ตรวจ certificate ของ APK ตรงกับ 0.1.0 และ application ID เดิม เพิ่ม versionCode 1 → 2
- UNRUN: การติดตั้งทับและเล่นบน Android/A54 จริงในรุ่น 0.2.0 ยังไม่ได้ทดสอบ
- PASS: native smoke test บน Android 15 / x86_64 ใน GitHub Actions (Ubuntu 24.04 + KVM): โหลดไฟล์ฝังใน APK, bridge, ไม่มี service worker ควบคุมหน้า, เปิดกิจการ, กู้เงิน, ซื้อหุ้น, reload แล้วเซฟยังอยู่, เปิด/ยกเลิกตัวเลือกส่งออกและนำเข้า JSON และไม่มี horizontal overflow รวม 10 checkpoints ดู [รอบที่ผ่าน](https://github.com/coolza254-lgtm/Denki-Factory/actions/runs/40000655427)
- การทดสอบ native ใช้ APK ที่ build จากซอร์สเกมเดียวกับ 0.2.0 และกุญแจทดสอบชั่วคราวของ CI ไม่ใช่กุญแจส่วนตัวของ APK ที่เผยแพร่ ไฟล์เผยแพร่ตรวจลายเซ็นและ SHA-256 แยกต่างหากแล้ว รวมดาวน์โหลดกลับจาก GitHub Release เพื่อเทียบ checksum
- UNRUN: การส่งออกไฟล์จริงแล้วเลือกนำเข้ากลับผ่าน Android DocumentsUI จนจบ ชุด native ตรวจการเปิด/ยกเลิก picker ส่วนโครงสร้าง JSON และ import/export ในเว็บตรวจผ่าน browser tests
- ข้อจำกัด KVM ของ cloud เครื่องนี้ยังมีตามประวัติด้านล่าง จึงย้ายการตรวจ runtime ไปยัง GitHub runner ที่มี KVM และแก้ตัวทดสอบให้รอหน้าใหม่หลัง reload, match MIME/category ของ file picker และคำนวณพิกัดแตะจาก origin ของ WebView

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
