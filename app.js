/* =========================================================
   MyList – Main JS (Tasks + Analytics + Profile + Shared)
========================================================= */

const KEY_CURRENT_USER = "mylist_current_user";
const KEY_USER_PREFIX = "mylist_user_";
const KEY_TASKS_PREFIX = "mylist_tasks_";
const KEY_GUEST_TASKS = "mylist_guest_tasks";

let tasks = [];
let currentUser = null;
let reminderTimers = [];

/* ===================== Helpers ===================== */

function getCurrentUserEmail() {
    return localStorage.getItem(KEY_CURRENT_USER) || null;
}

function setCurrentUserEmail(email) {
    if (email) localStorage.setItem(KEY_CURRENT_USER, email);
    else localStorage.removeItem(KEY_CURRENT_USER);
}

function loadCurrentUserData() {
    const email = getCurrentUserEmail();
    currentUser = null;
    if (!email) return;

    const raw = localStorage.getItem(KEY_USER_PREFIX + email);
    if (!raw) return;
    try {
        currentUser = JSON.parse(raw);
    } catch (e) {
        currentUser = null;
    }
}

function saveCurrentUserData() {
    if (!currentUser || !currentUser.email) return;
    localStorage.setItem(KEY_USER_PREFIX + currentUser.email, JSON.stringify(currentUser));
}


/* إشعار علوي (إضافة/تعديل/حذف/تذكير) */
function showAlert(message, color = "#4CAF50", isReminder = false) {

    const old = document.querySelector(".alert-box");
    if (old) old.remove();

    const box = document.createElement("div");
    box.className = "alert-box";
    box.style.background = color;

    const span = document.createElement("span");
    span.textContent = message;
    box.appendChild(span);

    // 🔔 زر الإغلاق فقط للتذكير
    if (isReminder) {
        const close = document.createElement("button");
        close.className = "alert-close";
        close.innerHTML = "×";
        close.onclick = () => box.remove();
        box.appendChild(close);
    }

    document.body.appendChild(box);

    // المؤقت
    setTimeout(() => {
        if (document.body.contains(box)) {
            box.style.opacity = 0;
            setTimeout(() => box.remove(), 500);
        }
    }, isReminder ? 10000 : 1500);
}

/* صورة الحساب في الـ Navbar */
function updateNavbarAvatar() {
    const btn = document.querySelector(".profile-btn");
    if (!btn) return;

    btn.innerHTML = "";

    if (currentUser && currentUser.imageData) {
        const img = document.createElement("img");
        img.src = currentUser.imageData;
        btn.appendChild(img);
    } else {
        let emoji = "👤";
        if (currentUser && currentUser.gender === "female") emoji = "👩";
        if (currentUser && currentUser.gender === "male") emoji = "👨";
        btn.textContent = emoji;
    }
}

/* مهام – تحميل/حفظ */
function loadTasksFromStorage() {
    const email = getCurrentUserEmail();
    let raw;
    if (email) raw = localStorage.getItem(KEY_TASKS_PREFIX + email);
    else raw = localStorage.getItem(KEY_GUEST_TASKS);

    tasks = [];
    if (raw) {
        try {
            tasks = JSON.parse(raw);
        } catch (e) {
            tasks = [];
        }
    }
}

function saveTasksToStorage() {
    const email = getCurrentUserEmail();
    const data = JSON.stringify(tasks);
    if (email) localStorage.setItem(KEY_TASKS_PREFIX + email, data);
    else localStorage.setItem(KEY_GUEST_TASKS, data);
}

/* تذكيرات */
function clearReminderTimers() {
    reminderTimers.forEach(id => clearTimeout(id));
    reminderTimers = [];
}

