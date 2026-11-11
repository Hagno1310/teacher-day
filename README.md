# Tri ân 20/11

Web gửi lời chúc tới thầy cô. Next.js 15 + Postgres, chạy bằng Docker Compose.

## Chạy

```bash
cp .env.example .env      # rồi sửa các giá trị trong .env
docker compose up -d --build
```

Web chạy ở `http://<server>:3000`.

Trước lần chạy đầu, điền danh sách thầy cô vào `data/teachers.txt`, mỗi dòng một tên. File này chỉ được nạp khi bảng thầy cô còn trống.

## Cấu hình (.env)

| Biến | Ý nghĩa |
|---|---|
| `PTIT_SSO`, `PTIT_SSO_ISSUER`, `PTIT_SSO_CLIENT_ID` | SSO sinh viên PTIT (SLINK PTIT, Keycloak). Mặc định đã đúng hạ tầng PTIT. Keycloak phải cho phép redirect URI `{NEXTAUTH_URL}/api/auth/callback/ptit` |
| `STUDENT_EMAIL_DOMAINS` | Chỉ cho các đuôi email này đăng nhập gửi lời chúc |
| `AUTH_DEV_LOGIN` | `true` = cho đăng nhập thử bằng email bất kỳ. **Đặt `false` khi chạy thật** |
| `GEMINI_API_KEYS` | Nhiều key, ngăn cách bằng dấu phẩy. Hết quota thì tự chuyển key; hết sạch (hoặc để trống) thì bỏ qua bước AI: lời chúc qua lọc từ khóa nằm ở "Chờ duyệt" để quản trị bấm Duyệt ở trang `/admin` (có key trở lại thì AI tự duyệt nốt, 5 phút một lần) |
| `OPEN_AT` / `CLOSE_AT` | Khung giờ cho phép gửi |
| `ADMIN_PASSWORD` | Mật khẩu trang `/admin` |
| `ADMIN_API_TOKEN` | Token cho web quản trị chung gọi API |

Đổi key hoặc cấu hình xong thì chạy lại `docker compose up -d`.

## Ràng buộc gửi lời chúc

- Ràng buộc trong database: mỗi sinh viên gửi 1 lời chúc chung, và gửi mỗi thầy cô tối đa 1 lời chúc riêng.
- Kiểm tra ở server: giữa hai lần gửi thành công phải cách nhau 1 phút; bị từ chối 5 lần trong 10 phút thì khóa tạm 10 phút.
- Lời chúc bị từ chối không tính lượt.
- Kiểm duyệt gồm 2 lớp: lọc từ khóa (`lib/moderation.js`), rồi Gemini.

## API quản trị

Gọi kèm header `Authorization: Bearer <ADMIN_API_TOKEN>`.

- `GET /api/admin/wishes?status=approved|rejected|pending|hidden&limit=&before=`
- `PATCH /api/admin/wishes/:id` với body `{ "status": "hidden" | "approved" }`: ẩn/hiện lời chúc, hoặc duyệt tay lời đang chờ (khi Gemini hết key/quota)
- `GET /api/admin/stats`
- `GET /api/admin/export`: xuất file CSV
- `POST /api/admin/teachers` với body `{ "names": [...] }`; `PATCH /api/admin/teachers` với body `{ "id", "active" }`

## Phát triển

```bash
pnpm install
docker compose up -d db   # cần mở cổng 5432 của db, hoặc tự trỏ DATABASE_URL tới một Postgres khác
pnpm dev
pnpm test                 # test bộ lọc từ khóa
```
