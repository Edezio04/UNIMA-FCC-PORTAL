document.addEventListener("DOMContentLoaded", () => {
    // Session Guard check to protect events resource page
    const member = JSON.parse(localStorage.getItem("member"));
    if (!member) {
        window.location.href = "login.html";
    }

    const filterButtons = document.querySelectorAll(".filter-btn");
    const eventCards = document.querySelectorAll(".event-card-premium");

    filterButtons.forEach(button => {
        button.addEventListener("click", () => {
            filterButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");

            const selectedCategory = button.getAttribute("data-filter");

            eventCards.forEach(card => {
                const cardCategory = card.getAttribute("data-category");

                if (selectedCategory === "all" || cardCategory === selectedCategory) {
                    card.style.display = "flex";
                    card.style.opacity = "0";
                    setTimeout(() => {
                        card.style.opacity = "1";
                    }, 50);
                } else {
                    card.style.display = "none";
                }
            });
        });
    });
});