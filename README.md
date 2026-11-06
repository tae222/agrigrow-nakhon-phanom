# AgriGrow Nakhon Phanom – ระบบประเมินและติดตามการเติบโตพืชผลจังหวัดนครพนม (Modular Edition)

## โครงสร้างโปรเจกต์

```
agrigrow_nakhon_phanom_modular/
├── index.html               # หน้าเว็บหลัก (Sidebar, Header, 8 โหมดการทำงาน)
├── README.md                # คู่มืออธิบายโครงสร้างไฟล์และวิธีรันระบบ
├── assets/                  # รูปภาพและไฟล์สื่ออื่น ๆ
│   └── farm_overview.jpg    # รูปโรงเรือนสมาร์ทฟาร์ม (แยกจาก Base64)
├── css/                     # สไตล์ CSS (ตัวแปรธีม, ธีมสี 5 สไตล์, Animation, Print)
│   └── styles.css
└── js/                      # โมดูล JavaScript แยกตามหน้าที่ (5 โมดูล)
    ├── config-data.js       # การตั้งค่าโทนสี, เกณฑ์ประเมิน, ข้อมูลเริ่มต้น, LocalStorage
    ├── gis-map.js           # แผนที่ GIS (Leaflet)
    ├── farm-3d.js           # จำลอง 3 มิติ (Three.js)
    ├── tree-report.js       # รายงานกราฟ 30 นาที
    ├── ai-assistant.js      # ผู้ช่วย AI
    └── app-core.js          # ควบคุม UI, Kanban, ฟอร์มบันทึก, Dashboard
```

## วิธีรันโปรแกรม

1. **เปิดใช้งานได้ทันที (ไม่มี Server)**
   - แตกไฟล์ `.zip` ลงในโฟลเดอร์เดียวกันทั้งหมด
   - ดับเบิลคลิก `index.html` เพื่อเปิดในเบราว์เซอร์ (Chrome, Edge, Safari, Firefox) – ไม่ต้องกังวลเรื่อง CORS ของ ES Modules
2. **เปิดผ่าน VS Code (สำหรับนักพัฒนา)**
   - เปิดโฟลเดอร์โปรเจกต์ใน VS Code
   - คลิกขวาที่ `index.html` → **Open with Live Server**

---

> **หมายเหตุ**: โปรเจกต์นี้จัดเป็นโมดูลแยกตามฟังก์ชัน เพื่อความสะดวกในการบำรุงรักษาและอ้างอิงในเล่มโครงงาน/วิทยานิพนธ์ ทั้งยังคงทำงานครบทุกฟีเจอร์ 100%.
