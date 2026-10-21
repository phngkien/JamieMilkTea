# CLAUDE.md — Jamie's Milk Tea (v2)

File này là "luật chung" của dự án. Đọc kỹ trước mỗi nhiệm vụ và luôn tuân theo.
Nếu một yêu cầu của tôi mâu thuẫn với file này, hãy hỏi lại tôi trước khi làm.

---

## 1. Dự án là gì

**Jamie's Milk Tea** là game quản lý và pha chế tiệm trà sữa, làm để tặng bạn gái. Người chơi chính là con gái và trẻ em.

- **Một cảnh duy nhất, màn hình dọc, cuộn lên xuống.** Cả tiệm là một cảnh cao: khách và quầy trà ở trên, khu pha ly ở giữa, kệ topping và nước đường ở dưới. Không có màn hình chuyển trạm kiểu Papa's.
- **Khách gọi món chi tiết:** size M/L, loại trà, % đường, mức đá, topping, có thể nhiều ly một lượt. Mỗi khách có **thanh kiên nhẫn**.
- **Pha ly:** chọn cốc, giữ bình để rót trà tới vạch xanh, chạm vòi nước đường, xúc đá, chạm hũ topping, ép nắp, giao cho khách.
- **Kho hàng:** mọi nguyên liệu có số tồn. Hết thì phải nhập (mất tiền két). Topping, trà, foam mới bị khóa cho tới khi mua.
- **Tiền và tổng kết ngày:** doanh thu, chi phí, lãi, tiền trong két. Sao đánh giá và số lượt đánh giá tích lũy.
- **Chơi lâu dài:** qua từng ngày mở khóa món mới, độ khó tăng, nâng cấp và trang trí tiệm, outfit, khách quen, bình luận của khách, sự kiện bất ngờ.
- **Chơi chung 1–4 người** qua internet, ở xa hay ở gần đều được. Mỗi người nhận một trạm trong cùng một tiệm.
- **Có đánh giá ai giỏi hơn:** chấm điểm riêng từng người theo trạm họ làm, có bảng xếp hạng.
- **Chạy trên trình duyệt** (iPhone, iPad, máy tính) qua link GitHub Pages. Không cần cài đặt, cài lên màn hình chính được (PWA).
- **Không có nhân viên thuê (NPC).** Các trạm do người chơi làm. Chơi một mình thì một người làm hết cả 4 trạm.

## 2. Về tôi (người dùng)

- Tôi **chưa học lập trình**. Hãy giải thích bằng tiếng Việt, ngắn gọn, không giả định tôi biết thuật ngữ.
- Khi tôi phải tự làm gì (tạo tài khoản, bấm nút trên web, chạy lệnh), hãy ghi **từng bước đánh số**: bấm vào đâu, gõ lệnh gì, kết quả mong đợi trông thế nào.
- Máy tôi là **Windows**, dùng **VS Code**, terminal là **PowerShell**. Lệnh phải chạy được trên PowerShell.
- **Trước khi code một phần lớn, hãy trình bày kế hoạch và chờ tôi đồng ý.** Mọi lựa chọn có đánh đổi đáng kể thì nêu 2–3 phương án kèm đề xuất của bạn.
- Cuối mỗi nhiệm vụ, báo cáo theo đúng mẫu ở mục 14.

## 3. Công nghệ (đã chốt — không đổi nếu chưa hỏi tôi)

| Phần | Lựa chọn |
|---|---|
| Ngôn ngữ | TypeScript, `strict: true` |
| Build | Vite |
| Game engine | Phaser 3 (bản 3.x ổn định mới nhất), ghim version chính xác trong `package.json` |
| Giao diện chữ nhiều / form | DOM overlay (HTML + CSS) phủ trên canvas: bảng tổng kết ngày, kho, bình luận, nhập mã phòng, bảng xếp hạng, cài đặt |
| Test | Vitest, cho toàn bộ logic trong `src/core` |
| Multiplayer + lưu cloud | Firebase JS SDK dạng modular: **Authentication** (Anonymous; sau thêm liên kết Google) + **Realtime Database**. Chỉ dùng gói miễn phí Spark |
| Lưu trên máy | IndexedDB (chính) + localStorage (dự phòng) |
| Âm thanh | Web Audio API, tự tổng hợp âm, **không dùng file âm thanh** |
| Hosting | GitHub Pages, deploy tự động bằng GitHub Actions khi push lên nhánh `main` |

