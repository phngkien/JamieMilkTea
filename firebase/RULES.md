# Giải thích luật bảo mật (`database.rules.json`)

Cấu hình Firebase trong game là công khai, ai cũng xem được. Thứ giữ cho dữ liệu an toàn là **các luật này**: Firebase kiểm tra từng lần đọc/ghi trước khi cho phép.

"Thành viên phòng" = người có tên trong `rooms/{mã}/players/{uid}`. "Host" = người có uid bằng `meta/hostUid`.

| Đường dẫn | Ai được đọc | Ai được ghi | Kiểm tra dữ liệu |
|---|---|---|---|
| `rooms/{mã}` (cả phòng) | Chỉ thành viên phòng | **Chỉ được xóa cả phòng**: chủ tiệm (dọn phòng cũ quá 24 giờ) hoặc người cuối cùng còn trong phòng | — |
| `rooms/{mã}/meta` | Mọi người đã đăng nhập (để biết mã phòng có tồn tại không trước khi vào) | Tạo mới: chỉ khi chưa có, và người tạo phải tự ghi mình là host + chủ tiệm. Sửa: thành viên phòng (để chuyển host, mở cửa) | `hostUid` phải là một thành viên; **không ai đổi được `ownerUid`**; `status` chỉ là `lobby` hoặc `playing`; không cho thêm trường lạ |
| `rooms/{mã}/players/{uid}` | Thành viên | Mỗi người **chỉ ghi thông tin của chính mình**. Vào mới chỉ khi phòng **còn dưới 4 người** (người thứ 5 bị chặn). Host được sửa người khác (để nhả trạm của người mất mạng lâu) nhưng không được xóa họ | Tên 1–16 ký tự; trạm chỉ là `cashier`, `tea`, `topping`, `stock`; `online` đúng/sai; không cho thêm trường lạ |
| `rooms/{mã}/state` | Thành viên | **Chỉ host** (khách, ly, kho, két, giờ trong ngày, tiền) | Phải có `data` và `seq` (số) |
| `rooms/{mã}/live/{uid}` | Thành viên | Chỉ chính người đó (lượng trà đang rót dở) | Lượng trà là số từ 0 đến 2 |
| `rooms/{mã}/actions/{id}` | Thành viên | Thành viên **gửi thao tác của chính mình** (không giả danh người khác được); chỉ host được xóa sau khi xử lý | Phải có `uid`, `seq`, `action` |
| `rooms/{mã}/emotes/{id}` | Thành viên | Thành viên gửi biểu cảm của mình; chỉ người gửi được xóa | Chỉ 4 loại: tim, cười, like, "nhanh lên" |
| `userRooms/{uid}` | Chỉ chính người đó | Chỉ chính người đó (danh sách phòng mình đã tạo, để tự dọn) | — |
| `profiles/{uid}` | Mọi người đã đăng nhập | **Chỉ chính người đó** (dùng ở Prompt 5) | — |

Những gì **không ai làm được**:
- Đọc phòng của người khác khi không phải thành viên.
- Sửa két, kho hay điểm nếu không phải host.
- Gửi thao tác dưới tên người khác.
- Vào phòng đã đủ 4 người.
- Đổi chủ tiệm.

Giới hạn còn lại (chấp nhận được với game chơi cùng bạn bè): thành viên nào cũng có thể ghi `meta/hostUid` để chuyển host. Game cần quyền này để tự chuyển host khi host mất mạng, vì gói miễn phí không có máy chủ riêng.
