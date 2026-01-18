# Hướng dẫn cấu hình Google OAuth

## Backend (.env)

Thêm các biến sau vào file `be/.env`:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Client URL (để redirect sau khi login)
CLIENT_URL=http://localhost:5173
```

## Cách lấy Google Client ID và Client Secret

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project hiện có
3. Vào **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Chọn **Application type**: Web application
6. Điền thông tin:
   - **Name**: Tên ứng dụng của bạn
   - **Authorized JavaScript origins**: `http://localhost:5173`
   - **Authorized redirect URIs**: `http://localhost:5000/api/auth/google/callback`
7. Click **Create** và copy **Client ID** và **Client Secret**
8. Paste vào file `.env`

## Frontend (.env)

Đảm bảo file `fe/.env` có:

```env
VITE_API_URL=http://localhost:5000
```

## Kiểm tra

Sau khi cấu hình xong:
1. Restart backend server
2. Truy cập trang login
3. Click nút "Login with Google"
4. Đăng nhập bằng tài khoản Google
5. Sau khi thành công, bạn sẽ được redirect về trang chủ
