const $ = (id) => document.getElementById(id);
let plansCache = [];
let allEntries = [];

// ---------- 登入 / 登出 ----------
auth.onAuthStateChanged((user) => {
  if (user) {
    $("view-login").style.display = "none";
    $("view-main").style.display = "block";
    $("who").textContent = user.email;
    initMain();
  } else {
    $("view-login").style.display = "block";
    $("view-main").style.display = "none";
  }
});

$("login-btn").addEventListener("click", async () => {
  const email = $("email-input").value.trim();
  const pw = $("pw-input").value;
  $("login-msg").innerHTML = "";
  try {
    await auth.signInWithEmailAndPassword(email, pw);
  } catch (e) {
    $("login-msg").innerHTML = `<div class="msg error">登入失敗：${e.message}</div>`;
  }
});

$("logout-btn").addEventListener("click", () => auth.signOut());

// ---------- Tabs ----------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    $("tab-" + btn.dataset.tab).classList.add("active");
  });
});

let mainInited = false;
function initMain() {
  if (mainInited) return;
  mainInited = true;
  watchStage();
  watchPlans();
  watchPeople();
  watchScores();
}

// ---------- 階段控制 ----------
document.querySelectorAll(".stage-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    try {
      await db.collection("config").doc("state").set({ stage: btn.dataset.stage }, { merge: true });
      $("stage-msg").innerHTML = `<div class="msg ok">已切換至「${STAGE_LABELS[btn.dataset.stage]}」</div>`;
    } catch (e) {
      $("stage-msg").innerHTML = `<div class="msg error">切換失敗：${e.message}</div>`;
    }
  });
});

function watchStage() {
  db.collection("config").doc("state").onSnapshot((snap) => {
    const data = snap.exists ? snap.data() : {};
    $("current-stage-label").textContent = STAGE_LABELS[data.stage || "waiting"];
    if (document.activeElement !== $("brochure-input")) $("brochure-input").value = data.brochureUrl || "";
    if (document.activeElement !== $("reading-input")) $("reading-input").value = data.readingText || "";
    if (document.activeElement !== $("feedback-input")) $("feedback-input").value = data.feedbackText || "";
  });
}

$("save-brochure-btn").addEventListener("click", () =>
  db.collection("config").doc("state").set({ brochureUrl: $("brochure-input").value.trim() }, { merge: true })
);
$("save-reading-btn").addEventListener("click", () =>
  db.collection("config").doc("state").set({ readingText: $("reading-input").value }, { merge: true })
);
$("save-feedback-btn").addEventListener("click", () =>
  db.collection("config").doc("state").set({ feedbackText: $("feedback-input").value }, { merge: true })
);

// ---------- 計畫書管理 ----------
$("add-plan-btn").addEventListener("click", async () => {
  const name = $("plan-name-input").value.trim();
  const url = $("plan-url-input").value.trim();
  const order = Number($("plan-order-input").value) || 0;
  if (!name) {
    $("plan-msg").innerHTML = `<div class="msg error">請輸入名稱。</div>`;
    return;
  }
  try {
    await db.collection("plans").add({ name, url, order });
    $("plan-name-input").value = "";
    $("plan-url-input").value = "";
    $("plan-msg").innerHTML = `<div class="msg ok">已新增。</div>`;
  } catch (e) {
    $("plan-msg").innerHTML = `<div class="msg error">新增失敗：${e.message}</div>`;
  }
});

function watchPlans() {
  db.collection("plans").orderBy("order").onSnapshot((snap) => {
    plansCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderPlanTable();
    renderPlanFilter();
  });
}

function renderPlanTable() {
  const wrap = $("plan-table-wrap");
  if (plansCache.length === 0) {
    wrap.innerHTML = `<p class="muted">尚未新增計畫書。</p>`;
    return;
  }
  let html = `<table class="admin-table"><tr><th>排序</th><th>名稱</th><th>連結</th><th></th></tr>`;
  plansCache.forEach((p) => {
    html += `<tr>
      <td>${p.order ?? ""}</td>
      <td>${p.name}</td>
      <td>${p.url ? `<a class="icon-link" href="${p.url}" target="_blank" rel="noopener">開啟</a>` : "（無）"}</td>
      <td><button class="btn small secondary" data-del-plan="${p.id}" style="color:#a13324; border-color:#a13324;">刪除</button></td>
    </tr>`;
  });
  html += `</table>`;
  wrap.innerHTML = html;
  wrap.querySelectorAll("[data-del-plan]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("確定刪除這份計畫書？")) return;
      await db.collection("plans").doc(btn.dataset.delPlan).delete();
    });
  });
}