**Không có server riêng.** Mọi thứ chạy trong trình duyệt và Firebase.
Không thêm thư viện mới ngoài danh sách trên nếu chưa hỏi tôi.

## 4. Cấu trúc thư mục

```
/
├── CLAUDE.md
├── README.md                 ← hướng dẫn chạy, deploy, cấu hình Firebase (viết cho người mới)
├── .gitignore                ← phải có: node_modules, dist, .env*, _tham-khao/
├── _tham-khao/               ← ẢNH THAM KHẢO. KHÔNG BAO GIỜ commit (xem mục 15)
├── index.html
├── vite.config.ts            ← base: './' để chạy được trên GitHub Pages
├── public/                   ← manifest.webmanifest, icon PWA
├── firebase/database.rules.json
├── .github/workflows/deploy.yml
├── src/
│   ├── main.ts               ← khởi tạo Phaser + overlay
│   ├── config/               ← DỮ LIỆU GAME: trà, topping, foam, size, giá, kho, độ khó theo ngày, khách, nâng cấp, outfit, bình luận, sự kiện, palette, chuỗi tiếng Việt
│   ├── core/                 ← LOGIC THUẦN (không import Phaser, không import Firebase)
│   │   ├── types.ts          ← mọi kiểu dữ liệu: Order, CupSpec, CupState, Customer, Stock, ShopState, DaySummary, Profile, Action...
│   │   ├── reducer.ts        ← (state, action) → state mới. Mọi thay đổi trạng thái đi qua đây
│   │   ├── orders.ts         ← sinh order và khách theo ngày, độ khó
│   │   ├── brewing.ts        ← pha ly: rót, đường, đá, topping, ép nắp
│   │   ├── inventory.ts      ← kho: tiêu hao, hết hàng, nhập hàng, mở khóa
│   │   ├── scoring.ts        ← chấm điểm ly + chấm điểm từng người theo trạm
│   │   ├── economy.ts        ← giá ly, doanh thu, chi phí, két, tip cá nhân
│   │   ├── day.ts            ← đồng hồ ngày, mở/đóng cửa, tổng kết ngày, đánh giá sao
│   │   ├── progression.ts    ← mở khóa, khách quen, nhiệm vụ
│   │   └── rng.ts            ← random có seed
│   ├── art/                  ← HÌNH VẼ BẰNG CODE: các hàm trả về chuỗi SVG, chia theo bộ phận
│   ├── scenes/               ← BootScene (tạo texture, tải font), ShopScene (cảnh tiệm duy nhất)
│   ├── entities/             ← Customer, Cup, TeaDispenser, ToppingJar, SyrupPump, IceBin, SealMachine, TrashBin, Worker
│   ├── layout/               ← tọa độ mọi vật thể cho khung DỌC (cuộn) và khung NGANG
│   ├── net/                  ← NetAdapter: LocalAdapter (chơi đơn) và FirebaseAdapter (nhiều người)
│   ├── save/                 ← SaveRepository: lưu trên máy + lưu cloud, schema có version, migrate
│   ├── audio/                ← Sfx: tổng hợp âm bằng Web Audio
│   └── ui/                   ← DOM overlay: HUD, kho, tổng kết ngày, bình luận, cửa hàng, phòng, xếp hạng, cài đặt
└── tests/                    ← test Vitest cho src/core
```

## 5. Nguyên tắc kiến trúc (quan trọng nhất)

