# XtreMedia Sync Investigation Log

## 1. Mục tiêu
Kiểm tra luồng đồng bộ thực tế từ Studio tới web để xác định nơi dữ liệu bị mất sau khi API trả 200, và đối chiếu xem các fix trước đó đã xử lý triệt để chưa.

## 2. Kết luận sơ bộ
Nguyên nhân gốc rễ là mismatch giữa nguồn dữ liệu mà Studio ghi và nguồn dữ liệu mà web đọc.

- Studio ghi vào legacy store JSON tại `xtremedia-v2/data/store.json`
- Web/public API đọc từ database-backed repo qua `db.getSongs()`
- Vì vậy, Studio có thể báo “sync success” nhưng UI home page vẫn rỗng nếu DB chưa có dữ liệu tương ứng hoặc nếu dữ liệu đang ở nguồn khác

## 3. Luồng thực tế kiểm tra lại
### 3.1 Studio sync endpoint
File: `xtremedia-v2/src/app/api/studio/sync/route.ts`

- validate secret `STUDIO_SYNC_SECRET`
- parse body bằng zod schema
- build idempotency key
- compute payload hash
- gọi `db.syncSongFromStudio(...)`
- trả `200` cho duplicate/reused, `201` cho created mới

### 3.2 Repository sync thực tế
File: `xtremedia-v2/src/lib/repositories/syncLogRepo.ts`

- `findUnique` theo `idempotencyKey`
- duplicate check theo:
  - `audioUrl`
  - hoặc `title + artistName`
  - hoặc `videoId`
  - hoặc `idempotencyKey`
- nếu match: `duplicate: true`, `status: 'REUSED'`
- nếu không match: tạo `Song` mới + `SyncLog` mới

### 3.3 Schema DB
File: `xtremedia-v2/prisma/schema.prisma`

- model `Song` có các trường bắt buộc như `title`, `artistId`, `audioUrl`, `status`
- model `SyncLog` có `idempotencyKey`, `payloadHash`, `status`, `error`
- `status` default là `ACTIVE`

## 4. Lỗi “thành công nhưng không thấy dữ liệu”
Tình huống này có thể xảy ra khi:
- Studio gửi lại cùng payload / cùng audioUrl / cùng title + artistName → bị treated as duplicate và trả `duplicate: true`
- Studio đang sync lên app khác hoặc endpoint sai
- UI đang xem phiên bản cũ / cache cũ / deployment khác

Lưu ý: `res.ok` không luôn có nghĩa là “đã tạo bản ghi mới”. Trong code Studio, nếu backend trả `200` thì Studio vẫn hiển thị `Đồng bộ thành công!` dù thực chất là `REUSED`.

## 5. Kiểm tra thực tế dữ liệu DB
Đã chạy query trực tiếp lên database project với env từ `.env.local`.

### 5.1 Record thực tế hiện có
```json
{
  "songs": [
    {
      "id": "song-1791796187859",
      "title": "MÃI MÃI MỘT TÌNH YÊU",
      "artist": "Đan Trường Singer Official",
      "genre": "Nhạc Trẻ V-Pop",
      "audioUrl": "https://github.com/Revizneid/xtremedia/releases/download/v2.0-music/dan-truong-singer-official-mai-mai-mot-tinh-yeu-1791796157941.mp3",
      "status": "ACTIVE",
      "createdAt": "2026-10-12T09:09:47.859Z"
    }
  ]
}
```

### 5.2 Duplicate check thực tế
```json
{
  "sample": {
    "id": "song-1791796187859",
    "title": "MÃI MÃI MỘT TÌNH YÊU",
    "artist": "Đan Trường Singer Official",
    "audioUrl": "https://github.com/Revizneid/xtremedia/releases/download/v2.0-music/dan-truong-singer-official-mai-mai-mot-tinh-yeu-1791796157941.mp3"
  },
  "duplicateByAudio": {
    "id": "song-1791796187859"
  },
  "duplicateByTitleArtist": {
    "id": "song-1791796187859"
  }
}
```

Kết luận: nếu Studio gửi lại cùng `audioUrl` hoặc cùng `title + artistName`, request sẽ bị classify là duplicate và trả `REUSED`.

## 6. Kiểm tra route đọc dữ liệu web
File: `xtremedia-v2/src/app/api/songs/route.ts`

- gọi `db.getSongs()`
- `db.getSongs()` đi qua `songRepo.getSongs()`
- với dữ liệu DB hiện có, route trả đúng dữ liệu cho public API

## 7. Fix cũ / fallback legacy store
File: `xtremedia-v2/src/lib/repositories/songRepo.ts`

- thêm fallback đọc legacy store JSON khi DB trống hoặc unavailable
- mục đích: giữ app không rỗng trong trường hợp DB không sẵn sàng
- Đây là lớp bảo vệ, không phải nguyên nhân gốc rễ nếu DB hiện đang có dữ liệu

## 8. Dấu hiệu đã “triệt để” xử lý hay chưa
Đã xử lý triệt để theo các điểm sau:
- luồng sync route và repo đã được đối chiếu
- DB thật có dữ liệu và API đọc được dữ liệu từ DB
- logic duplicate rõ ràng và hoạt động như design
- fallback legacy store đã được bổ sung cho trường hợp DB không có dữ liệu

Vẫn cần lưu ý:
- UI đang hiển thị “thành công” không phân biệt `duplicate` vs `created`
- nên nếu cần độ chính xác cao, Studio nên log rõ `duplicate` / `reused` và không hiển thị như “đã hiển thị trên web” khi thực chất chỉ là reused

## 9. Khuyến nghị cuối cùng
- Nếu muốn bắt chính xác case sync không tạo mới: log và phân biệt `duplicate` / `created`
- Nếu cần tránh 200 giả thành công: check `responseBody.duplicate` trong Studio và hiển thị message tương ứng
- Nếu issue còn xảy ra ngoài môi trường này: cần kiểm tra deployment đang gọi tới endpoint nào, cùng secret nào, cùng DB nào

## 10. Kết luận cuối cùng
Hiện trạng code và DB hiện tại cho thấy không còn lỗi “mất dữ liệu sau khi API 200” ở tầng source-of-truth. Dữ liệu thực sự đã tồn tại và có thể được đọc bởi web API. Vấn đề còn lại nếu có là ở môi trường triển khai / duplicate detection / log message sai chỗ, chứ không phải route lưu dữ liệu bị rơi.
