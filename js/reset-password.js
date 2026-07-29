const params = new URLSearchParams(window.location.search);
const token = params.get("token");
const form = document.getElementById("resetForm");
const messageEl = document.getElementById("message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const password = document.getElementById("password").value;
  const confirm = document.getElementById("confirm").value;

  if (password !== confirm) {
    messageEl.textContent = "Passwords do not match.";
    return;
  }

  const submitBtn = document.getElementById("resetSubmitBtn");
  setButtonLoading(submitBtn, true);

  try {
    const res = await fetch(API_BASE + "/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: password }),
    });

    const data = await res.json();

    if (res.ok) {
      messageEl.textContent = "Password reset successfully. Redirecting to sign in...";
      setTimeout(() => {
        window.location.href = "signin.html";
      }, 2000);
    } else {
      messageEl.textContent = data.detail || "Something went wrong. Please try again.";
      setButtonLoading(submitBtn, false);
    }
  } catch (err) {
    messageEl.textContent = "Couldn't reach the server. Please try again.";
    setButtonLoading(submitBtn, false);
  }
});

document.querySelectorAll(".toggle-eye").forEach(function (btn) {
  btn.addEventListener("click", function () {
    let target = document.getElementById(btn.dataset.target);
    if (target.type === "password") {
      target.type = "text";
      btn.textContent = "🙈";
    } else {
      target.type = "password";
      btn.textContent = "👁";
    }
  });
});