1. **Logic tách khỏi hình.** `src/core` là TypeScript thuần, có test, không biết gì về Phaser hay Firebase. Scene chỉ đọc state để vẽ, và gửi `Action` khi người chơi thao tác.
2. **Mọi thay đổi đi qua `Action` + `reducer`.** Ví dụ: `POUR_TEA`, `TAP_SYRUP`, `SCOOP_ICE`, `ADD_TOPPING`, `SEAL_CUP`, `SERVE_CUP`, `DISCARD_CUP`, `RESTOCK`, `UNLOCK_ITEM`, `END_DAY`. Nhờ vậy chơi đơn và nhiều người dùng chung một bộ logic. Khác biệt duy nhất là action được áp dụng tại chỗ (`LocalAdapter`) hay gửi qua Firebase (`FirebaseAdapter`).
3. **Chủ phòng là trọng tài (host-authoritative).** Máy chủ phòng sinh khách, chấm điểm, cộng tiền, trừ kho và ghi kết quả. Máy khác chỉ gửi thao tác ở trạm của mình. Riêng thao tác cần mượt (giữ để rót), người đang ở trạm cập nhật ly của mình ngay trên máy, rồi đồng bộ khoảng 10 lần/giây.
4. **Random có seed.** Order và khách sinh từ `rng.ts` với seed của ngày để mọi máy giống nhau.
5. **Không hard-code số liệu cân bằng trong logic.** Giá, thời gian, mức tiêu hao, điểm thưởng đều nằm trong `src/config`.
6. **Chữ hiển thị là tiếng Việt có dấu đầy đủ.** Gom chuỗi vào `src/config/strings.ts`. Câu gọi món của khách sinh từ mẫu câu có biến (ví dụ: "Chị ơi, cho em {n} ly {trà} size {size}, {topping}, {đường}% đường và {đá} ạ!"), có vài mẫu khác nhau cho tự nhiên.
7. **Tiền hiển thị theo kiểu nghìn đồng:** `25k`, `2.413,5k` (hàm `formatMoney` trong `src/core/economy.ts`, có test). Một ly trà sữa khoảng 25–45k.

## 6. Màn hình & bố cục

- **Ưu tiên số 1: iPhone cầm DỌC.** Khung nhìn thiết kế 1080×1920. Thế giới (cảnh tiệm) cao khoảng 1,5–2 lần khung nhìn, **cuộn dọc**.
- **Bố cục dọc (gợi ý, được điều chỉnh):**
  - **Thanh HUD cố định phía trên (DOM):** nút tạm dừng, "Ngày N", đồng hồ trong game, tên tiệm, tiền két, sao và số lượt đánh giá.
  - **Vùng 1 (đầu cảnh):** mái hiên sọc, dải đầu khách đang xếp hàng, khách đang phục vụ + bong bóng order (hình ly minh họa, các chi tiết order, tab Ly 1/Ly 2) + thanh kiên nhẫn. Dưới đó là **Quầy trà**: hàng bình trà có số tồn, chồng cốc M và L, máy ép nắp.
  - **Vùng 2 (giữa):** **Pha ly**: ly đặt trên bảng gỗ, thanh hiển thị % đường và mức đá dưới ly, thùng rác, hai vật phẩm Đá viên và Nước đường.
  - **Vùng 3 (cuối cảnh):** **Kệ topping** lưới 4×3 (có số tồn, ổ khóa, chữ "Hết"), hàng foam, hàng chai siro, quầy gỗ.
- **Cuộn:**
  - Vuốt dọc trên vùng nền để cuộn, có quán tính nhẹ.
  - Thao tác trên vật thể (giữ để rót, kéo ly, chạm hũ) luôn được ưu tiên: bắt đầu chạm trên vật thể thì **không cuộn**.
  - Có thanh nút nhảy nhanh phía dưới: **Quầy trà · Pha ly · Topping · Kho**. Khi nhiều người chơi, vào trạm nào thì cảnh tự cuộn tới trạm đó.
  - Cuộn phải mượt 60fps trên iPhone.
