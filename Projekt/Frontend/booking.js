/*************************
 * Frontend/booking.js
 *************************/

// 🔗 رابط الباكند (جاهز من Render)
const API_BASE = "https://web-tech-5s0d.onrender.com";

// 🔐 تأكد إن المستخدم مسجّل دخول
requireLogin(); // من auth.js

// =======================
// Helpers
// =======================
function $(id) {
  return document.getElementById(id);
}

function normalizeDate(dateStr) {
  // لو التاريخ جاي بصيغة 14.01.2026 نحوله
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
    const [dd, mm, yyyy] = dateStr.split(".");
    return `${yyyy}-${mm}-${dd}`;
  }
  return dateStr; // YYYY-MM-DD
}

function showMsg(message, ok = true) {
  const box = $("msg");
  if (!box) return;

  box.innerHTML = `
    <div style="
      margin-top:12px;
      padding:12px;
      border-radius:10px;
      border:1px solid ${ok ? "#52c41a" : "#ff4d4f"};
      background:${ok ? "#f6ffed" : "#fff1f0"};
      color:#000;
      font-weight:500;
    ">
      ${message}
    </div>
  `;
}

// =======================
// Book Appointment
// =======================
async function book() {
  const userId = getUserId(); // من auth.js
  const dateRaw = $("date")?.value?.trim();
  const time = $("time")?.value?.trim();
  const service = $("service")?.value?.trim();

  if (!userId) {
    showMsg("❌ لازم تسجّل دخول أولاً", false);
    return;
  }

  if (!dateRaw || !time || !service) {
    showMsg("❌ عبّي التاريخ والوقت والخدمة", false);
    return;
  }

  const date = normalizeDate(dateRaw);

  try {
    const res = await fetch(`${API_BASE}/api/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        date,
        time,
        service,
      }),
    });

    const data = await res.json();

    // الباكند بيرجع message بكل الحالات
    const success = (data?.message || "").includes("✅");
    showMsg(data?.message || "تم", success);
  } catch (err) {
    console.error(err);
    showMsg("❌ فشل الاتصال بالسيرفر", false);
  }
}

// خلي الدالة Global لأن الزر بيستدعيها
window.book = book;

// =======================
// Logout
// =======================
$("logoutBtn")?.addEventListener("click", logout);
