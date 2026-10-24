# HEIC 離線轉檔器

將 HEIC / HEIF 圖片批次轉成 JPG 或 PNG 的桌面工具。轉換引擎已封裝在程式內，執行與轉檔過程都不需要網路。

## 直接使用（Windows 10 / 11，64 位元）

1. 下載 `HEIC-Offline-Converter-1.0.0-x64.exe`。
2. 直接雙擊開啟，不需要安裝 Node.js、瀏覽器套件或其他執行環境。
3. 拖入 HEIC / HEIF 圖片、選擇 JPG 或 PNG，再按「開始轉換」。
4. 第一次轉換時選擇輸出資料夾；轉換完成後可直接開啟該資料夾。

這個版本沒有程式碼簽章，因此 Windows SmartScreen 可能顯示「Windows 已保護您的電腦」。確認檔案來源後，可按「其他資訊」→「仍要執行」。

## 功能

- 完全離線轉換，不把照片上傳到任何伺服器
- 批次拖放與多檔佇列
- JPG 畫質調整（70–100%）
- PNG 輸出
- 支援包含多張影像的 HEIC，會以 `_01`、`_02` 依序輸出
- 自動避免覆寫同名檔案
- 原始檔永遠不會被修改
- 深色介面

## 開發與重新打包

需求：Node.js 22 以上。

```bash
npm install
npm start
```

建立 Windows portable 版本：

```bash
npm run pack:win
```

產物會在 `release/`。若要在 Linux 主機建立 Windows 版本，請參考 electron-builder 的跨平台建置需求。

## 隱私與格式說明

程式不包含任何連網請求。HEIC 解碼與 JPG / PNG 編碼均在本機完成。轉檔會保留圖片像素尺寸，但 HEIC 內的 EXIF 等中繼資料不會複製到輸出檔。


###### 不信任網路上的東西就叫AI寫一個，沒想到真的能用。