- **Bố cục ngang (iPad, máy tính):** sắp lại cùng các vật thể thành hai hoặc ba cột, **không cần cuộn**: khách và quầy trà bên trái, pha ly ở giữa, kệ topping bên phải. Khung thiết kế 1920×1080. Đổi bố cục khi xoay máy, không méo hình.
- Phaser `Scale.FIT` + `autoCenter`. Né tai thỏ và thanh home bằng `env(safe-area-inset-*)`.
- Vùng chạm tối thiểu tương đương 44×44pt trên điện thoại thật.
- Chặn cuộn trang, zoom, chọn chữ ngoài ý muốn (`touch-action: none` trên canvas, tự xử lý cuộn).

## 7. Phong cách hình ảnh (AI tự vẽ bằng code)

Tham khảo ảnh trong `_tham-khao/` để cảm nhận. **Học phong cách, không sao chép** (xem mục 15).

- **Tranh vẽ phẳng, ấm, tinh tế:** nét viền **nâu mảnh** (khoảng 3px ở khung 1080), đổ bóng mềm nhẹ, highlight trắng nhỏ trên vật thủy tinh và nhựa. Không viền đen, không viền quá dày.
- **Bảng màu** (hằng số trong `src/config/palette.ts`):
  - giấy kem `#F8EBDD`, be đậm `#E9D3B8`
  - gỗ sáng `#D9AE7E`, gỗ đậm `#9A6B45`
  - hồng dâu `#F28CA8` (mái hiên, nút chính), hồng nhạt `#FBD1DC`
  - matcha `#A7D08C`, mint `#BFE6D3`
  - vàng `#F5C65B` (sao, tiền), cảnh báo đỏ nhạt `#E0675C`
  - nâu viền `#6B4A3A`, chữ nâu `#5B3A2E` (không dùng đen thuần)
  - xanh dương nhạt cho thẻ hướng dẫn `#6FA8DC`
- **Font:** "Baloo 2" cho tiêu đề và số, "Nunito" cho chữ thường (Google Fonts, hỗ trợ tiếng Việt). Chờ font tải xong (`document.fonts.load`) rồi mới tạo text trong Phaser.
- **Cảnh tiệm:** mái hiên sọc hồng-trắng, tường kem có ốp gỗ, kệ và bàn bằng gỗ, quầy trà gồm các bình thủy tinh có vòi, hũ topping trong khay kim loại, hàng chai siro.
- **Nhân vật (khách và người chơi):** tranh anime đời thường, tỉ lệ cơ thể bình thường hoặc hơi đầu to, trang phục đa dạng (kính, hoodie, đồng phục, mũ). Mỗi khách có tên và ít nhất 3 biểu cảm: bình thường, vui, không vui. Mọi nhân vật là **thiết kế riêng** của dự án.
- **Cách vẽ:** mỗi hình là một hàm trong `src/art/` trả về chuỗi SVG. `BootScene` chuyển SVG thành texture ở đúng độ phân giải của khung. Hình phải sắc nét trên màn Retina.
- **Tách bộ phận để làm hình động:** nhân vật gồm thân, đầu, tóc trước, tóc sau, mắt, miệng, má hồng, phụ kiện; ghép bằng `Phaser.GameObjects.Container`.
- **Hình động bắt buộc có:**
  - Khách đi vào và ra, nhún nhẹ khi chờ, chớp mắt. Mặt đổi theo kiên nhẫn còn lại và điểm.
  - Thanh kiên nhẫn chạy từ xanh sang vàng sang đỏ.
  - Dòng trà chảy từ vòi bình xuống ly; mực trà dâng có gợn sóng, vạch xanh nhấp nháy khi tới đích.
  - Đá, topping rơi vào ly và nảy nhẹ. Nước đường nhỏ giọt.
  - Ly trượt vào máy ép nắp, nắp "bập" xuống.
  - Số tiền bay lên HUD, sao bật ra khi chấm điểm.
  - Hũ hết hàng chuyển xám có chữ "Hết". Ổ khóa lắc khi chạm vào hũ bị khóa.
  - Mây trôi ngoài cửa sổ, đèn lấp lánh, hơi nóng bốc lên.
  - Nhân viên (người chơi) có idle animation, tên hiện trên đầu, màu outfit riêng.
