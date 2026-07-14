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
  // 1. 取得「上個月」的年月字串 (例如：2026-06)
  const today = new Date();
  today.setMonth(today.getMonth() - 1);
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const lastMonthStr = `${year}-${month}`;

  console.log(`開始篩選並備份 ${lastMonthStr} 的資料...`);

  // 2. 抓取 Firebase 裡 calendarData 的所有資料
  const snapshot = await db.ref('calendarData').once('value');
  const data = snapshot.val();

  if (!data) {
      console.log("資料庫目前沒有資料！");
      process.exit(0);
  }

  // 3. 篩選 Checkboxes (打勾紀錄)
  // 因為我們的 Checkbox ID 長得像 "task-3d-1-2026-06-05"，所以只要檢查字串有沒有包含 "2026-06" 即可
  const filteredCheckboxes = {};
  if (data.checkboxes) {
      for (const [key, value] of Object.entries(data.checkboxes)) {
          if (key.includes(lastMonthStr)) {
              filteredCheckboxes[key] = value;
          }
      }
  }

  // 4. 篩選排班區間 (Shifts)
  // 只要排班的「開始日期」或「結束日期」有涵蓋到上個月，就把它保留下來
  let filteredShifts = [];
  if (data.settings && data.settings.shifts) {
      const firstDayOfMonth = `${lastMonthStr}-01`;
      const lastDayOfMonth = `${lastMonthStr}-31`; // 用 31 去做字串比對，足以涵蓋該月所有日子
      
      filteredShifts = data.settings.shifts.filter(shift => {
          // 檢查區間是否與上個月有重疊
          return shift.start <= lastDayOfMonth && shift.end >= firstDayOfMonth;
      });
  }

  // 5. 組合出乾淨、只有上個月的備份資料
  const backupData = {
      month: lastMonthStr,
      recycle3D_1: data.settings ? data.settings.recycle3D_1 : null,
      recycle3D_2: data.settings ? data.settings.recycle3D_2 : null,
      recycleFlat: data.settings ? data.settings.recycleFlat : null,
      shifts: filteredShifts,
      checkboxes: filteredCheckboxes
  };

  // 6. 建立 archives 資料夾並寫入檔案
  const dir = path.join(__dirname, 'archives');
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
  }

  const fileName = path.join(dir, `${lastMonthStr}_backup.json`);
  fs.writeFileSync(fileName, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`備份成功！已精準產生 ${lastMonthStr} 的檔案：${fileName}`);

  process.exit(0);
}

archiveData().catch(console.error);