// ---------- 參與者名單 ----------
$("add-person-btn").addEventListener("click", async () => {
  const code = $("person-code-input").value.trim();
  const name = $("person-name-input").value.trim();
  if (!code) {
    $("person-msg").innerHTML = `<div class="msg error">請輸入代碼。</div>`;
    return;
  }
  try {
    await db.collection("participants").doc(code).set({ name });
    $("person-code-input").value = "";
    $("person-name-input").value = "";
    $("person-msg").innerHTML = `<div class="msg ok">已新增。</div>`;
  } catch (e) {
    $("person-msg").innerHTML = `<div class="msg error">新增失敗：${e.message}</div>`;
  }
});

$("bulk-add-btn").addEventListener("click", async () => {
  const lines = $("bulk-input").value.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return;
  const batch = db.batch();
  lines.forEach((line) => {
    const [code, name] = line.split(",").map((s) => (s || "").trim());
    if (!code) return;
    const ref = db.collection("participants").doc(code);
    batch.set(ref, { name: name || "" });
  });
  try {
    await batch.commit();
    $("bulk-input").value = "";
    $("bulk-msg").innerHTML = `<div class="msg ok">已新增 ${lines.length} 筆。</div>`;
  } catch (e) {
    $("bulk-msg").innerHTML = `<div class="msg error">新增失敗：${e.message}</div>`;
  }
});

function watchPeople() {
  db.collection("participants").onSnapshot((snap) => {
    const wrap = $("people-table-wrap");
    if (snap.empty) {
      wrap.innerHTML = `<p class="muted">尚未新增參與者。</p>`;
      return;
    }
    let html = `<table class="admin-table"><tr><th>代碼</th><th>姓名</th><th></th></tr>`;
    snap.forEach((doc) => {
      const p = doc.data();
      html += `<tr>
        <td>${doc.id}</td>
        <td>${p.name || ""}</td>
        <td><button class="btn small secondary" data-del-person="${doc.id}" style="color:#a13324; border-color:#a13324;">刪除</button></td>
      </tr>`;
    });
    html += `</table>`;
    wrap.innerHTML = html;
    wrap.querySelectorAll("[data-del-person]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("確定刪除這位參與者？（其評分紀錄不會被刪除）")) return;
        await db.collection("participants").doc(btn.dataset.delPerson).delete();
      });
    });
  });
}

// ---------- 評分總覽 ----------
function renderPlanFilter() {
  const sel = $("filter-plan");
  const current = sel.value;
  sel.innerHTML = `<option value="">全部</option>` + plansCache.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
  sel.value = current;
}
$("filter-plan").addEventListener("change", renderScoresTable);

function watchScores() {
  db.collectionGroup("entries").onSnapshot((snap) => {
    allEntries = snap.docs.map((d) => d.data());
    renderScoresTable();
  }, (err) => console.error(err));
}

function renderScoresTable() {
  const wrap = $("scores-table-wrap");
  const filterId = $("filter-plan").value;
  const rows = filterId ? allEntries.filter((e) => e.planId === filterId) : allEntries;
  if (rows.length === 0) {
    wrap.innerHTML = `<p class="muted">尚無評分資料。</p>`;
    return;
  }
  let html = `<table class="admin-table"><tr><th>計畫書</th><th>代碼</th><th>姓名</th>`;
  CRITERIA.forEach((c) => (html += `<th>${c.label}</th>`));
  html += `<th>總分</th><th>回饋</th></tr>`;
  rows
    .sort((a, b) => (a.planName || "").localeCompare(b.planName || ""))
    .forEach((e) => {
      html += `<tr>
        <td>${e.planName || e.planId}</td>
        <td>${e.code}</td>
        <td>${e.name || ""}</td>`;
      CRITERIA.forEach((c) => (html += `<td>${e[c.key] ?? 0}</td>`));
      html += `<td><strong>${calcTotal(e)}</strong></td>
        <td>${(e.comment || "").replace(/</g, "&lt;")}</td>
      </tr>`;
    });
  html += `</table>`;
  wrap.innerHTML = html;
}