- Có tùy chọn **"Giảm chuyển động"** trong cài đặt, và tôn trọng `prefers-reduced-motion`.
- **Hướng dẫn lần đầu bằng thẻ xanh dương nhỏ** trên đầu vật cần thao tác (ví dụ "Bước 2: nhấn giữ hũ Matcha, thả tay khi tới vạch xanh"), vật đó nhấp nháy viền hồng. Có thể bỏ qua và bật lại trong cài đặt.

## 8. Âm thanh

- Tổng hợp bằng Web Audio:
  - tiếng rót: tiếng ồn qua bộ lọc band-pass, **cao độ tăng theo mực nước**
  - "lạch cạch" xúc đá, "plop" topping, "tách" ép nắp, chuông khách vào, tiền, hợp âm khi khách rất vui, tiếng "ting" nhắc khi hết hàng
- Chỉ phát sau lần chạm đầu tiên (luật của trình duyệt). Có nút tắt tiếng; trạng thái tắt tiếng được lưu.
- Nhạc nền nhẹ, vòng lặp ngắn tổng hợp bằng code, âm lượng thấp, tắt riêng được.

## 9. Luật chơi chi tiết

### 9.1 Order và khách
- Khách đến theo lịch của ngày (config), xếp hàng, tối đa 3 người hiện trong hàng chờ.
- Một order gồm 1–2 ly (về sau tối đa 3). Mỗi ly (`CupSpec`): `size` M|L, `tea` (id), `sugar` 0|30|50|70|100, `ice` none|less|normal, `toppings` tối đa 2 loại với 1–2 muỗng mỗi loại, `foam` (tùy chọn, mở về sau).
- Bong bóng hiện câu gọi món, hình ly minh họa, và các tab Ly 1 / Ly 2. Giao đủ ly thì order hoàn thành.
- **Kiên nhẫn:** thanh giảm theo thời gian (tốc độ trong config, giảm nhanh hơn ở ngày sau). Hết kiên nhẫn thì khách bỏ đi, không có doanh thu, bị tính là khách không vui.
- Khách được chọn trong số **món đã mở khóa** và **nguyên liệu tiệm có thể có**, nhưng **không** tránh món đang hết hàng (để tạo áp lực nhập hàng).

### 9.2 Pha ly (thứ tự thao tác tự do, nhưng hướng dẫn lần đầu theo trình tự này)
1. **Chọn cốc:** chạm chồng cốc M hoặc L, ly đặt lên bảng gỗ ở khu Pha ly. Trừ 1 cốc trong kho.
2. **Rót trà:** **giữ** bình trà, thả tay khi mực trà tới **vạch xanh** (vùng xanh nằm trong khoảng cho phép của size). Càng sát giữa vùng xanh càng đạt điểm. Tràn thì ly bị hỏng. Mỗi ly trừ 1 đơn vị trà.
3. **Đường:** mỗi lần chạm vòi Nước đường tăng một mức: 1 lần=30%, 2=50%, 3=70%, 4=100% (bảng trong config). Chạm quá thì rung và không tăng. Mỗi lần chạm trừ 1 đơn vị đường.
4. **Đá:** mỗi lần chạm xúc đá +1 muỗng: 0=không đá, 1=ít đá, 2=bình thường. Trừ đá trong kho.
5. **Topping:** chạm hũ = +1 muỗng (tối đa 2 muỗng mỗi loại, 2 loại mỗi ly). Chạm hũ hết hàng hoặc bị khóa thì báo.
6. **Ép nắp:** kéo ly vào máy ép nắp.
7. **Giao:** kéo ly tới khách (hoặc chạm nút Giao). **Thùng rác:** kéo ly vào để bỏ, mất nguyên liệu đã dùng.
- Dưới ly luôn hiện thanh trạng thái, ví dụ "Đường 50% · đá bình thường".