function scheduleReminders() {
    // طلب إذن الإشعارات
    if (Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    clearReminderTimers();
    const now = Date.now();

    tasks.forEach(t => {
        if (!t.reminder || !t.date || !t.time) return;
        if (t.done) return;

        const dt = new Date(t.date + "T" + (t.time || "00:00"));
        const remindAt = dt.getTime() - (t.reminderValue || 5) * 60 * 1000;
        const diff = remindAt - now;

        if (diff <= 0) return;

        const id = setTimeout(() => {

            showAlert("⏰ Reminder: " + t.title, "#8b6cfc",true);

            if (Notification.permission === "granted") {
                new Notification("Task Reminder", {
                    body: t.title,
                    icon: "icon.png"
                });
            }

        }, diff);   

        reminderTimers.push(id);
    });
}

function closeAllModals() {
    document.querySelectorAll(".modal").forEach(m => m.style.display = "none");
    const backdrop = document.querySelector(".modal-backdrop");
    if (backdrop) backdrop.style.display = "none";
}

/* =========================================================
   TASKS PAGE
========================================================= */

function initTasksPage() {
    loadCurrentUserData();
    updateNavbarAvatar();
    loadTasksFromStorage();
    renderTasks();
    updateTaskProgress();
    scheduleReminders();
}

/* فتح/إغلاق مودال المهمة */
function openTaskModal(editId) {
    const modal = document.getElementById("taskModal");
    const idInput = document.getElementById("taskId");
    const titleInput = document.getElementById("taskTitle");
    const descInput = document.getElementById("taskDesc");
    const dateInput = document.getElementById("taskDate");
    const timeInput = document.getElementById("taskTime");
    const chk = document.getElementById("taskReminder");
    const opt = document.getElementById("reminderOptions");
    const remVal = document.getElementById("reminderValue");
    const modalTitle = document.getElementById("taskModalTitle");

    idInput.value = "";
    titleInput.value = "";
    descInput.value = "";
    dateInput.value = "";
    timeInput.value = "";
    chk.checked = false;
    opt.classList.add("hidden");
    remVal.value = "5";

    if (editId) {
        const t = tasks.find(x => x.id === editId);
        if (t) {
            idInput.value = t.id;
            titleInput.value = t.title;
            descInput.value = t.desc || "";
            dateInput.value = t.date || "";
            timeInput.value = t.time || "";
            chk.checked = !!t.reminder;
            if (t.reminder) {
                opt.classList.remove("hidden");
                remVal.value = t.reminderValue || 5;
            }
            modalTitle.textContent = "Edit Task";
        }
    } else {
        modalTitle.textContent = "Add New Task";
    }

modal.style.display = "block";
}

function closeTaskModal() {
    const modal = document.getElementById("taskModal");
    if (modal) modal.style.display = "none";

    const backdrop = document.querySelector(".modal-backdrop");
    if (backdrop) backdrop.style.display = "none";
}


function toggleReminderOptions() {
    const chk = document.getElementById("taskReminder");
    const opt = document.getElementById("reminderOptions");

    if (chk.checked) {
        opt.classList.remove("hidden");
    } else {
        opt.classList.add("hidden");
    }
}


/* حفظ مهمة */
function saveTask() {
    const id = document.getElementById("taskId").value;
    const title = document.getElementById("taskTitle").value.trim();
    const desc = document.getElementById("taskDesc").value.trim();
    const date = document.getElementById("taskDate").value;
    const time = document.getElementById("taskTime").value;
    const hasRem = document.getElementById("taskReminder").checked;
    const remVal = parseInt(document.getElementById("reminderValue").value || "5");

    if (!title) {
        showAlert("Task title is required", "#d93025");
        return;
    }

    if (id) {
        const i = tasks.findIndex(t => t.id === id);
        if (i !== -1) {
            tasks[i].title = title;
            tasks[i].desc = desc || "";
            tasks[i].date = date || "";
            tasks[i].time = time || "";
            tasks[i].reminder = hasRem;
            tasks[i].reminderValue = hasRem ? remVal : 0;
        }
        showAlert("Task updated!", "#4B7BEC");
    } else {
        const t = {
            id: Date.now().toString(),
            title,
            desc: desc || "",
            date: date || "",
            time: time || "",
            reminder: hasRem,
            reminderValue: hasRem ? remVal : 0,
            done: false,
            createdAt: new Date().toISOString(),
            completedAt: null
        };
        tasks.push(t);
        showAlert("Task added!", "#4CAF50");
    }

    saveTasksToStorage();
    renderTasks();
    updateTaskProgress();
    scheduleReminders();
   closeTaskModal();
closeAllModals();
document.querySelector(".modal-backdrop").style.display = "none";

}

/* عرض قائمة المهام */
function renderTasks() {
    const list = document.getElementById("taskList");
    if (!list) return;

    list.innerHTML = "";

    if (tasks.length === 0) {
        const empty = document.createElement("div");
        empty.style.textAlign = "center";
        empty.style.fontSize = "13px";
        empty.style.color = "#7b719f";
        empty.style.padding = "18px 0";
        empty.textContent = "No tasks yet. Click the + button to add one.";
        list.appendChild(empty);
        return;
    }

    tasks.forEach(t => {
        const card = document.createElement("div");
        card.className = "task-card";

        card.innerHTML = `
            <div>
                <input type="checkbox"
                    class="task-checkbox"
                    ${t.done ? "checked" : ""}
                    onclick="toggleTaskDone('${t.id}')">
            </div>
            <div style="flex:1;">
                <div class="task-title ${t.done ? "done" : ""}">${t.title}</div>
                ${t.desc ? `<div class="task-desc">${t.desc}</div>` : ""}
                <div class="task-meta">
                    ${t.date ? `📅 ${t.date}` : ""}
                    ${t.time ? ` • ⏰ ${t.time}` : ""}
                    ${t.reminder ? ` • 🔔 ${t.reminderValue} min before` : ""}
                </div>
            </div>
            <div class="task-right">
                <button class="icon-btn" onclick="openTaskModal('${t.id}')">✏️</button>
                <button class="icon-btn" onclick="openDeleteModal('${t.id}')">🗑️</button>
            </div>
        `;

        list.appendChild(card);
    });
}

/* تشيك على المهمة */
function toggleTaskDone(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    t.done = !t.done;
    t.completedAt = t.done ? new Date().toISOString() : null;
    saveTasksToStorage();
    renderTasks();
    updateTaskProgress();
    scheduleReminders();
}

/* حذف مهمة */
let deleteIdTemp = null;

function openDeleteModal(id) {
    deleteIdTemp = id;
    const modal = document.getElementById("deleteModal");
    if (modal) modal.style.display = "block";
}

function closeDeleteModal() {
    const modal = document.getElementById("deleteModal");
    if (modal) modal.style.display = "none";
    deleteIdTemp = null;
}

function confirmDeleteTask() {
    if (!deleteIdTemp) return;
    tasks = tasks.filter(t => t.id !== deleteIdTemp);
    saveTasksToStorage();
    renderTasks();
    updateTaskProgress();
    scheduleReminders();
    showAlert("Task deleted", "#d93025");
    closeDeleteModal();
    closeAllModals();

}

/* التقدم – (النسبة + تعبئة الدائرة) */
function updateTaskProgress() {
    const total = tasks.length;
    const done = tasks.filter(t => t.done).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    const textEl = document.getElementById("progressText");
    const perEl = document.getElementById("progressPercent");

    if (textEl) textEl.textContent = `${done} of ${total} completed`;
    if (perEl) perEl.textContent = `${percent}%`;

    // تعبئة الدائرة حسب النسبة
    const circle = document.querySelector(".progress-circle");
    if (circle) {
        circle.style.setProperty("--p", percent + "%");
    }
}

/* =========================================================
   ANALYTICS
========================================================= */

let chartMode = "week";

function initAnalyticsPage() {
    loadCurrentUserData();
    updateNavbarAvatar();
    loadTasksFromStorage();
    updateAnalyticsNumbers();
    setChartMode("week");
}

function setChartMode(mode) {
    chartMode = mode;
    const bw = document.getElementById("btnWeek");
    const bm = document.getElementById("btnMonth");
    if (bw && bm) {
        bw.classList.toggle("active", mode === "week");
        bm.classList.toggle("active", mode === "month");
    }
    buildChart();
}

function updateAnalyticsNumbers() {
    const total = tasks.length;
    const done = tasks.filter(t => t.done).length;
    const pending = total - done;
    const rate = total === 0 ? 0 : Math.round((done / total) * 100);

    const elT = document.getElementById("anTotal");
    const elD = document.getElementById("anDone");
    const elP = document.getElementById("anPending");
    const elR = document.getElementById("anRate");

    if (elT) elT.textContent = total;
    if (elD) elD.textContent = done;
    if (elP) elP.textContent = pending;
    if (elR) elR.textContent = rate + "%";
}

function buildChart() {
    const barsBox = document.getElementById("chartBars");
    const labelsBox = document.getElementById("chartLabels");
    if (!barsBox || !labelsBox) return;

    barsBox.innerHTML = "";
    labelsBox.innerHTML = "";


const doneTasks = tasks.filter(t => t.done && t.completedAt);

    if (chartMode === "week") {
        const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
        const counts = [0,0,0,0,0,0,0];

        doneTasks.forEach(t => {
            const d = new Date(t.completedAt);
            const idx = d.getDay();
            counts[idx]++;
        });

        const max = Math.max(...counts, 1);

        counts.forEach((c, i) => {
            const wrap = document.createElement("div");
            wrap.className = "chart-bar-wrap";

            const bar = document.createElement("div");
            bar.className = "chart-bar";
            bar.style.height = (c / max * 150) + "px";

            if (c > 0) {
                const v = document.createElement("div");
                v.className = "chart-bar-value";
                v.textContent = c;
                bar.appendChild(v);
            }

            wrap.appendChild(bar);
            barsBox.appendChild(wrap);

            const lab = document.createElement("div");
            lab.textContent = days[i];
            labelsBox.appendChild(lab);
        });
   } else {
    const now = new Date();
    const curM = now.getMonth();
    const curY = now.getFullYear();

    const days = new Date(curY, curM + 1, 0).getDate(); // عدد أيام الشهر
    const counts = Array(days).fill(0);

    doneTasks.forEach(t => {
        const d = new Date(t.completedAt);
        if (d.getFullYear() === curY && d.getMonth() === curM) {
            counts[d.getDate() - 1]++;
        }
    });

    const max = Math.max(...counts, 1);

    counts.forEach((c, i) => {
       
            const wrap = document.createElement("div");
            wrap.className = "chart-bar-wrap";

            const bar = document.createElement("div");
            bar.className = "chart-bar";
            bar.style.height = (c / max * 150) + "px";

            if (c > 0) {
                const v = document.createElement("div");
                v.className = "chart-bar-value";
                v.textContent = c;
                bar.appendChild(v);
            }

            wrap.appendChild(bar);
            barsBox.appendChild(wrap);

            const lab = document.createElement("div");
            lab.textContent = i + 1;
            labelsBox.appendChild(lab);
        
    });
}


    updateAnalyticsNumbers();
}

/* =========================================================
   CONTACT
========================================================= */

function submitContact(e) {
    e.preventDefault();
    showAlert("Message sent! (demo only)", "#4CAF50");
    e.target.reset();
}

/* =========================================================
   PROFILE
========================================================= */

let createImageData = null;

function initProfilePage() {
    loadCurrentUserData();
    updateNavbarAvatar();

    const imgInput = document.getElementById("createImageInput");
    if (imgInput) {
        imgInput.addEventListener("change", handleCreateImageUpload);
    }
    const genderSel = document.getElementById("regGender");
    if (genderSel) {
        genderSel.addEventListener("change", updateCreateAvatarPreview);
    }

    const email = getCurrentUserEmail();
    if (email && currentUser) {
        showAccountView();
    } else {
        showAuthTab("login");
    }
}

/* tabs Login / Create */
function showAuthTab(tab) {
    const loginBox = document.getElementById("loginBox");
    const createBox = document.getElementById("createBox");
    const accBox = document.getElementById("accountBox");
    const tabs = document.querySelector(".auth-tabs");

    const tLogin = document.getElementById("tabLogin");
    const tCreate = document.getElementById("tabCreate");

    if (accBox && accBox.style.display === "block") {
        // لو داخل الحساب، ما نغيّر
        return;
    }

    if (tab === "login") {
        if (loginBox) loginBox.style.display = "block";
        if (createBox) createBox.style.display = "none";
        if (tLogin) tLogin.classList.add("active");
        if (tCreate) tCreate.classList.remove("active");
    } else {
        if (loginBox) loginBox.style.display = "none";
        if (createBox) createBox.style.display = "block";
        if (tLogin) tLogin.classList.remove("active");
        if (tCreate) tCreate.classList.add("active");
        updateCreateAvatarPreview();
    }

    if (tabs) tabs.style.display = "flex";
}

/* صورة إنشاء حساب */
function handleCreateImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        createImageData = ev.target.result;
        updateCreateAvatarPreview();
    };
    reader.readAsDataURL(file);
}

