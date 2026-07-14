const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// 讀取從 GitHub Secrets 傳進來的金鑰
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const databaseURL = process.env.FIREBASE_DATABASE_URL;

// 初始化 Firebase 後台權限
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURL
});

const db = admin.database();

async function archiveData() {
  // 取得「上個月」的年月字串
  const today = new Date();
  today.setMonth(today.getMonth() - 1);
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const lastMonthStr = `${year}-${month}`;

  console.log(`開始備份 ${lastMonthStr} 的資料...`);

  // 抓取 Firebase 裡 calendarData 的所有資料
  const snapshot = await db.ref('calendarData').once('value');
  const data = snapshot.val();

  // 建立 archives 資料夾
  const dir = path.join(__dirname, 'archives');
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
  }

  // 存成 JSON 檔案
  const fileName = path.join(dir, `${lastMonthStr}_backup.json`);
  fs.writeFileSync(fileName, JSON.stringify(data, null, 2), 'utf8');
  console.log(`備份成功！已產生檔案：${fileName}`);

  process.exit(0);
}

archiveData().catch(console.error);
