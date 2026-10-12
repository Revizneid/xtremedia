# Hướng Dẫn Đóng Gói & Triển Khai XtreMedia V2 (Production Deployment Guide)

Tài liệu này hướng dẫn chi tiết các phương án đóng gói và đưa hệ thống **XtreMedia V2** lên môi trường Production (VPS cá nhân hoặc Cloud Platform).

---

## 1. Phương Án 1: Triển Khai Bằng Docker Compose (Khuyên Dùng)

Phương án này sử dụng kiến trúc Multi-Stage Container hóa kết hợp **Next.js Standalone** và **Nginx Reverse Proxy**.

### Yêu cầu hệ thống:
* Máy chủ Linux (Ubuntu 22.04 / 24.04, Debian, CentOS, Rocky Linux).
* Đã cài đặt Docker và Docker Compose V2 (`docker compose version`).

### Các bước thực hiện:

#### Bước 1: Clone mã nguồn hoặc chuyển thư mục dự án lên máy chủ
```bash
git clone <repository-url> xtremedia-v2
cd xtremedia-v2
```

#### Bước 2: Cấu hình biến môi trường
Sao chép file cấu hình mẫu:
```bash
cp .env.example .env
```
Chỉnh sửa `JWT_SECRET` trong file `.env` bằng một chuỗi ngẫu nhiên có độ dài tối thiểu 32 ký tự để bảo mật token đăng nhập.

#### Bước 3: Khởi động hệ thống
Chạy lệnh duy nhất để build image và khởi động ngầm:
```bash
docker compose up -d --build
```

#### Bước 4: Kiểm tra trạng thái hoạt động
```bash
docker compose ps
docker compose logs -f app
```
* **Ứng dụng chính**: Hoạt động qua Nginx tại cổng `80` (hoặc domain của bạn).
* **CSDL bền vững**: Dữ liệu bài hát, ca sĩ, thành viên được lưu trong thư mục mount `./data/store.json`, không bị mất khi restart hoặc cập nhật container.

---

## 2. Phương Án 2: Triển Khai Trực Tiếp Trên VPS (Node.js & PM2)

Nếu bạn không sử dụng Docker và muốn chạy trực tiếp trên máy chủ VPS:

### Yêu cầu:
* Node.js v20.x hoặc v22.x LTS.
* Cài đặt PM2: `npm install -g pm2`

### Các bước thực hiện:

#### Bước 1: Cài đặt thư viện & Build Standalone
```bash
cd xtremedia-v2
npm ci
npm run build
```

#### Bước 2: Khởi chạy bằng PM2
Tạo file `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'xtremedia-v2',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        JWT_SECRET: 'your-secure-production-jwt-secret-here',
      },
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      max_memory_restart: '1G',
    },
  ],
};
```
Khởi động ứng dụng:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 3. Cấu Hình Tên Miền & SSL HTTPS (Certbot Let's Encrypt)

Để kích hoạt giao thức bảo mật HTTPS cho trang nghe nhạc của bạn:

1. Cài đặt Certbot:
   ```bash
   sudo apt update
   sudo apt install certbot python3-certbot-nginx -y
   ```
2. Cấp chứng chỉ SSL tự động:
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```
3. Certbot sẽ tự động gia hạn chứng chỉ mỗi 90 ngày.

---

## 4. Phương Án 3: Triển Khai Lên Nền Tảng Cloud (Vercel / Railway)

### Triển khai lên Vercel:
1. Đẩy mã nguồn lên GitHub / GitLab.
2. Đăng nhập [Vercel](https://vercel.com) và chọn **Import Project**.
3. Chọn Framework Preset: **Next.js**.
4. Cấu hình Environment Variables:
   * `JWT_SECRET`: Nhập khóa bảo mật của bạn.
5. Nhấn **Deploy**.

---

## 5. Sao Lưu & Phục Hồi Dữ Liệu (Backup & Restore)

Tất cả dữ liệu của XtreMedia V2 được lưu trữ có cấu trúc trong thư mục `data/`:
* `data/store.json`: Chứa toàn bộ thông tin bài hát, ca sĩ, album, thể loại, thành viên và cấu hình.

### Sao lưu nhanh:
```bash
tar -czvf xtremedia_backup_$(date +%Y%m%d).tar.gz data/
```

### Phục hồi dữ liệu:
```bash
tar -xzvf xtremedia_backup_20261012.tar.gz
docker compose restart app
```