function updateCreateAvatarPreview() {
    const box = document.getElementById("createAvatar");
    if (!box) return;
    box.innerHTML = "";

    if (createImageData) {
        const img = document.createElement("img");
        img.src = createImageData;
        box.appendChild(img);
    } else {
        const span = document.createElement("span");
        const genderSel = document.getElementById("regGender");
        let gender = genderSel ? genderSel.value : "other";
        let emoji = "👤";
        if (gender === "female") emoji = "👩";
        if (gender === "male") emoji = "👨";
        span.textContent = emoji;
        box.appendChild(span);
    }
}

/* إنشاء حساب */
function doRegister() {
    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const birth = document.getElementById("regBirth").value;
    const gender = document.getElementById("regGender").value;
    const pass = document.getElementById("regPass").value;
    const pass2 = document.getElementById("regPass2").value;

    if (!name || !email || !pass || !pass2) {
        showAlert("Please fill required fields", "#d93025");
        return;
    }
    if (pass.length < 6) {
        showAlert("Password must be at least 6 characters", "#d93025");
        return;
    }
    if (pass !== pass2) {
        showAlert("Passwords do not match", "#d93025");
        return;
    }

    const key = KEY_USER_PREFIX + email;
    if (localStorage.getItem(key)) {
        showAlert("Account already exists", "#d93025");
        return;
    }

    const user = {
        name,
        email,
        birth,
        gender,
        password: pass,
        imageData: createImageData || null
    };

    localStorage.setItem(key, JSON.stringify(user));
    setCurrentUserEmail(email);
    currentUser = user;
    saveCurrentUserData();
    loadTasksFromStorage();
    // حذف مهام الضيف بعد إنشاء حساب جديد
localStorage.removeItem(KEY_GUEST_TASKS);
    showAlert("Account created and logged in!", "#4CAF50");
    showAccountView();
}

