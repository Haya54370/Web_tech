// auth.js

function getUserId() {
  return localStorage.getItem("userId");
}

function getRole() {
  return (localStorage.getItem("role") || "user").toLowerCase();
}

// ✅ For pages that require any logged-in user
function requireLogin() {
  const userId = getUserId();
  if (!userId) {
    window.location.href = "login.html";
  }
}

// ✅ For pages that require admin only
function requireAdmin() {
  const userId = getUserId();
  const role = getRole();

  if (!userId) {
    window.location.href = "login.html";
    return;
  }

  if (role !== "admin") {
    // you can change this to booking.html or index.html if you prefer
    window.location.href = "index.html";
  }
}

// ✅ Optional helper: redirect user based on role
function redirectByRole() {
  const userId = getUserId();
  const role = getRole();

  if (!userId) {
    window.location.href = "login.html";
    return;
  }

  if (role === "admin") window.location.href = "admin.html";
  else window.location.href = "booking.html";
}

// ✅ Logout everywhere
function logout() {
  localStorage.removeItem("userId");
  localStorage.removeItem("role");
  window.location.href = "index.html";
}
