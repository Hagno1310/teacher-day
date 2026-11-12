# Tri ân 20/11

Web gửi lời chúc tới thầy cô. Next.js 15 + Postgres, chạy bằng Docker Compose.

## Chạy

```bash
cp .env.example .env      # rồi sửa các giá trị trong .env
docker compose up -d --build
```

Web chạy ở `http://<server>:3000`.

Trước lần chạy đầu, điền danh sách thầy cô vào `data/teachers.txt`, mỗi dòng một tên. File này chỉ được nạp khi bảng thầy cô còn trống.

Khi cổng gửi đang mở, truy cập trang chủ `/` sẽ vào `/gui` nếu tường có dưới 5 lời chúc đã duyệt, hoặc khách chưa đăng nhập / chưa gửi lời chúc nào hợp lệ. Lời đang chờ duyệt vẫn được tính là đã gửi; lời bị từ chối không tính. Khi tường có từ 5 lời chúc và người xem đã gửi ít nhất một lời, trang chủ mở tường như bình thường.

Nút **Tường lời chúc** dẫn tới `/?wall=1` để luôn xem tường và hiệu ứng mở thư theo lựa chọn của người xem. Khi cổng gửi đóng, trang chủ mặc định cũng mở tường.

## Cấu hình (.env)

| Biến | Ý nghĩa |
|---|---|
| `AUTH_TRUST_HOST` | File mẫu đặt `true` để tự nhận domain/protocol bên ngoài cho SSO. Proxy phải ghi đè đúng `Host`, `X-Forwarded-Host`, `X-Forwarded-Proto` |
| `NEXTAUTH_URL` | Tùy chọn cố định domain chuẩn, ví dụ `https://tri-an.example.edu.vn`. Bỏ hẳn biến này để tự nhận domain đang truy cập; không đặt giá trị rỗng hoặc giữ localhost khi deploy |
| `PTIT_SSO`, `PTIT_SSO_NAME`, `PTIT_SSO_ISSUER`, `PTIT_SSO_CLIENT_ID` | Bật/tắt SSO, tên hiển thị, issuer và client ID. Mặc định dùng SLINK PTIT. Keycloak phải cho phép redirect URI `{domain-web}/api/auth/callback/ptit` |
| `PTIT_SSO_CLIENT_SECRET` | Để trống với client công khai dùng PKCE. Chỉ điền nếu được cấp client riêng có secret |
| `STUDENT_EMAIL_DOMAINS` | Danh sách tên miền email được phép, ngăn cách bằng dấu phẩy. Mặc định khi thiếu biến là `stu.ptit.edu.vn`; đặt rỗng để cho phép mọi tên miền khi thử dev |
| `AUTH_DEV_LOGIN` | `true` = cho đăng nhập thử chỉ bằng email, vẫn áp dụng giới hạn tên miền. **Đặt `false` khi chạy thật** |
| `GEMINI_API_KEYS` | API key Gemini, nhiều key ngăn cách bằng dấu phẩy. Key hỏng thì đổi key; giới hạn model thì đổi model. Khi AI chưa sẵn sàng, lời chúc qua lọc từ khóa được lưu "Chờ duyệt" để quản trị duyệt hoặc job nền thử lại sau mỗi 5 phút |
| `GEMINI_MODELS` | Danh sách model ưu tiên, ngăn cách bằng dấu phẩy. Mặc định: 3.5 Flash Lite, 3.1 Flash Lite, 3.6 Flash, 3 Flash Preview. Biến `GEMINI_MODEL` cũ vẫn dùng khi chưa đặt danh sách này |
| `OPEN_AT` / `CLOSE_AT` | Khung giờ cho phép gửi |
| `ADMIN_PASSWORD` | Mật khẩu trang `/admin` |
| `ADMIN_API_TOKEN` | Token cho web quản trị chung gọi API |

Đổi key hoặc cấu hình xong thì chạy lại `docker compose up -d`.

## Domain khi deploy

**HTTPS có sẵn:** `docker-compose.yml` kèm Caddy tự cấp chứng chỉ Let's Encrypt cho `DOMAIN`. Trên server: bản ghi DNS `A` của `teacherday.ript.vn` trỏ về server, mở cổng 80 + 443, `.env` đặt `DOMAIN=teacherday.ript.vn` và `NEXTAUTH_URL=https://teacherday.ript.vn`, rồi `docker compose up -d --build`. App chỉ mở cổng 3000 trong máy; không cần Nginx bên dưới.

Mặc định `.env.example` dùng `AUTH_TRUST_HOST=true` và không khai báo `NEXTAUTH_URL`. Đăng nhập, đăng xuất và callback lấy cùng domain/protocol của request bên ngoài. Chạy local trả về đúng host/cổng đang mở; sau proxy HTTPS trả về `https://domain-thuc-te`, không dùng host/cổng Docker bên trong. Cookie phiên HTTPS cũng được đọc đúng khi logout.

