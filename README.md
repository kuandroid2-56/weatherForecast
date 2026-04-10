# weatherForecast
針對台灣各縣市三天內預測氣溫，最高溫度及當日平均溫度
 建立的檔案

       檔案      │                            說明   
  │ server.js    │ Express 後端，讀取 .env 中的 API Key，提供 GET /api/weather │

  │ index.html   │ 新版前端，頁面載入時自動呼叫後端，無需輸入 API Key          │
  
  │ package.json │ Node.js 專案設定（依賴 express、dotenv）                  │
 
  │ .env         │ 存放你的 API Key（已在 .gitignore，不會上傳）              │

  │ .env.example │ 範例設定檔（可提交到 git 讓他人參考）                       │


  使用方式

  1. 設定 API Key
  編輯 .env，將 CWA_API_KEY 換成你的真實 Key：
  CWA_API_KEY=CWA-你的真實Key

  2. 啟動伺服器
  npm start

  3. 開啟瀏覽器
  前往 http://localhost:3000，頁面會自動載入真實氣象資料。

  架構差異

  - 舊版 (taiwan-weather.html)：前端直接帶 API Key 呼叫 CWA，Key 暴露在瀏覽器
  - 新版 (index.html + server.js)：前端只呼叫 /api/weather，API Key 僅存在後端 .env，使用者完全看不到

---

## API Key 安全設計原則

> 伺服器一旦被完全入侵，上面的任何明文都可能外洩。真正的目標不是「讓 Key 無法被偷」，而是「縮小被偷後的損害範圍與時間窗口」。

### 原則一：Secret 不落地（不存在伺服器檔案系統）

`.env` 本質上仍是磁碟上的明文檔案。更安全的做法是透過**外部 Secret 管理服務**在執行期動態注入：

```
伺服器啟動
   └─ 向 Secret Store 請求 API Key（需提供身分驗證）
      └─ 取得 Key → 放入記憶體變數 → 使用完即捨棄
```

常見服務：

| 服務 | 適用場景 |
|---|---|
| **HashiCorp Vault** | 自架、最彈性 |
| **AWS Secrets Manager** | 部署在 AWS |
| **GCP Secret Manager** | 部署在 GCP |
| **Azure Key Vault** | 部署在 Azure |
| **Doppler / Infisical** | 輕量 SaaS，適合小專案 |

即使伺服器被駭，攻擊者拿到的是存取 Secret Store 的**短期憑證**，而非 Key 本身，且 Secret Store 有完整稽核日誌可發現異常。

### 原則二：最小權限（Least Privilege）

API Key 應只具備完成任務所需的最低權限：
- CWA Key 只能呼叫天氣查詢，不能管理帳號
- 若 Key 被偷，攻擊者能做的事極為有限（最多消耗你的 API 配額）

### 原則三：短效憑證 + 定期輪替（Rotation）

長期有效的 Key 一旦外洩，損害持續到你發現為止。對策：

- **定期輪替**：每 30/60/90 天自動換一組新 Key
- **雙 Key 交替**（Blue/Green Rotation）：換 Key 時不中斷服務
  ```
  目前使用 Key-A
  → 建立 Key-B，部署新 Key-B
  → 確認 Key-B 正常後，廢止 Key-A
  ```
- 若 CWA 支援，設定 Key 的**到期日**

### 原則四：監控異常使用行為

密鑰被偷了不代表立刻知道，需要主動偵測：

- 監控 API 呼叫量突增
- 設定異常告警（異常 IP、異常時間、異常頻率）
- 保存後端呼叫 Log，可做事後鑑識

### 原則五：縱深防禦（Defense in Depth）

單一防線失守時，其他層仍能阻擋：

```
外部請求
  → WAF / API Gateway（速率限制、IP 白名單）
    → 應用伺服器（只在記憶體持有 Key）
      → Secret Store（稽核日誌、存取控制）
        → API Key（短效、最小權限）
```

### 針對此專案的務實建議

| 風險等級 | CWA 天氣 API Key |
|---|---|
| 被偷的影響 | 低（攻擊者只能查天氣、消耗你的免費配額）|
| 建議做法 | 定期輪替 + 監控用量即可 |

若未來使用**付費 API、金融 API、資料庫密碼**等高風險 Secret，則應採用原則一（外部 Secret 管理服務）作為基本要求。

### 一句話總結

> `.env` 是開發用的便利工具，生產環境應將 Secret 從「存在伺服器上」改為「從受控的外部服務動態取得」，配合輪替與監控，讓被偷的 Key 在最短時間內失效或被察覺。