/* تسجيل دخول */
function doLogin() {
    const email = document.getElementById("loginEmail").value.trim();
    const pass = document.getElementById("loginPass").value;

    if (!email || !pass) {
        showAlert("Please enter email and password", "#d93025");
        return;
    }

    const key = KEY_USER_PREFIX + email;
    const raw = localStorage.getItem(key);
    if (!raw) {
        showAlert("Account not found", "#d93025");
        return;
    }

    let user;
    try {
        user = JSON.parse(raw);
    } catch (e) {
        showAlert("Account data error", "#d93025");
        return;
    }

    if (user.password !== pass) {
        showAlert("Wrong password", "#d93025");
        return;
    }

    setCurrentUserEmail(email);
    currentUser = user;
    loadTasksFromStorage();
   localStorage.removeItem(KEY_GUEST_TASKS);
 showAlert("Logged in successfully!", "#4CAF50");
    showAccountView();
    // حذف مهام الضيف عند تسجيل الدخول
}

/* عرض الحساب بعد تسجيل الدخول */
function showAccountView() {
    const loginBox = document.getElementById("loginBox");
    const createBox = document.getElementById("createBox");
    const accBox = document.getElementById("accountBox");
    const tabs = document.querySelector(".auth-tabs");

    if (loginBox) loginBox.style.display = "none";
    if (createBox) createBox.style.display = "none";
    if (tabs) tabs.remove();   // ← حذف التابات بالكامل بعد تسجيل الدخول

    if (!currentUser) return;

    const av = document.getElementById("accountAvatar");
    const nameEl = document.getElementById("accountName");
    const emailEl = document.getElementById("accountEmail");

    if (av) {
        av.innerHTML = "";
        if (currentUser.imageData) {
            const img = document.createElement("img");
            img.src = currentUser.imageData;
            av.appendChild(img);
        } else {
            const span = document.createElement("span");
            let emoji = "👤";
            if (currentUser.gender === "female") emoji = "👩";
            if (currentUser.gender === "male") emoji = "👨";
            span.textContent = emoji;
            av.appendChild(span);
        }
    }

    if (nameEl) nameEl.textContent = currentUser.name || "My Account";
    if (emailEl) emailEl.textContent = currentUser.email || "";

    if (accBox) accBox.style.display = "block";

    updateNavbarAvatar();
}

/* Edit Profile – كلام فقط (ديمو) */
function openEditProfile() {
    window.location.href = "edit-profile.html";
}


/* تسجيل خروج */
function logout() {
    setCurrentUserEmail(null);
    currentUser = null;
    loadTasksFromStorage();
    showAlert("Logged out", "#4B7BEC");

    const accBox = document.getElementById("accountBox");
    if (accBox) accBox.style.display = "none";

    // ما في تبويبات لأننا حذفناها، فبس نرجع صفحة وتختار Login/Create من جديد إذا رجعتي
    location.reload();
}

/* حذف الحساب نهائياً */
function deleteAccount() {
    if (!currentUser || !currentUser.email) return;
    if (!confirm("Delete account and all tasks?")) return;

    const email = currentUser.email;
    localStorage.removeItem(KEY_USER_PREFIX + email);
    localStorage.removeItem(KEY_TASKS_PREFIX + email);
    setCurrentUserEmail(null);
    currentUser = null;
    loadTasksFromStorage();
    showAlert("Account deleted permanently", "#d93025");

    location.reload();
}

/* =========================================================
   SHARED (About / Contact)
========================================================= */

function initShared() {
    loadCurrentUserData();
    updateNavbarAvatar();
}