Proxy kết thúc HTTPS phải ghi đè các header bên dưới theo domain/protocol công khai. Ví dụ trong `server` Nginx phục vụ đúng domain và HTTPS:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $http_host;
    proxy_set_header X-Forwarded-Host $http_host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Nếu muốn chỉ dùng một domain chuẩn, khai báo `NEXTAUTH_URL=https://domain-thuc-te` ở môi trường chạy; đăng nhập và logout đều ưu tiên cùng giá trị này. Biến này không cần có khi tự nhận host; không khai báo dạng `NEXTAUTH_URL=` rỗng. [Cấu hình NextAuth](https://next-auth.js.org/configuration/options).

Đăng ký hai địa chỉ tương ứng domain triển khai trong client SSO: `https://domain-thuc-te/api/auth/callback/ptit` ở **Valid Redirect URIs** và `https://domain-thuc-te/gui` ở **Valid Post Logout Redirect URIs**.

## SSO PTIT và dev RIPT

Dùng chung luồng OpenID Connect của NextAuth: Authorization Code + PKCE và kiểm tra state, chữ ký token. Web chỉ nhận email do SSO trả về (hoặc `preferred_username` là email đầy đủ), không tự ghép username thành email sinh viên.

Tên tài khoản hiển thị theo thứ tự họ + tên từ `family_name` và `given_name` của SSO. Nếu SSO không trả đủ hai trường thì dùng tên đầy đủ hoặc username. Phiên đăng nhập cũ cần đăng xuất rồi đăng nhập lại để cập nhật tên.

Để dùng SSO PTIT trên máy, đặt trong `.env`:

```env
AUTH_TRUST_HOST=true
PTIT_SSO=true
PTIT_SSO_NAME=SLINK PTIT
PTIT_SSO_ISSUER=https://gwdu.ptit.edu.vn/sso/realms/ptit
PTIT_SSO_CLIENT_ID=ptit-ript-public
PTIT_SSO_CLIENT_SECRET=
STUDENT_EMAIL_DOMAINS=stu.ptit.edu.vn
AUTH_DEV_LOGIN=false
```

Client công khai `ptit-ript-public` đã được kiểm tra mở trang đăng nhập PTIT với callback `http://localhost:3000/api/auth/callback/ptit`. Mở web bằng `http://localhost:3000` để dùng cùng địa chỉ với callback, tránh tách cookie giữa `localhost` và `127.0.0.1`.

Nếu cần chuyển về SSO dev RIPT, đặt trong `.env`:

```dotenv
AUTH_TRUST_HOST=true
PTIT_SSO=true
PTIT_SSO_NAME=RIPT SSO (dev)
PTIT_SSO_ISSUER=https://sso.ript.vn/realms/ript
PTIT_SSO_CLIENT_ID=ript-connect
PTIT_SSO_CLIENT_SECRET=
STUDENT_EMAIL_DOMAINS=
AUTH_DEV_LOGIN=false
```

`STUDENT_EMAIL_DOMAINS=` chỉ dành cho thử dev: mọi email hợp lệ từ SSO đều được phép. Có thể đặt tên miền email tài khoản thử để giới hạn lại. SSO vẫn phải cung cấp email hợp lệ; username đơn thuần sẽ bị từ chối.

Khởi động lại `pnpm dev` (hoặc tạo lại container app), mở `/gui`, bấm **Đăng nhập bằng RIPT SSO (dev)**. Callback vẫn là `http://localhost:3000/api/auth/callback/ptit` vì ID provider trong web là `ptit`. Kiểm tra provider đang dùng tại `/api/auth/providers`.

Khi triển khai PTIT, giữ chế độ tự nhận domain hoặc đặt `NEXTAUTH_URL` theo domain chuẩn như hướng dẫn ở trên. Nhờ quản trị SSO đăng ký chính xác `{domain-web}/api/auth/callback/ptit` trong **Valid Redirect URIs** của client. Client cũ `ptit-connect` từ chối callback localhost trên; cấu hình PTIT hiện dùng `ptit-ript-public`. SSO dev RIPT dùng `ript-connect` trong realm RIPT. Nếu được cấp client riêng, thay ID/secret tương ứng.

Lỗi **Invalid parameter: redirect_uri** cần sửa danh sách callback phía SSO, cấu hình host/protocol của proxy hoặc `NEXTAUTH_URL` nếu có; lỗi **Client not found** cần kiểm tra đúng cặp issuer/client ID. Không cần bật `AUTH_DEV_LOGIN` để dùng SSO dev RIPT.

Thông báo lỗi đăng nhập được đọc một lần rồi gỡ khỏi URL cùng các tham số callback cũ. Trang gửi kiểm tra lại phiên khi quay lại tab, dùng nút Back hoặc đăng nhập/đăng xuất ở tab khác; `/api/me` không được cache. Bấm **Đăng xuất** sẽ xóa phiên web bằng POST có CSRF rồi chuyển tới endpoint logout của Keycloak để kết thúc phiên SSO, sau đó trở về `/gui` trên cùng domain. ID token dùng làm `id_token_hint` được lưu trong JWT mã hóa/HttpOnly; API session không trả token cho giao diện. Client SSO cần cho phép **Valid Post Logout Redirect URIs** là `{domain-web}/gui` (đã kiểm tra chấp nhận `http://localhost:3000/gui` với `ptit-ript-public`). Phiên cũ trước thay đổi này chưa có ID token nên SSO có thể yêu cầu xác nhận logout; đăng nhập lại một lần để các lần logout sau có đủ dữ liệu. Lần đăng nhập tiếp theo tạo state/PKCE mới, không ép mở màn “Please re-authenticate”.

## Kiểm duyệt Gemini

Lời chúc đi qua bộ lọc từ khóa trước, sau đó Gemini kiểm tra ngữ nghĩa. Mỗi lời chỉ cần một quyết định AI hợp lệ. Model trả JSON sai cấu trúc, thiếu quyết định hoặc hết thời gian thì chuyển model tiếp theo; không tự duyệt hoặc từ chối lời chúc chỉ vì AI lỗi. Nếu các model đều chưa sẵn sàng, lời chúc được lưu **Chờ duyệt**, chưa xuất hiện trên tường.

Chỉ duyệt nội dung có lời chúc hoặc mong ước điều tốt đẹp dành cho thầy cô. Lời chào thông dụng được chặn ngay trước khi gọi AI, kể cả khi thiếu key. Hỏi thăm, giới thiệu hoặc cảm ơn đơn thuần cũng không được AI duyệt. Ví dụ: “Xin chào thầy cô” bị từ chối; “Mong cô luôn khỏe mạnh, bình an” hoặc “Chào cô, chúc cô 20/11 vui vẻ” có thể được duyệt. Server yêu cầu cả hai trường `isWish=true` và `ok=true` từ AI trước khi cho hiện lời chúc.

```dotenv
GEMINI_API_KEYS=<key-cua-ban>
GEMINI_MODELS=gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.6-flash,gemini-3-flash-preview
```

Các ngưỡng trong `lib/gemini.js` theo bảng quota đã cung cấp của project:

| Model | RPM | RPD | Vai trò |
|---|---:|---:|---|
| `gemini-3.5-flash-lite` | 15 | 500 | Ưu tiên đầu tiên |
| `gemini-3.1-flash-lite` | 15 | 500 | Dự phòng có quota ngày cao |
| `gemini-3.6-flash` | 5 | 20 | Dự phòng ổn định |
| `gemini-3-flash-preview` | 5 | 20 | Dự phòng cuối |

Web giữ lượt trước khi gọi API để các request đồng thời không cùng vượt bộ đếm RPM. Quota được đếm chung giữa API gửi lời chúc và job nền trong một process, áp dụng chung cho mọi key; key cùng project không cộng thêm quota. Quota thực tế vẫn do Google quyết định. Bộ đếm này được đặt lại khi process khởi động; nếu chạy nhiều replica, mỗi replica có bộ đếm riêng và phải tiếp tục tuân theo phản hồi `429` từ Google. [Tài liệu quota Gemini](https://aistudio.google.com/docs/rate-limits).

Khi Google trả `429`, web tạm bỏ qua model theo `Retry-After` / `RetryInfo`; nếu hết quota ngày thì đợi qua ngày Pacific. Lỗi model, quá tải hoặc timeout cũng chuyển model. Mỗi lần kiểm duyệt tối đa 6 lần gọi, mỗi lần tối đa 6 giây, tổng thời gian gọi AI tối đa 15 giây. Không có vòng chờ hoặc retry vô hạn. Giới hạn TPM của bảng là 250K cho các model trên; đầu vào lời chúc được giới hạn 300 ký tự và đầu ra AI tối đa 1.024 token. Giới hạn TPM do Google kiểm soát, lỗi TPM cũng được xử lý như `429`.

Để kiểm tra từng model bằng một lời chúc mẫu (có sử dụng quota):

```bash
pnpm check:gemini
```

Lệnh chỉ in model, trạng thái và thời gian, không in key. Đổi key/model xong, khởi động lại web. Giữ key trong `.env`, không đưa vào mã nguồn hoặc biến `NEXT_PUBLIC_*`.

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
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
# Tạo .env.local như hướng dẫn dưới trước khi chạy dev
pnpm dev
pnpm test                 # test từ khóa, email SSO và chuyển model/quota Gemini
```

Để chạy `pnpm dev` trên máy và Postgres trong Docker, tạo file `.env.local` ở thư mục gốc:

```dotenv
DATABASE_URL=postgres://trian:<POSTGRES_PASSWORD-trong-.env>@127.0.0.1:5432/trian
```

Thay phần mật khẩu bằng giá trị thực trong `.env` (mã hóa ký tự đặc biệt theo URL nếu có). `.env.local` chỉ ghi đè kết nối cho Next.js chạy trên máy, được bỏ qua trong Git và Docker build. Giữ `DATABASE_URL` trong `.env` trỏ tới `db:5432` cho app chạy bằng Docker Compose. Khởi động lại `pnpm dev` sau khi đổi kết nối database.

File Compose dev chỉ mở Postgres trên `127.0.0.1:5432`. Docker Desktop cần đang chạy. Nếu đăng nhập SSO xong mà chưa tải được dữ liệu, kiểm tra container db bằng `docker compose ps`; trang gửi lời chúc sẽ hiện thông báo và nút **Thử lại** khi API lỗi.
