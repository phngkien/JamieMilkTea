# Jamie's Milk Tea 🧋

Game quản lý và pha chế tiệm trà sữa, chạy trên trình duyệt (iPhone, iPad, máy tính).

Chơi online: **https://phngkien.github.io/JamieMilkTea/**

---

## 1. Chạy game trên máy tính

Cần cài **Node.js** (bản 22 trở lên). Mở thư mục dự án trong VS Code, mở Terminal (menu **Terminal → New Terminal**, là PowerShell) rồi gõ:

1. Cài thư viện (chỉ cần làm lần đầu, hoặc khi `package.json` thay đổi):
   ```powershell
   npm install
   ```
2. Chạy game:
   ```powershell
   npm run dev
   ```
   Terminal sẽ hiện dòng `Local: http://localhost:5173/`. Giữ phím **Ctrl** và bấm vào link đó để mở game.
3. Muốn dừng thì bấm vào Terminal rồi nhấn **Ctrl + C**.

Các lệnh khác:

| Lệnh | Để làm gì |
|---|---|
| `npm test` | Chạy test logic game (phải hiện toàn chữ xanh `passed`) |
| `npm run build` | Đóng gói game vào thư mục `dist` (giống bản đưa lên mạng) |
| `npm run preview` | Mở thử bản đã đóng gói |

## 2. Mở thử trên iPhone (cùng wifi với máy tính)

1. Trên máy tính chạy:
   ```powershell
   npm run dev -- --host
   ```
2. Terminal hiện thêm dòng dạng `Network: http://192.168.1.23:5173/`. Đó là địa chỉ máy tính trong mạng wifi nhà bạn.
   (Nếu không thấy, gõ `ipconfig` trong một Terminal khác và tìm dòng **IPv4 Address** của Wi-Fi.)
3. Nếu Windows hiện hộp thoại **Windows Defender Firewall** hỏi cho phép Node.js: tick **Private networks** rồi bấm **Allow access**.
4. Trên iPhone (cùng wifi) mở Safari, gõ đúng địa chỉ `http://192.168.x.x:5173/` ở bước 2.
5. Xoay ngang iPhone để xem bố cục ngang.

## 3. Đưa game lên mạng (GitHub Pages)

Mỗi lần **push** code lên nhánh `main`, GitHub sẽ tự test, build và cập nhật trang game (file `.github/workflows/deploy.yml`).

**Bật GitHub Pages (chỉ làm một lần):**

1. Mở https://github.com/phngkien/JamieMilkTea
2. Bấm tab **Settings** (bánh răng, hàng trên cùng của repo).
3. Ở cột trái bấm **Pages**.
4. Mục **Build and deployment → Source**, chọn **GitHub Actions**.

**Xem tiến trình deploy:**

1. Bấm tab **Actions** của repo.
2. Lượt chạy mới nhất tên **Deploy lên GitHub Pages**. Vòng vàng = đang chạy, dấu ✓ xanh = xong, dấu ✗ đỏ = lỗi (bấm vào để xem lỗi).
3. Khi có ✓ xanh, mở **https://phngkien.github.io/JamieMilkTea/** (có thể phải đợi 1–2 phút và tải lại trang).

**Push code từ máy tính:**

```powershell
git status          # kiểm tra: KHÔNG được thấy thư mục _tham-khao
git add -A
git commit -m "Mô tả ngắn thay đổi"
git push
```

Lần đầu `git push`, Windows có thể mở cửa sổ **Connect to GitHub**: bấm **Sign in with your browser**, đăng nhập GitHub, bấm **Authorize**. Những lần sau không phải đăng nhập lại.

**Cài lên màn hình chính iPhone:** mở link game bằng Safari → nút **Chia sẻ** → **Thêm vào MH chính**.

## 4. Cách chơi (bản hiện tại)

1. Khách đến và gọi món trong bong bóng: size, loại trà, % đường, mức đá, topping.
2. Chạm chồng **Cốc M** hoặc **Cốc L** → ly đặt lên bảng gỗ.
3. **Nhấn giữ** bình trà đúng loại, thả tay khi mực trà nằm trong **vạch xanh**. Giữ quá lâu thì tràn, ly hỏng.
4. Chạm **Nước đường**: 1 lần = 30%, 2 = 50%, 3 = 70%, 4 = 100%.
5. Chạm **Đá viên**: 1 lần = ít đá, 2 lần = đá bình thường.
6. Chạm hũ topping: mỗi lần một muỗng.
7. Kéo ly vào **Máy ép nắp**, rồi kéo ly tới khách (hoặc chạm nút **Giao**).
8. Ly hỏng / làm sai thì kéo vào **Thùng rác**.