### 9.3 Kho hàng
- Mọi nguyên liệu có **số tồn**: cốc M, cốc L, các loại trà, các loại topping (lưới 4×3, một số ô bị khóa lúc đầu), foam, đá, nước đường, siro.
- Hết hàng thì ô xám và hiện **"Hết"**, không dùng được.
- **Nhập hàng:** màn Kho liệt kê từng nguyên liệu: số tồn, giá nhập, gói nhập (ví dụ +20 đơn vị). Mua bằng **tiền két**. Không đủ tiền thì không mua được.
- **Mở khóa món mới** (trà, topping, foam) bằng tiền két, có thể kèm ngày tối thiểu.
- Số liệu mặc định (cốc, trà, topping, giá nhập...) nằm trong `src/config/inventory.ts` để tôi chỉnh.

### 9.4 Tiền
- **Giá ly** = giá trà + phụ thu size L + giá từng topping (ví dụ trà 25k, L +8k, topping +6 đến 13k).
- **Doanh thu** cộng vào **Két** khi giao ly.
- **Chi phí:** nhập hàng, nguyên liệu hao phí (ly đổ, ly hỏng), tiền thuê tiệm mỗi ngày (config).
- **Tip** từ khách hài lòng tính vào **tiền tip cá nhân** của người làm ly (mục 12), không vào két.
- Két dùng để nhập hàng, mở khóa món, nâng cấp và trang trí tiệm.

### 9.5 Ngày và tổng kết
- Đồng hồ trong game chạy từ giờ mở cửa tới giờ đóng cửa (config, ví dụ 08:00–20:00), một ngày dài khoảng 6 phút thật (config). Hết giờ thì ngừng nhận khách mới, phục vụ nốt khách còn lại rồi đóng cửa.
- **Bảng "Hết ngày N":** số khách phục vụ, số khách không vui, điểm sao trung bình; Doanh thu; Chi phí (chi tiết: nhập hàng, hao phí, tiền thuê); **Lãi**; **Két**; nút xem tổng kết; nút **"Ngày N+1"**.
- **Sao và đánh giá:** sao trung bình tích lũy và số lượt đánh giá (ví dụ "4,6 · 99 đánh giá") hiện trên HUD. Sao cao thì có thêm khách mỗi ngày.
- Mỗi lần tổng kết ngày là một thời điểm **tự lưu**.

### 9.6 Độ khó và nội dung theo ngày
Bảng trong `src/config/progression.ts`: số khách mỗi ngày, khoảng cách giữa các khách, tốc độ giảm kiên nhẫn, tỉ lệ order 2 ly, món và topping được mở dần.

### 9.7 Bình luận và sự kiện (làm ở giai đoạn sau)
- **Bình luận:** cuối ngày có vài khách để lại bình luận kèm số sao; có nút **"Trả lời"** (thưởng nhỏ tăng uy tín).
- **Sự kiện bất ngờ:** ví dụ có trộm vào quán lấy một phần két (nâng cấp khóa/camera để giảm), khách để quên ví (nhặt được thì được thưởng). Là cửa sổ pop-up có hình ngộ nghĩnh, không quá nặng nề.

## 10. Dữ liệu & lưu trữ

Hai loại dữ liệu, tách bạch:

- **Shop (tiệm chung):** `shopId`, tên tiệm, chủ tiệm (uid), `day`, `cash` (két), `stock` (số tồn từng nguyên liệu), `unlocked` (trà, topping, foam đã mở), `upgrades`, `decor`, `ratingSum`, `ratingCount`, khách quen, `history` (tóm tắt các ngày), bình luận gần đây. Ai làm ở tiệm thì góp vào két chung. Chỉ chủ tiệm (hoặc host đang chạy phòng) được ghi.
- **Profile (cá nhân):** `uid`, tên hiển thị, outfit đang mặc và đã mua, `tipCoins` (tiền tip cá nhân, dùng mua outfit), thống kê lâu dài theo từng trạm: số ly, điểm trung bình, số lần "Nhân viên xuất sắc". Profile đi theo người chơi sang tiệm của người khác.

