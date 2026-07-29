console.log("Forgot Password JS Loaded");
console.log("API_BASE =", API_BASE);

const form = document.getElementById("forgotForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  console.log("Button clicked");

  const email = document.getElementById("email").value;
  console.log("Email:", email);

  const submitBtn = form.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);

  try {
    console.log("Sending request...");

    const res = await fetch(API_BASE + "/auth/forgot-password", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    console.log("Status:", res.status);

    const data = await res.json();

    console.log(data);

    document.getElementById("message").innerHTML = data.message;
  } catch (err) {
    console.error("FETCH ERROR:", err);
  } finally {
    setButtonLoading(submitBtn, false);
  }
});