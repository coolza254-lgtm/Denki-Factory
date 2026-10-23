# Denki Factory — Android APK

ไฟล์ติดตั้ง: [releases/denki-factory-0.2.0.apk](../releases/denki-factory-0.2.0.apk?raw=true) · application ID `dev.denki.factory` · versionCode 2 · versionName 0.2.0

## ติดตั้งบน Samsung Galaxy A54

1. ดาวน์โหลด APK ลงโทรศัพท์ แล้วเปิดจากรายการดาวน์โหลดหรือแอป My Files
2. หาก Android ขอสิทธิ์ ให้อนุญาตแอปที่คุณใช้เปิดไฟล์ติดตั้งจากแหล่งนี้ แล้วกลับมากดติดตั้ง
3. เปิด **Denki Factory** ได้เลย ไม่ต้องมีเว็บโฮสต์หรือสมัครบัญชี

ไฟล์นี้ลงนามสำหรับติดตั้งส่วนตัว ไม่ได้เผยแพร่ผ่าน Play Store รองรับ Android 8.0 ขึ้นไปโดยต้องมี Android System WebView รุ่นใหม่ ติดตั้ง APK บน Android 15 จำลองสำเร็จแล้ว แต่การทดสอบเล่นใน Android ยังไม่ครบ เนื่องจาก System UI/Launcher ของตัวจำลองค้างบนเครื่องที่ไม่มี KVM ยังไม่ได้ทดสอบเครื่อง A54 จริง

แอปเก็บข้อมูลแยกจากเกมที่เปิดในเบราว์เซอร์ หากมีเซฟเดิม ให้ส่งออก JSON จากเว็บแล้วนำเข้าในแอป การถอนแอปหรือล้างข้อมูลจะลบเซฟ ควรส่งออกสำรองก่อน

## สถาปัตยกรรม

- Native Android Activity + Android System WebView ไม่มี dependency native ภายนอกหรือโค้ดเฉพาะ ABI จึงใช้ได้ทั้งโทรศัพท์ ARM64 และ Android จำลอง x86_64
- HTML, JavaScript, CSS, ภาพ และฟอนต์ฝังใน APK ทั้งหมด โหลดจาก origin คงที่ `https://appassets.androidplatform.net/` ผ่านตัวอ่าน assets ภายใน ไม่ออกอินเทอร์เน็ต
- ไม่ร้องขอสิทธิ์ Internet, พื้นที่เก็บไฟล์, รายชื่อ, กล้อง หรือการแจ้งเตือน
- ส่งออก/นำเข้าเซฟผ่าน Android Storage Access Framework ให้ผู้ใช้เลือกไฟล์และปลายทางเอง
- JavaScript bridge เปิดให้บันทึก JSON เท่านั้น จำกัดขนาด 2 MB และปิดการนำทางออกไป origin ภายนอก
- ปิด service worker ใน build Android เพราะไฟล์พร้อมใช้งานออฟไลน์จาก APK อยู่แล้ว
- รองรับ system insets ของ Android 15, ปุ่ม Back, pause/resume และบันทึกก่อนพักแอป

## สร้างซ้ำ

ต้องมี Node 22.12+, npm, JDK 21 แบบเต็ม (ต้องมี `javac`, `jar`, `keytool`), Python 3 และ Android SDK ที่มี `platforms;android-35` / `build-tools;35.0.0` ไม่ต้องติดตั้ง Gradle หรือ Android Studio สำหรับวิธีนี้

ใน cloud workspace นี้ SDK อยู่ที่ `/workspace/android-tools/sdk` และ JDK ที่ `/workspace/android-tools/java/jdk-21.0.8+9` เครื่องมือดาวน์โหลดจาก Google/Adoptium โดยตรวจ checksum กับ metadata ของผู้เผยแพร่ก่อนใช้

```sh
cd /workspace/Denki-Factory
npm ci --cache /workspace/.npm-cache
PATH=/workspace/android-tools/java/jdk-21.0.8+9/bin:$PATH npm run build:apk
```

เมื่อ build ใหม่ ผลลัพธ์เริ่มต้นอยู่ใน artifacts/ และใช้กุญแจใน .local/android-signing/ หรือกุญแจเดิมของ cloud หากมี โฟลเดอร์เหล่านี้ไม่เข้า Git หากใช้ SDK หรือปลายทางอื่น กำหนด `ANDROID_SDK_ROOT`, `DENKI_SIGNING_DIR`, `DENKI_APK_OUTPUT` ได้ สคริปต์ใช้ AAPT2, javac, D8, zipalign และ apksigner ตามลำดับ ตรวจลายเซ็นและ alignment ก่อนส่งออก พร้อมไฟล์ SHA-256

## กุญแจลงนามและการอัปเดต

กุญแจส่วนตัวถูกสร้างครั้งแรกไว้ที่ `/workspace/android-signing/denki/` นอก repository ไม่นำกุญแจหรือรหัสผ่านใส่ใน APK/ซอร์สโค้ด/เอกสาร ต้องเก็บโฟลเดอร์นี้อย่างปลอดภัยหากจะสร้างอัปเดตทับแอปเดิม และเพิ่ม versionCode เมื่อออกเวอร์ชันใหม่ การใช้กุญแจใหม่จะอัปเดตทับไม่ได้ ต้องส่งออกเซฟก่อนถอนแอปเดิม

อย่าแชร์กุญแจผ่าน issue, commit หรือแชต ไฟล์ APK แจกสำหรับติดตั้งได้โดยไม่ต้องแจกกุญแจ

## การทดสอบ

- ตรวจ signature schemes v2/v3 และ alignment ด้วย official Android Build Tools
- ตรวจ manifest: min SDK 26 / target SDK 35, ไม่มี permissions เพิ่ม
- ระบบเศรษฐกิจใช้ unit tests เดียวกับเว็บ
- Android smoke checks (`npm run test:android`): ใช้เฉพาะ Android จำลองแบบทิ้งได้ สคริปต์ปฏิเสธ serial ของเครื่องจริงและล้างเซฟในเครื่องจำลองก่อนทดสอบ ติดตั้ง เปิดกิจการ นำทาง ซื้อหุ้น กู้เงิน reload แล้วเซฟยังอยู่ และเปิดตัวเลือกไฟล์
- ไม่มีการอ้างว่าทดสอบ Samsung One UI หรือฮาร์ดแวร์ A54 จริง

## รุ่น 0.2.0 — ภาพเคลื่อนไหว

ตัวเลขเงิน กำลังผลิต พลังงาน และพอร์ตนับสู่ยอดจริง แสงไฟวิ่งตามสาย แผงเปลี่ยนแสงตามจังหวะ เมฆและแสงอาทิตย์เคลื่อน กังหันหมุน ไอน้ำและไฟสถานะนิวเคลียร์ขยับ เฉพาะโครงการที่ผลิตจริงจะแสดงกระแสไฟ รับทุนและอัปเกรดมีเอฟเฟกต์สั้นที่ไม่ขวางการแตะ

ปิดได้ทั้งจากโหมดลดการเคลื่อนไหวในเกมหรือการตั้งค่าระบบ หยุดอนิเมชันฉากเมื่อเลื่อนพ้นจอหรือพักแอป ตัวเลขอนิเมชันไม่ถูกเขียนกลับเข้าเซฟ

ใช้ application ID และกุญแจเดิม เพิ่ม versionCode เป็น 2 จึงออกแบบให้ติดตั้งทับ 0.1.0 โดยรักษาเซฟได้ ไม่ควรถอนแอปเดิมก่อนอัปเดต