Vuốt nền để cuộn; thanh dưới cùng có nút nhảy nhanh **Quầy trà · Pha ly · Topping · Kho hàng**.

**Kho và tiền:**

- Mỗi bình trà, chồng cốc, hũ topping, đá, nước đường có số tồn ở góc. Còn ít thì nhãn nhấp nháy cam; hết thì hiện chữ **"Hết"** và không dùng được.
- Bấm **Kho hàng** để nhập thêm (trừ tiền két) hoặc mở khóa trà / topping mới (có món phải đợi tới ngày nhất định). Trên màn hình ngang, nút Kho nằm trên thanh trên cùng.
- Một ngày dài khoảng 4 phút (08:00 → 20:00). Hết giờ thì không nhận khách mới; phục vụ xong khách cuối thì hiện bảng **"Hết ngày N"**: doanh thu, chi phí, lãi, két.
- Lãi = doanh thu − nguyên liệu của các ly đã bán − hao phí (ly đổ / hỏng) − tiền thuê tiệm. Tiền nhập hàng nằm ở phần **Két**.

**Âm thanh và hình động:** game có tiếng rót (cao dần khi ly đầy), xúc đá, ép nắp, chuông khách vào, tiền, nhạc nền nhẹ. Âm thanh chỉ bắt đầu sau lần chạm đầu tiên (luật của trình duyệt; trên iPhone nhớ tắt chế độ im lặng). Nút 🔊 trên cùng bên phải để tắt/bật tiếng; trong **⚙ Cài đặt** có tắt riêng **Nhạc nền** và bật **Giảm chuyển động** (bớt hình động). Âm lượng, nhịp và giai điệu nhạc nền chỉnh trong `src/config/audio.ts`.

**Lưu game:** game tự lưu trên máy (khi giao ly, nhập hàng, cuối ngày, khi đóng tab), và khi có mạng thì lưu lên cloud (Firebase) sau vài giây. Mở lại sẽ chơi tiếp ở lúc mở cửa (08:00) của ngày đang chơi. Muốn chơi lại từ đầu: nút **⚙** → **Chơi lại từ đầu** (hỏi lại 2 lần; tiền tip và outfit vẫn giữ).

**Tiệm của tôi, tip, outfit:**

- Bấm **tên tiệm** ở giữa thanh trên cùng để mở **Tiệm của tôi**: đổi tên tiệm, xem ngày / két / đánh giá, mua **nâng cấp** (ghế chờ, hũ tip, mối nhập hàng, bảng hiệu đèn) và **trang trí** (chậu cây, tranh, bình hoa) bằng tiền két.
- Ly ngon (từ 60 điểm) thì khách cho **tip**. Tip là tiền **riêng** của người làm ly, không vào két. Chơi chung thì tip chia cho những người đã làm ly đó theo điểm từng trạm.
- **Tủ đồ** (trong Tiệm của tôi): dùng tip mua outfit cho nhân viên của mình.
- Chơi chung: chỉ **chủ tiệm** được chi tiền két. Chủ phòng có thể bật **"Cho trạm Kho chi tiền két"** trong phòng chờ. Chủ tiệm rời phòng thì phòng đóng, mọi người quay về tiệm của mình.

**Bảng xếp hạng và thành tích:**

- Bảng **"Hết ngày N"** có **Bảng xếp hạng hôm nay**: điểm trung bình của từng người (theo trạm mình làm), số ly, và 🔥 chuỗi ly hoàn hảo liên tiếp dài nhất (ly từ 90 điểm).
- Chơi chung từ 2 người: ai điểm cao nhất (làm tối thiểu 3 ly) được 👑 **Nhân viên xuất sắc**. Số lần đạt danh hiệu lưu trong hồ sơ cá nhân.
- **Tiệm của tôi → Bảng thành tích của tiệm**: ai Xuất sắc nhiều nhất, chuỗi dài nhất, giỏi nhất từng trạm (cần 10 ly ở trạm đó), số ngày công của mỗi người. Bên dưới là **Thành tích của bạn**.

**Tài khoản:** mặc định là tài khoản khách (chỉ nằm trên trình duyệt đó). Vào **Tiệm của tôi → Tài khoản** để giữ tài khoản:

- **Giữ bằng Google**: bấm nút, chọn Google. Trên máy khác cũng bấm nút đó, chọn đúng Google → game hỏi chuyển sang tài khoản đó → đồng ý.
- **Mã tài khoản** (8 ký tự, ví dụ `ABCD-2345`): bấm **Tạo mã tài khoản**, chép mã ra giấy. Trên máy khác: ô **Đăng nhập bằng mã** → gõ mã. Cách này chạy được cả khi mở game từ màn hình chính iPhone.