Quy tắc lưu:
- Mỗi bản lưu có `schemaVersion` và `updatedAt`. Có hàm `migrate()` cho từng version, có test.
- Tự lưu khi giao ly, nhập hàng, cuối ngày, mua đồ, đổi outfit, và khi tab bị ẩn hoặc đóng (`visibilitychange`, `pagehide`).
- Chơi đơn offline vẫn lưu trên máy. Có mạng thì đồng bộ lên Firebase; xung đột thì profile lấy bản `updatedAt` mới hơn, shop luôn tin bản trên cloud.
- Ly đang làm dở và khách đang chờ không cần lưu; mở lại game thì bắt đầu từ lúc **mở cửa của ngày đang chơi** (số kho và két giữ nguyên như lúc đã lưu gần nhất).

Sơ đồ Realtime Database (tham khảo, được phép tinh chỉnh nếu giải thích lý do):

```
/profiles/{uid}
/shops/{shopId}
/rooms/{roomCode}/meta          { hostUid, shopId, createdAt, status }
/rooms/{roomCode}/players/{uid} { name, outfit, station, online, lastSeen }
/rooms/{roomCode}/state         ← host ghi: khách, order, kho, két, giờ trong ngày
/rooms/{roomCode}/cups/{cupId}  ← người giữ trạm hiện tại của ly được ghi
/rooms/{roomCode}/actions/{pushId} ← client gửi thao tác, host xử lý rồi xóa
/rooms/{roomCode}/dayStats/{uid}   ← host ghi điểm từng người trong ngày
```

`firebase/database.rules.json` phải đảm bảo:
- chỉ thành viên phòng được đọc/ghi phòng; tối đa 4 người
- chỉ host ghi `state`, `dayStats`, kho và tiền
- mỗi người chỉ ghi profile của chính mình
- validate kiểu dữ liệu và giới hạn số
- phòng bỏ trống quá 24 giờ thì được dọn (client chủ phòng dọn khi mở lại; không cần Cloud Functions vì gói miễn phí không có)

## 11. Multiplayer

- **Tạo phòng:** chủ tiệm bấm "Mở tiệm cho bạn bè" → nhận **mã 6 ký tự** (bỏ các ký tự dễ nhầm như O/0, I/1), kèm link mời dạng `...#join-ABC234`.
- **Vào phòng:** nhập mã hoặc mở link → chọn trạm còn trống.
- **4 trạm:**

| Trạm | Việc | Vùng trên cảnh |
|---|---|---|
| **Thu ngân** | Nhận order từ khách, ép nắp, giao ly | Vùng 1, phía khách và máy ép |
| **Quầy trà** | Lấy cốc, rót trà | Vùng 1, hàng bình trà |
| **Kệ topping** | Đường, đá, topping, foam | Vùng 2 và 3 |
| **Kho & quản lý** | Nhập hàng, mở khóa món, (sau) trả lời bình luận, xử lý sự kiện | Màn Kho |

- **Ít người thì gộp trạm:**
  - 1 người: làm cả 4
  - 2 người: Thu ngân + Kho / Quầy trà + Kệ topping
  - 3 người: Thu ngân + Kho / Quầy trà / Kệ topping
- Ai cũng thấy toàn bộ tiệm và thấy bạn mình thao tác theo thời gian thực. Trạm của mình được làm sáng, cảnh tự cuộn tới trạm của mình; trạm khác hiện tên và động tác của bạn.
- **Dòng chảy của một ly:** Thu ngân nhận order → phiếu hiện ở Quầy trà → Quầy trà tạo ly, rót trà → **Chuyền** sang Kệ topping → Kệ topping thêm đường, đá, topping → **Chuyền** về Thu ngân để ép nắp và giao.
- Cùng lúc có nhiều ly ở nhiều trạm; mỗi ly có màu viền theo order để dễ theo dõi.
- Người ở trạm Kho thấy cảnh báo "sắp hết" và "đã hết" ngay.
- **Mất mạng:** dùng presence `onDisconnect` để báo offline. Tự kết nối lại; trạm của người rời được nhả cho người khác. Nếu host rời, người còn lại sớm nhất làm host mới (host migration).
- Độ trễ chấp nhận được: dưới khoảng 300ms vẫn chơi mượt. Thao tác của chính mình phản hồi ngay, không chờ mạng.

