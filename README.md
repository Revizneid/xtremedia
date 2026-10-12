# 🎵 XtreMedia V2 - Nền Tảng Âm Nhạc Trực Tuyến Thế Hệ Mới

[![Next.js 15](https://img.shields.io/badge/Next.js-15.5-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61dafb?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed?style=flat&logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Dự án hiện đại hóa toàn diện hệ thống CMS quản lý nhạc cổ điển **XtreMedia 1.2** (phát hành năm 2007) thành nền tảng nghe nhạc trực tuyến hiện đại với kiến trúc **Decoupled Fullstack Monorepo**, Core Audio Engine HTML5, đồng bộ lời Karaoke LRC theo mili-giây, thiết kế Cyber Acoustic Glassmorphism và Admin Control Panel bảo mật chuẩn OWASP.

---

## 📁 Cấu Trúc Thư Mục Repository

```text
xtremedia/
├── xtremedia-v2/              # 🚀 Ứng dụng chính (Next.js 15, TypeScript, Web Audio, AdminCP)
│   ├── src/
│   │   ├── app/              # Next.js App Router (Client & Server Components, API Routes)
│   │   │   ├── admin/        # 👑 Admin Control Panel (Dashboard, Songs, Broken, Artists, Users)
│   │   │   ├── api/          # RESTful APIs (Audio Stream 206, Auth JWT, Songs, Admin)
│   │   │   ├── globals.css   # Cyber Acoustic Theme (Vanilla CSS, Glassmorphism, Neon Accents)
│   │   │   └── page.tsx      # Giao diện chính nghe nhạc trực tuyến
│   │   ├── components/       # PlayerBar, LyricModal, QueueDrawer, GiftModal, AuthModal, Header
│   │   ├── context/          # AudioPlayerContext (HTML5 Core Engine) & AuthContext (JWT Session)
│   │   └── lib/              # Database Store, Cryptographic Security, Types & Mock Data
│   ├── data/                 # CSDL JSON bền vững lưu trữ bài hát, ca sĩ, album, thành viên
│   ├── scripts/              # Kịch bản Migration từ data.sql cũ & Test Suites
│   ├── Dockerfile            # Multi-stage Dockerfile tối ưu (< 150MB)
│   ├── docker-compose.yml    # Khởi chạy Next.js Standalone + Nginx Reverse Proxy
│   └── DEPLOYMENT_GUIDE.md   # Hướng dẫn chi tiết triển khai VPS, Docker & Cloud
│
├── legacy/                   # 🏛️ Mã nguồn gốc XtreMedia 1.2 (Local Archive, excluded from Git)
│
└── docs/                     # 📚 Tài liệu kiến trúc và phân tích nâng cấp hệ thống
    ├── xtremedia_analysis_and_upgrade_plan.md
    ├── xtremedia_v2_modern_rewrite_architecture.md
    └── xtremedia_v2_implementation_and_deployment_plan.md
```

---

## ✨ Tính Năng Nổi Bật của XtreMedia V2

1. **Core Audio Player Engine**:
   - Web Audio API & HTML5 Audio: tua thời gian thực không delay, điều khiển âm lượng, shuffle, repeat.
   - MediaSession API: hiển thị tiêu đề, ca sĩ, ảnh bìa trên thanh thông báo hệ điều hành (Windows/macOS/iOS/Android).
   - Audio Streaming Endpoint hỗ trợ **HTTP Range 206 Partial Content**.

2. **Karaoke LRC Synchronizer**:
   - Phân tích file lời bài hát chuẩn `[mm:ss.xx]` theo mili-giây.
   - Tự động cuộn mượt và highlight câu hát đang phát.
   - Click vào bất kỳ dòng lyric nào để tua ngay đến đoạn bài hát tương ứng.

3. **Giao Diện Cyber Acoustic Glassmorphism**:
   - Chế độ nền tối cao cấp kết hợp hiệu ứng kính mờ (blur backdrop).
   - Đĩa than Vinyl xoay 360° tương tác theo trạng thái phát nhạc.
   - Responsive toàn diện cho điện thoại, máy tính bảng và màn hình lớn.

4. **Quà Tặng Âm Nhạc (Music Gift)**:
   - Tái hiện tính năng huyền thoại của XtreMedia 2007: Gửi tặng bài hát kèm lời chúc và mã quà tặng định dạng `XM-XXXXXX`.

5. **Xác Thực & Phân Quyền Bảo Mật (JWT & RBAC)**:
   - Mật khẩu băm PBKDF2 (100.000 vòng lặp) với muối ngẫu nhiên (salt 16-byte) theo chuẩn OWASP.
   - Token JWT ký số HMAC-SHA256 lưu trữ trong HttpOnly Cookie chống XSS.
   - Phân quyền 3 cấp độ: `USER`, `MODERATOR`, `ADMIN`.

6. **Admin Control Panel Hiện Đại (`/admin`)**:
   - Dashboard KPI thống kê thời gian thực (Lượt nghe, bài hát, thành viên).
   - Quản lý bài hát CRUD tích hợp trình soạn thảo lời bài hát Karaoke LRC.
   - Trung tâm xử lý báo link hỏng và cập nhật URL audio mới.

---

## 🚀 Hướng Dẫn Chạy Cục Bộ (Local Development)

### Yêu cầu:
* Node.js v20+ hoặc v22+
* npm hoặc pnpm

### Cài đặt và khởi chạy:
```bash
# 1. Di chuyển vào thư mục ứng dụng
cd xtremedia-v2

# 2. Cài đặt thư viện
npm install

# 3. Khởi chạy môi trường phát triển
npm run dev
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000).

* Tài khoản Quản trị viên demo: `admin` / `admin123`
* Tài khoản Thành viên demo: `member` / `member123`

---

## ☁️ Triển Khai Lên Vercel (Phương Án 3)

1. Đăng nhập [Vercel](https://vercel.com) và bấm **Add New...** $\rightarrow$ **Project**.
2. Chọn repository **`Revizneid/xtremedia`**.
3. **Cấu hình quan trọng**:
   * Tại mục **Root Directory**, bấm `Edit` và chọn thư mục: **`xtremedia-v2`**.
   * Framework Preset: **Next.js** (tự động nhận diện).
4. Thêm Environment Variable:
   * `JWT_SECRET`: Nhập chuỗi bảo mật ngẫu nhiên của bạn.
5. Bấm **Deploy**. Vercel sẽ tự động build và cung cấp domain HTTPS miễn phí.

---

## 🐳 Triển Khai Bằng Docker Compose (VPS / Server riêng)

```bash
cd xtremedia-v2
docker compose up -d --build
```
Hệ thống sẽ chạy với **Next.js Standalone** kết hợp **Nginx Reverse Proxy** tại cổng 80, tự động mount volume `./data` để bảo toàn CSDL. Xem thêm chi tiết tại [xtremedia-v2/DEPLOYMENT_GUIDE.md](file:///d:/Download/xtremedia/xtremedia-v2/DEPLOYMENT_GUIDE.md).

---

## 📄 Bản Quyền
Dự án được phân phối dưới giấy phép mã nguồn mở MIT.
