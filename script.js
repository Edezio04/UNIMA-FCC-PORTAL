document.addEventListener("DOMContentLoaded", () => {
    const registrationForm = document.getElementById("registrationForm");

    if (registrationForm) {
        registrationForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const firstName = document.getElementById("firstName").value;
            const lastName = document.getElementById("lastName").value;
            const yearOfStudy = document.getElementById("yearOfStudy").value;
            const programOfStudy = document.getElementById("programOfStudy").value;
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;
            const confirmPassword = document.getElementById("confirmPassword").value;
            const agreedMission = document.getElementById("agree").checked;

            if (password !== confirmPassword) {
                alert("Passwords do not match!");
                return;
            }

            try {
                const response = await fetch("/register", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        firstName,
                        lastName,
                        yearOfStudy,
                        programOfStudy,
                        email,
                        password,
                        agreedMission
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    alert(`Registration successful! Your Member Number is: ${data.memberNumber}`);
                    window.location.href = "login.html";
                } else {
                    alert(data.message || "Registration failed. Please try again.");
                }
            } catch (error) {
                console.error("Error submitting form:", error);
                alert("Cannot connect to server. Please check your network connection.");
            }
        });
    }
});