## 5. Chỉnh số liệu cân bằng

| Muốn chỉnh | Sửa file |
|---|---|
| Két ban đầu, tiền thuê, số tồn ban đầu, giá nhập, gói nhập, giá mở khóa | `src/config/inventory.ts` |
| Số khách mỗi ngày, kiên nhẫn, tỉ lệ order 2 ly, độ dài một ngày | `src/config/progression.ts` |
| Giá bán trà / topping | `src/config/teas.ts`, `src/config/toppings.ts` |
| Phụ thu size L, vạch xanh, tốc độ rót | `src/config/cup.ts` |
| Cách chấm điểm | `src/config/scoring.ts` |
| Âm lượng, nhạc nền | `src/config/audio.ts` |
| Khách (tên, tóc, trang phục) | `src/config/characters.ts` |
| Nâng cấp, trang trí tiệm (giá, tác dụng) | `src/config/upgrades.ts` |
| Outfit (giá bằng tip) | `src/config/outfits.ts` |
| Tỉ lệ tip, điểm từng trạm | `src/config/scoring.ts` (`TIP`, `STATION_SCORING`) |
| Mức ly hoàn hảo, điều kiện Nhân viên xuất sắc, bảng thành tích | `src/config/scoring.ts` (`LEADERBOARD`) |

Mẹo khi chạy `npm run dev`: mở Console của trình duyệt (F12) và gõ `jamie.adapter.getState()` để xem toàn bộ số liệu đang chạy.

## 6. Cấu trúc dự án (tóm tắt)

- `src/config/` — số liệu game (giá, trà, topping, độ khó, chữ tiếng Việt). Muốn chỉnh cân bằng game thì sửa ở đây.
- `src/core/` — luật chơi (không phụ thuộc hình ảnh), có test trong `tests/`.
- `src/art/` — mọi hình vẽ bằng code (SVG): khách, ly, bình, khay, nền tiệm. Xem nhanh tại `preview.html`.
- `src/scenes/`, `src/entities/` — dựng cảnh, vật thể, hình động (Phaser).
- `src/audio/` — âm thanh và nhạc nền tổng hợp bằng Web Audio.
- `src/layout/` — vị trí mọi vật cho màn hình dọc và ngang.
- `src/ui/` — HUD, thanh nút, thẻ hướng dẫn (HTML/CSS).
- `src/net/` — `LocalAdapter` cho chơi một mình, `FirebaseAdapter` cho chơi chung, `cloud.ts` lưu tiệm / profile trên Firebase và tài khoản.
- `src/save/` — lưu game trên máy (IndexedDB + localStorage), đồng bộ với cloud (`sync.ts`: luật xử lý xung đột, có test).
- `firebase/` — luật bảo mật của Firebase và giải thích (`RULES.md`).

## 7. Cài đặt Firebase (tài khoản và lưu cloud)

Làm **một lần** trên [Firebase Console](https://console.firebase.google.com), dự án **jamie-milk-tea**:

1. Menu trái **Build → Authentication** → tab **Sign-in method**.
2. Bấm **Anonymous** → kiểm tra đang **Enabled** (đã bật từ trước).
3. Bấm **Add new provider** → **Google** → gạt **Enable** → chọn email hỗ trợ (email của bạn) → **Save**.
4. Bấm **Add new provider** → **Email/Password** → gạt **Enable** dòng đầu tiên (Email/Password), **không** bật "Email link" → **Save**. (Cái này dùng cho **Mã tài khoản**.)
5. Vẫn trong Authentication → tab **Settings** → **Authorized domains** → kiểm tra có `phngkien.github.io` (chưa có thì bấm **Add domain**, gõ `phngkien.github.io`, **Add**). `localhost` có sẵn.
6. Menu trái **Build → Realtime Database** → tab **Rules** → xóa hết nội dung cũ, dán **toàn bộ** nội dung file `firebase/database.rules.json` → bấm **Publish**.

Kết quả mong đợi: trong game, **Tiệm của tôi → Tài khoản** hiện "Tài khoản khách" kèm hai nút; bấm **Tạo mã tài khoản** sẽ hiện mã 8 ký tự.

Nếu game báo "Tính năng này chưa được bật trong Firebase" thì bước 3 hoặc 4 chưa xong.

Thư mục `_tham-khao/` chỉ để tham khảo, **không bao giờ** được đưa lên GitHub (đã có trong `.gitignore`).
