# Scripthub
รวมโหลดสคริปไว้ใช้งาน

วิธีเพิ่มสคริปต์ตัวใหม่ในอนาคต:
เวลาจะใส่ตัวใหม่ ให้ก๊อปปี้โค้ดส่วนนี้ไปวางเพิ่มใน <div class="script-list" id="scriptList"> ครับ:

<div class="card" data-name="ชื่อภาษาอังกฤษหรือไทยสำหรับค้นหา">
    <div class="file-info">
        <div class="file-title">ชื่อไฟล์ใหม่.hta</div>
        <div class="file-desc">คำอธิบายสคริปต์สั้นๆ</div>
        <span class="file-meta">.HTA • ขนาดไฟล์</span>
    </div>
    <a href="ลิงก์_Raw_ของไฟล์ใหม่" class="btn-download">ดาวน์โหลดไฟล์</a>
</div>


แบบแยกปุ่มดาวน์โหลด ถ้าอยากให้โหลดมาด้วยกัน
ทำปุ่มดาวน์โหลดแยกกันเป็น 2 ปุ่มในการ์ดเดียว เพื่อให้ผู้ใช้กดดาวน์โหลดทีละไฟล์ได้อย่างราบรื่น ไม่โดนเบราว์เซอร์บล็อก Popup:
<div class="card" data-name="show_sn_comname.hta">
    <div class="file-info">
        <div class="file-title">Show_SN_ComName.hta</div>
        <div class="file-desc">สคริปต์ดึงข้อมูลคอมพิวเตอร์ (พร้อมไฟล์ตั้งค่าเสริม)</div>
        <span class="file-meta">.HTA + Config</span>
    </div>
    <!-- ปุ่มดาวน์โหลดไฟล์ที่ 1 -->
    <a href="ลิงก์_Raw_ไฟล์ที่_1" class="btn-download" style="margin-bottom: 8px;">ดาวน์โหลดสคริปต์ (.hta)</a>
    <!-- ปุ่มดาวน์โหลดไฟล์ที่ 2 -->
    <a href="ลิงก์_Raw_ไฟล์ที่_2" class="btn-download" style="background-color: #8e8e8e;">ดาวน์โหลดไฟล์เสริม (Config)</a>
</div>
