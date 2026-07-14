const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const databaseURL = process.env.FIREBASE_DATABASE_URL;

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

  // 因為架構升級，我們只要直接去抓上個月專屬的資料節點即可
  const snapshot = await db.ref(`calendarData/months/${lastMonthStr}`).once('value');
  const monthData = snapshot.val();

  if (!monthData) {
      console.log(`資料庫中找不到 ${lastMonthStr} 的資料！`);
      process.exit(0);
  }

  // 組合備份檔案格式
  const backupData = {
      month: lastMonthStr,
      settings: monthData.settings || {},
      checkboxes: monthData.checkboxes || {}
  };

  const dir = path.join(__dirname, 'archives');
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
  }

  const fileName = path.join(dir, `${lastMonthStr}_backup.json`);
  fs.writeFileSync(fileName, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`備份成功！已產生 ${lastMonthStr} 的檔案：${fileName}`);

  process.exit(0);
}

archiveData().catch(console.error);
