require('dotenv').config();
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.CWA_API_KEY;

// 靜態檔案服務（提供 taiwan-weather.html）
app.use(express.static(__dirname));

// 天氣資料代理端點
app.get('/api/weather', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: 'CWA_API_KEY 尚未設定，請在 .env 檔案中設定' });
  }

  const elements = encodeURIComponent('最高溫度,最低溫度,平均溫度');
  const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091?Authorization=${API_KEY}&elementName=${elements}&format=JSON`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      throw new Error(`CWA API 回應錯誤：HTTP ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`台灣天氣伺服器已啟動：http://localhost:${PORT}`);
  if (!API_KEY) {
    console.warn('警告：CWA_API_KEY 未設定，請在 .env 檔案中設定後重新啟動');
  }
});