## 12. Chấm điểm & xếp hạng

- **Điểm ly (0–100):** size đúng 10 + trà đúng và độ chính xác khi rót 25 + đường 15 + đá 10 + topping (đúng loại và số muỗng) 20 + kiên nhẫn còn lại khi giao 20. Sai size hoặc sai loại trà thì tổng bị giới hạn tối đa 40. Con số đặt trong config. Sao = điểm / 20, làm tròn.
- **Khách không vui:** dưới 50 điểm hoặc bỏ đi.
- **Điểm cá nhân theo trạm (0–100 mỗi ly mà người đó có tham gia):**
  - Thu ngân: thời gian nhận order sau khi khách tới, giao đúng ly cho đúng khách, nhanh
  - Quầy trà: đúng size và loại trà, độ chính xác vạch rót
  - Kệ topping: đúng đường, đá, topping
  - Kho & quản lý: tỉ lệ thời gian không có nguyên liệu nào hết, không nhập thừa quá nhiều, (sau) trả lời bình luận
- **Cuối ngày:** bảng xếp hạng gồm điểm trung bình, số ly, chuỗi hoàn hảo dài nhất, và danh hiệu **"Nhân viên xuất sắc"** cho người cao điểm nhất (phải làm tối thiểu 3 ly để công bằng).
- **Lâu dài:** bảng thành tích của tiệm (ai đạt Xuất sắc nhiều nhất, ai giỏi nhất từng trạm), và thống kê trong profile.
- **Tiền tip:** tip của mỗi ly chia cho những người đã làm ly đó, theo tỉ lệ điểm trạm của từng người, vào `tipCoins` riêng.

## 13. Quy ước làm việc

- Commit nhỏ, message tiếng Việt rõ ràng, mỗi commit chạy được.
- Trước khi báo "xong": `npm run build` và `npm test` phải pass. Không còn lỗi TypeScript, không còn lỗi đỏ trong console.
- Viết test cho mọi hàm trong `src/core` (chấm điểm, kho, kinh tế, sinh order, reducer, migrate, formatMoney).
- Comment tiếng Việt ở những chỗ logic khó, để tôi đọc hiểu.
- Không để lộ khóa bí mật. Cấu hình web của Firebase để trong `src/net/firebaseConfig.ts` là bình thường; độ an toàn do security rules quyết định.
- Giữ dung lượng game nhỏ (mục tiêu dưới 3MB sau build), để mở nhanh trên 4G.
- Không chỉnh sửa file này nếu tôi không yêu cầu. Nếu thấy cần sửa, đề xuất cho tôi trước.

## 14. Mẫu báo cáo cuối mỗi nhiệm vụ

1. **Đã làm:** tóm tắt 3–6 gạch đầu dòng
2. **Cách thử:** các bước đánh số để tôi tự kiểm tra trên máy tính và trên iPhone
3. **Tôi cần làm gì:** (nếu có) tạo tài khoản, bấm nút, dán khóa... từng bước
4. **Chưa làm / hạn chế:** nói thẳng
5. **Gợi ý bước tiếp theo**

## 15. Ảnh tham khảo và bản quyền (rất quan trọng)

- Thư mục `_tham-khao/` chứa ảnh cắt từ video của một game khác, **chỉ để học cách chơi và phong cách**.
- **Repo GitHub của tôi là công khai.** `_tham-khao/` phải nằm trong `.gitignore` và **không bao giờ** được `git add`, commit hay push. Trước mỗi lần push hãy kiểm tra `git status` không có thư mục này.
- **Không sao chép:** nhân vật, khuôn mặt, hình ly, hình bình, logo, tên tiệm, câu chữ, đường nét hay bố cục từng điểm ảnh của game đó. Mọi hình, nhân vật, tên và câu chữ trong game của tôi phải là thiết kế riêng, tên tiệm là "Jamie's Milk Tea".
- Cơ chế chơi (rót tới vạch, chạm vòi đường, kho hàng, tổng kết ngày...) là ý tưởng chung, được dùng.
