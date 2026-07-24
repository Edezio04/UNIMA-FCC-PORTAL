console.log("FCC script loaded");

// =========================================================
// REGISTRATION FORM HANDLER
// =========================================================
const registerForm = document.getElementById("registrationForm");

if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const member = {
            firstName: document.getElementById("firstName").value,
            lastName: document.getElementById("lastName").value,
            yearOfStudy: document.getElementById("yearOfStudy").value,
            programOfStudy: document.getElementById("programOfStudy").value,
            email: document.getElementById("email").value,
            password: document.getElementById("password").value,
            agreedMission: document.getElementById("agree").checked
        };

        console.log("Sending registration data:", member);

        try {
            // ✅ Uses relative path /register
            const response = await fetch("/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(member)
            });

            const data = await response.json();
            console.log("Server response:", data);

            if (response.ok) {
                alert("Registration successful! Member Number: " + (data.memberNumber || ""));
                window.location.href = "success.html";
            } else {
                alert(data.message || "Registration failed");
            }

        } catch (error) {
            console.error("Registration error:", error);
            alert("Unable to connect to server");
        }
    });
}

// =========================================================
// LOGIN FORM HANDLER (If present in your UI)
// =========================================================
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const credentials = {
            email: document.getElementById("loginEmail").value,
            password: document.getElementById("loginPassword").value
        };

        try {
            // ✅ Uses relative path /login
            const response = await fetch("/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(credentials)
            });

            const data = await response.json();

            if (response.ok) {
                alert("Login successful!");
                localStorage.setItem("user", JSON.stringify(data.user));
                window.location.href = "dashboard.html";
            } else {
                alert(data.message || "Login failed");
            }

        } catch (error) {
            console.error("Login error:", error);
            alert("Unable to connect to server");
        }
    });
}