# 補助審查大公開｜一起嘗試當審查委員 — 活動網站

花蓮縣文化局社造學堂互動網站。三個入口：

- `index.html` — 參與者首頁（計畫簡章／計畫書內容／評分系統）
- `screen.html` — 現場投影展示頁，依後台設定的階段自動切換內容
- `admin.html` — 後台管理（切換階段、管理計畫書與參與者名單、查看評分）

技術：純 HTML/CSS/JS（無需編譯），資料庫與登入用 [Firebase](https://firebase.google.com/)（Firestore + Authentication），可直接部署到 GitHub Pages。

---

## 步驟一：建立 Firebase 專案（免費）

1. 前往 https://console.firebase.google.com/ ，用 Google 帳號登入。
2. 點「新增專案」，輸入專案名稱（例如 `hualien-review-workshop`），一路下一步（可關閉 Google Analytics）完成建立。
3. 左側選單「建構」→「Firestore Database」→「建立資料庫」。
   - 位置選 `asia-east1`（台灣鄰近）。
   - 安全性規則先選「以測試模式啟動」，之後我們會換成正式規則（見步驟四）。
4. 左側選單「建構」→「Authentication」→「開始使用」。
   - 登入方式選「電子郵件/密碼」，啟用它。
   - 到「Users」分頁 →「新增使用者」，建立**一組管理員帳號**（例如你自己的 email + 一組密碼）。這組帳號密碼就是登入 `admin.html` 用的。

## 步驟二：把設定值貼進網站

1. Firebase 主控台左上角齒輪 →「專案設定」，捲到「你的應用程式」，點 `</>`（網頁）圖示新增一個網頁應用程式，名稱隨意（例如 `web`），**不用**勾選 Firebase Hosting。
2. 建立後會顯示一段 `firebaseConfig = {...}`，把裡面的值複製貼到本專案的 [js/firebase-config.js](js/firebase-config.js)，取代對應的「請貼上你的...」文字。
   - 這組 config 是給瀏覽器用的公開識別資訊，不是密碼，放進公開的 GitHub repo 沒有安全疑慮；真正的存取保護是靠步驟四的 Firestore 規則。

## 步驟三：填入管理員帳號到安全規則

1. 打開 [firestore.rules](firestore.rules)，把最上面 `ADMIN_EMAIL` 換成你在步驟一建立的管理員帳號 email（保留雙引號）。
2. 到 Firebase 主控台「Firestore Database」→「規則」分頁，把整份 [firestore.rules](firestore.rules) 的內容貼進去，蓋掉原本的測試模式規則，點「發布」。

> 之後如果要換管理員帳號，記得同時改這裡的 `ADMIN_EMAIL` 並重新發布規則。

## 步驟四：本機測試

用任何簡易伺服器開啟（不能直接雙擊 html，瀏覽器對 `file://` 會擋掉部分請求），例如在專案資料夾內執行：

```bash
python -m http.server 8000
```

然後瀏覽器開 `http://localhost:8000`。也可以用 VS Code 的 Live Server 套件。

測試流程建議：

1. 開 `admin.html`，用管理員帳密登入。
2. 「計畫書管理」分頁新增 8 份計畫書（名稱＋Google Drive 連結＋排序）。
3. 「參與者名單」分頁用「批次新增」貼入 20 組代碼（格式：`代碼,姓名`，一行一組）。
4. 「階段控制」分頁填入簡章連結、「文字顯示」階段要用的文字內容。
5. 開 `score.html`，輸入一組剛剛建立的代碼登入，測試評分與回饋是否能儲存、修改。
6. 開 `screen.html`，在後台切換階段，確認畫面即時跟著換（Firestore 是即時推播，通常 1 秒內就會更新，不用重新整理）。

## 步驟五：發布到 GitHub Pages

```bash
git init
git add .
git commit -m "活動網站初版"
git branch -M main
git remote add origin <你的 GitHub repo 網址>
git push -u origin main
```

推上去後，到 GitHub repo 的 Settings → Pages，Source 選 `main` 分支、`/ (root)` 資料夾，儲存後幾分鐘內會給你一個 `https://<帳號>.github.io/<repo>/` 網址。

**⚠️ 因為 GitHub Pages 免費版是公開網站**，只要有網址的人都能打開 `index.html`／`score.html`／`screen.html`（`admin.html` 有 Firebase Auth 登入保護）。評分代碼的作用是防止「不相關的人亂入評分」，但不是機密等級的保護，適合工作坊這種內部活動使用。

---

## 資料結構（Firestore）

| Collection | 文件 ID | 欄位 | 說明 |
|---|---|---|---|
| `config` | `state` | `stage`（`waiting`/`text`/`review`）, `brochureUrl`, `displayText` | 全站唯一一份，控制現場展示內容。`text` 階段會滿版顯示 `displayText`（不顯示階段標題），可重複用於計畫閱讀說明、總回饋等任何時機 |
| `plans` | 自動 ID | `name`, `url`, `order` | 8 份計畫書 |
| `participants` | 代碼（如 `A01`） | `name` | 評分代碼名單 |
| `scores/{代碼}/entries` | 計畫書 ID | `code`, `name`, `planId`, `planName`, `c1~c4`, `comment`, `updatedAt` | 每位參與者對每份計畫書的評分 |

評分配分沿用《花蓮縣文化局115年社區行動方案徵選簡章》：提案緣起與內容 35 分／公共影響力 35 分／團隊分工與工作安排 15 分／經費編列合理性 15 分（共 100 分），定義在 [js/firebase-init.js](js/firebase-init.js) 的 `CRITERIA`。

## 常見問題

- **`screen.html` 的排名一直空白／`admin.html` 評分總覽是空的**：第一次執行 `collectionGroup` 查詢時，Firestore 有時會在瀏覽器主控台（F12 → Console）丟出一個錯誤，裡面附一個連結可以「一鍵建立索引」，點進去建立即可，等 1–2 分鐘生效。
- **忘記管理員密碼**：到 Firebase 主控台 Authentication → Users，選該帳號可以重設密碼。
- **想換簡章或計畫書連結**：不用改程式碼、不用重新部署，直接在 `admin.html` 對應分頁改掉即可，即時生效。
