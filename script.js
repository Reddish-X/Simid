// ===== CHANGE THIS TO YOUR PASSWORD =====
const correctPassword = "us_forever!?";
// ========================================

const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const error = document.getElementById("error");
const card = document.getElementById("card");

function unlockWebsite() {
    if (passwordInput.value === correctPassword) {

        error.style.color = "#4CAF50";
        error.textContent = "Access Granted ✓";

        // Smooth fade out
        card.style.transition = "opacity 0.8s ease, transform 0.8s ease";
        card.style.opacity = "0";
        card.style.transform = "scale(0.95)";

        setTimeout(() => {
            window.location.href = "website/index.html";
        }, 800);

    } else {

        error.style.color = "#ff5d5d";
        error.textContent = "Incorrect Password";

        card.classList.remove("shake");
        void card.offsetWidth; // Restart animation
        card.classList.add("shake");

        passwordInput.value = "";
        passwordInput.focus();
    }
}

loginBtn.addEventListener("click", unlockWebsite);

// Press Enter to unlock
passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        unlockWebsite();
    }
});