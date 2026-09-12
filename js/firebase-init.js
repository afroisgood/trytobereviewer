// 共用的 Firebase 初始化。所有頁面在載入 firebase-config.js 之後載入這支檔案。
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
// 只有 admin.html 有載入 firebase-auth-compat.js，其他頁面不需要登入功能
let auth;
if (typeof firebase.auth === "function") {
  auth = firebase.auth();
}

// 評分項目定義：對應官方徵選簡章配分（提案緣起與內容35／公共影響力35／團隊分工與工作安排15／經費編列合理性15）
const CRITERIA = [
  { key: "c1", label: "提案緣起與內容", max: 35 },
  { key: "c2", label: "公共影響力", max: 35 },
  { key: "c3", label: "團隊分工與工作安排", max: 15 },
  { key: "c4", label: "經費編列合理性", max: 15 },
];

const STAGE_LABELS = {
  waiting: "尚未開始",
  text: "文字顯示",
  review: "計畫審查",
};

function calcTotal(scoreDoc) {
  return CRITERIA.reduce((sum, c) => sum + (Number(scoreDoc[c.key]) || 0), 0);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[char]);
}

function safeExternalUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
