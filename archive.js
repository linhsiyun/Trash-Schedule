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
  // 取得「上個月」的年月字串作為檔名與標記
  const today = new Date();
  today.setMonth(today.getMonth() - 1);
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const lastMonthStr = `${year}-${month}`;

  console.log(`開始備份 ${lastMonthStr} 的排班設定快照...`);

  // 因為改成全域排班，我們直接抓取 settings 節點的當前狀態
  const snapshot = await db.ref(`calendarData/settings`).once('value');
  const settings = snapshot.val();

  if (!settings) {
      console.log(`目前資料庫沒有任何排班設定！`);
      process.exit(0);
  }

  // 組合備份檔案，把當時的完整排班規則封裝起來
  const backupData = {
      month: lastMonthStr,
      settings: settings
  };

  const dir = path.join(__dirname, 'archives');
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
  }

  const fileName = path.join(dir, `${lastMonthStr}_backup.json`);
  fs.writeFileSync(fileName, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`備份成功！已產生 ${lastMonthStr} 的排班快照：${fileName}`);

  process.exit(0);
}

archiveData().catch(console.error);