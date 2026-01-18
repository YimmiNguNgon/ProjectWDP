# Hướng Dẫn Cấu Hình Upload Ảnh Cloudinary

## 1. Cấu Hình Environment Variables

Tạo file `.env.local` trong thư mục `fe/` với nội dung sau:

```env
VITE_API_URL=http://localhost:5000

# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

## 2. Cấu Hình Cloudinary

### Bước 1: Đăng ký tài khoản Cloudinary

- Truy cập: https://cloudinary.com/
- Đăng ký tài khoản miễn phí

### Bước 2: Lấy Cloud Name

- Vào Dashboard của bạn
- Tìm **Cloud Name** ở phần API Environment Variable
- Copy giá trị đó vào `VITE_CLOUDINARY_CLOUD_NAME`

### Bước 3: Tạo Upload Preset

- Vào **Settings** → **Upload**
- Kéo xuống phần **Upload presets**
- Click **Add upload preset**
- Đặt tên (vd: `user_avatars`)
- Chọn **Unsigned** (để có thể upload từ client)
- Chọn folder (vd: `/user-avatars`)
- Click **Save**
- Copy tên của preset vào `VITE_CLOUDINARY_UPLOAD_PRESET`

## 3. API Backend

Endpoint update profile:

- **Route**: `PUT /api/user/profile`
- **Headers**: `Content-Type: application/json`, `Authorization: Bearer token`
- **Body**:

```json
{
  "username": "Tên người dùng mới",
  "avatarUrl": "https://res.cloudinary.com/.../image.jpg"
}
```

## 4. Luồng Hoạt Động

1. User click "Chỉnh Sửa Hồ Sơ"
2. Chọn ảnh mới (tùy chọn)
3. Sửa username
4. Click "Lưu Thay Đổi"
5. Nếu có ảnh mới:
   - Upload lên Cloudinary → nhận URL
   - Gửi username + URL tới backend
6. Backend lưu URL vào database
7. Frontend hiển thị thông báo thành công

## 5. Kiểm Tra

Để test upload ảnh:

```javascript
// Trong DevTools Console
const file = document.querySelector("input[type=file]").files[0];
console.log(file.size); // Kiểm tra kích thước
```

Cloudinary sẽ tự động:

- Resize ảnh
- Optimize chất lượng
- Lưu trên CDN
- Trả về URL secure
