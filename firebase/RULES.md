# Giải thích luật bảo mật (`database.rules.json`)

Cấu hình Firebase trong game là công khai, ai cũng xem được. Thứ giữ cho dữ liệu an toàn là **các luật này**: Firebase kiểm tra từng lần đọc/ghi trước khi cho phép.

"Thành viên phòng" = người có tên trong `rooms/{mã}/players/{uid}`. "Host" = người có uid bằng `meta/hostUid`.

| Đường dẫn | Ai được đọc | Ai được ghi | Kiểm tra dữ liệu |
|---|---|---|---|
| `rooms/{mã}` (cả phòng) | Chỉ thành viên phòng | **Chỉ được xóa cả phòng**: chủ tiệm (dọn phòng cũ quá 24 giờ) hoặc người cuối cùng còn trong phòng (mọi ghế khác đều trống) | — |
| `rooms/{mã}/slots/1..4` (4 ghế) | Mọi người đã đăng nhập (để biết còn ghế trống không) | Giành một ghế **còn trống** bằng uid của chính mình; trả ghế của mình; host được trả ghế của người mất mạng quá lâu | Chỉ có ghế 1, 2, 3, 4 → **tối đa 4 người** |
| `rooms/{mã}/meta` | Mọi người đã đăng nhập (để biết mã phòng có tồn tại không trước khi vào) | Tạo mới: chỉ khi chưa có, và người tạo phải tự ghi mình là host + chủ tiệm. Sửa: thành viên phòng (để chuyển host, mở cửa, đóng phòng, cho trạm Kho chi két) | `hostUid` phải là một thành viên; **không ai đổi được `ownerUid`**; `status` chỉ là `lobby`, `playing` hoặc `closed`; `allowSpending` đúng/sai; không cho thêm trường lạ |
| `rooms/{mã}/players/{uid}` | Thành viên | Mỗi người **chỉ ghi thông tin của chính mình**. Phải **đang giữ một ghế** mới được ghi (hết ghế thì người thứ 5 bị chặn). Host được sửa người khác (để nhả trạm của người mất mạng lâu) nhưng không được xóa họ | Tên 1–16 ký tự; trạm chỉ là `cashier`, `tea`, `topping`, `stock`; `online` đúng/sai; outfit tối đa 24 ký tự; không cho thêm trường lạ |
| `rooms/{mã}/state` | Thành viên | **Chỉ host** (khách, ly, kho, két, giờ trong ngày, tiền) | Phải có `data` và `seq` (số) |
| `rooms/{mã}/live/{uid}` | Thành viên | Chỉ chính người đó (lượng trà đang rót dở) | Lượng trà là số từ 0 đến 2 |
| `rooms/{mã}/actions/{id}` | Thành viên | Thành viên **gửi thao tác của chính mình** (không giả danh người khác được); chỉ host được xóa sau khi xử lý | Phải có `uid`, `seq`, `action` |
| `rooms/{mã}/emotes/{id}` | Thành viên | Thành viên gửi biểu cảm của mình; chỉ người gửi được xóa | Chỉ 4 loại: tim, cười, like, "nhanh lên" |
| `userRooms/{uid}` | Chỉ chính người đó | Chỉ chính người đó (danh sách phòng mình đã tạo, để tự dọn) | — |
| `shops/{uid chủ tiệm}` | Chủ tiệm; host của phòng đang gắn với tiệm | **Chủ tiệm**, hoặc **host của phòng** mà phòng đó do chính chủ tiệm mở (`meta/ownerUid` = chủ tiệm) | `ownerUid` không đổi được; ngày chỉ tăng tối đa 7 mỗi lần ghi (hoặc về 1 khi chơi lại từ đầu); **két thay đổi tối đa 5.000k mỗi lần ghi**; mỗi nguyên liệu 0–100.000 và tăng tối đa 5.000 mỗi lần; tên tiệm 1–24 ký tự; không cho thêm trường lạ; không ai xóa được tiệm |
| `profiles/{uid}` | **Chỉ chính người đó** (trong đó có mã tài khoản) | **Chỉ chính người đó** | Tiền tip 0–1.000.000k và tăng tối đa 2.000k mỗi lần ghi; tên ≤ 16 ký tự; outfit ≤ 24 ký tự; không cho thêm trường lạ |

Những gì **không ai làm được**:
- Đọc phòng của người khác khi không phải thành viên.
- Sửa két, kho hay điểm nếu không phải host.
- Gửi thao tác dưới tên người khác.
- Vào phòng đã đủ 4 người.
- Đổi chủ tiệm.
- Ghi vào tiệm của người khác (trừ host của phòng do chính chủ tiệm mở), hay đọc / sửa profile của người khác.
- Làm két hay kho nhảy vọt bất thường trong một lần ghi.

Giới hạn còn lại (chấp nhận được với game chơi cùng bạn bè):
- Thành viên nào cũng có thể ghi `meta/hostUid` để chuyển host. Game cần quyền này để tự chuyển host khi host mất mạng, vì gói miễn phí không có máy chủ riêng.
- Một người rành kỹ thuật có thể tự sửa profile của **chính mình** (ví dụ tự cộng tip, trong giới hạn mỗi lần ghi). Không có máy chủ riêng thì không chặn hết được; nó không ảnh hưởng tới tiệm hay profile của người khác.
- Mã tài khoản thực chất là một cặp email/mật khẩu giả (`...@jamie.example.com`). Ai biết mã thì vào được tài khoản, nên đừng gửi mã cho người lạ.
