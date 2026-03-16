# Hướng dẫn kết nối n8n với ESG Sale CRM

## Base URL
```
https://sale.ecosmartgroup.vn
```

## Xác thực (Authentication)
API hiện tại sử dụng JWT Bearer token. Trong n8n, cấu hình **Header Auth**:
- Header Name: `Authorization`
- Header Value: `Bearer <token>`

> Để lấy token: POST `/api/login` với body `{ "email": "your@email.com" }`

---

## API Endpoints cho n8n

### 1. Tạo/Cập nhật Khách hàng
**POST** `/api/n8n/customer`

Tự động kiểm tra SĐT trùng lặp. Nếu trùng → cập nhật, nếu mới → tạo mới.

```json
{
  "hoTen": "Nguyễn Văn A",
  "sdt": "0901234567",
  "email": "a@company.com",
  "congTy": "Công ty ABC",
  "nguon": "n8n",
  "ghiChu": "Ghi chú"
}
```

**Response:**
```json
{ "success": true, "action": "created", "data": { "maKh": "KH0051" } }
```

---

### 2. Tạo Cơ hội
**POST** `/api/n8n/opportunity`

```json
{
  "tenKh": "Nguyễn Văn A",
  "sdt": "0901234567",
  "tenCongTy": "Công ty ABC",
  "nhuCauDt": "50m2",
  "nganSach": "15 triệu/tháng",
  "khuVuc": "Cầu Giấy",
  "giaiDoan": "Mới",
  "danhGia": "Suy nghĩ",
  "phuTrach": "Nguyễn Thị B"
}
```

**Giai đoạn hợp lệ:** `Mới`, `Đã xem`, `Đã liên hệ`, `Đang đàm phán`, `Thành công`, `Thất bại`

**Đánh giá hợp lệ:** `Thích`, `Suy nghĩ`, `Không thích`

---

### 3. Cập nhật Giai đoạn Cơ hội
**PUT** `/api/n8n/opportunity/{maCh}/stage`

```json
{
  "giaiDoan": "Đã liên hệ",
  "ghiChu": "Đã gọi điện tư vấn"
}
```

Tự động ghi log vào lịch sử tư vấn.

---

### 4. Cập nhật Trạng thái Địa điểm
**PUT** `/api/n8n/location/{maDd}/status`

```json
{
  "trangThai": "Đang thuê"
}
```

**Trạng thái hợp lệ:** `Trống`, `Đang thuê`, `Giữ chỗ`

---

### 5. Cập nhật Hàng loạt Địa điểm
**POST** `/api/n8n/locations/bulk-status`

```json
{
  "updates": [
    { "maDd": "DD0001", "trangThai": "Đang thuê" },
    { "maDd": "DD0002", "trangThai": "Trống" }
  ]
}
```

---

### 6. Đọc dữ liệu (GET endpoints có sẵn)

| Endpoint | Mô tả |
|----------|-------|
| `GET /api/customers` | Danh sách khách hàng |
| `GET /api/opportunities` | Danh sách cơ hội |
| `GET /api/locations` | Địa điểm (nhóm theo tòa nhà) |
| `GET /api/locations/all` | Tất cả phòng |
| `GET /api/contracts` | Danh sách hợp đồng |
| `GET /api/dashboard` | Thống kê dashboard |
| `GET /api/employees` | Danh sách nhân viên |

**Query filters:**
- `GET /api/opportunities?giaiDoan=Mới&phuTrach=Tên NV&search=keyword`
- `GET /api/customers?search=keyword`
- `GET /api/contracts?trangThai=Đang thuê&search=keyword`

---

## Cấu hình n8n

### Bước 1: Tạo Credential
1. Trong n8n → **Credentials** → **Add Credential**
2. Chọn **Header Auth**
3. Name: `ESG Sale API`
4. Header Name: `Authorization`
5. Header Value: `Bearer <your_jwt_token>`

### Bước 2: Sử dụng HTTP Request Node
1. Thêm node **HTTP Request**
2. Method: `POST` (hoặc `GET`/`PUT` tùy endpoint)
3. URL: `https://sale.ecosmartgroup.vn/api/n8n/customer`
4. Authentication: **Header Auth** → chọn credential đã tạo
5. Body Content Type: `JSON`
6. Body: dán JSON theo format ở trên

### Ví dụ Workflow: Form → CRM

```
[Webhook/Form] → [HTTP Request: POST /api/n8n/customer]
                → [HTTP Request: POST /api/n8n/opportunity]
```

1. **Trigger:** Webhook nhận form submission
2. **Node 1:** Tạo khách hàng từ form data
3. **Node 2:** Tạo cơ hội với thông tin khách hàng

### Ví dụ Workflow: Cập nhật trạng thái

```
[Schedule Trigger] → [HTTP Request: GET /api/opportunities]
                   → [IF giaiDoan changed]
                   → [HTTP Request: PUT /api/n8n/opportunity/{id}/stage]
```

---

## Lưu ý
- Tất cả response đều có format: `{ "success": true/false, "data": ..., "message": "..." }`
- Mã ID tự động tạo (KH0001, CH0001, DD0001)
- Thời gian server: UTC+7 (Asia/Ho_Chi_Minh)
- API không giới hạn rate limit (dùng nội bộ)
