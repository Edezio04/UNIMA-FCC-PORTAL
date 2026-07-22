document.addEventListener("DOMContentLoaded", () => {
    loadUserData();
    fetchDashboardCounts();
    loadUpcomingActivities();
    bindNavigationEvents();
});

// ===================================================
// SECURITY HELPER
// ===================================================

function escapeHtml(text) {
    if (text === null || text === undefined) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ===================================================
// SAFE TEXT DISPLAY
// ===================================================

function setSafeText(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    }
}

// ===================================================
// ROBUST DATE PARSER HELPER
// ===================================================

function parseEventDate(rawDate) {
    if (!rawDate) return new Date();

    if (!isNaN(rawDate)) {
        const num = Number(rawDate);
        return new Date(num < 10000000000 ? num * 1000 : num);
    }

    const d = new Date(rawDate);
    return isNaN(d.getTime()) ? new Date() : d;
}

function extractEventFields(event) {
    return {
        id: event.id || event._id || event.event_id,
        title: event.title || event.name || event.event_name || "Untitled Event",
        description: event.description || event.desc || "No description provided.",
        rawDate: event.eventDate || event.date || event.event_date || new Date().toISOString(),
        location: event.location || event.venue || event.place || "TBA"
    };
}

// ===================================================
// LOAD USER DETAILS
// ===================================================

function loadUserData() {
    const user = JSON.parse(localStorage.getItem("fcc_user") || "{}");

    if (user.firstName) {
        setSafeText("welcomeMemberName", `${user.firstName} ${user.lastName || ""}`);
        setSafeText("firstName", user.firstName);
        setSafeText("lastName", user.lastName);
        setSafeText("email", user.email);
        setSafeText("programme", user.programOfStudy);
        setSafeText("year", user.yearOfStudy);
        setSafeText("memberNumber", user.memberNumber || "---");
    }

    const logout = document.getElementById("logoutBtn");
    if (logout) {
        logout.onclick = () => {
            if (confirm("Logout from FCC Portal?")) {
                localStorage.removeItem("fcc_user");
                window.location.href = "login.html";
            }
        };
    }
}

// ===================================================
// LOAD DASHBOARD COUNTERS (UPDATED)
// ===================================================

async function fetchDashboardCounts() {
    try {
        const cacheBust = "?t=" + Date.now();
        const [membersRes, eventsRes, prayersRes, studiesRes] = await Promise.all([
            fetch("/members" + cacheBust).then((r) => r.json()).catch(() => []),
            fetch("/events" + cacheBust).then((r) => r.json()).catch(() => []),
            fetch("/prayers" + cacheBust).then((r) => r.json()).catch(() => []),
            fetch("/bible-studies" + cacheBust).then((r) => r.json()).catch(() => [])
        ]);

        const members = Array.isArray(membersRes) ? membersRes : (membersRes.data || []);
        const events = Array.isArray(eventsRes) ? eventsRes : (eventsRes.data || []);
        const prayers = Array.isArray(prayersRes) ? prayersRes : (prayersRes.data || []);
        const studies = Array.isArray(studiesRes) ? studiesRes : (studiesRes.data || []);

        setSafeText("memberCount", members.length);
        setSafeText("eventCount", events.length);
        setSafeText("totalEventsCount", events.length);
        setSafeText("prayerCount", prayers.length);
        setSafeText("studyCount", studies.length);

    } catch (error) {
        console.error("Dashboard count error:", error);
    }
}

// ===================================================
// NAVIGATION EVENTS & SCROLL
// ===================================================

function bindNavigationEvents() {
    const navigationBindings = [
        { id: "membersBtn", action: loadMembers },
        { id: "eventsBtn", action: loadEvents },
        { id: "prayersBtn", action: loadPrayers },
        { id: "bibleBtn", action: loadBibleStudies },
        { id: "sidebarEventsBtn", action: loadEvents },
        { id: "sidebarBibleBtn", action: loadBibleStudies },
        { id: "sidebarPrayerBtn", action: loadPrayers },
        { id: "sidebarMembersBtn", action: loadMembers },
        { id: "quickEventsBtn", action: loadEvents },
        { id: "quickPrayerBtn", action: loadPrayers },
        { id: "quickBibleBtn", action: loadBibleStudies }
    ];

    navigationBindings.forEach(({ id, action }) => {
        document.getElementById(id)?.addEventListener("click", () => {
            action();
            scrollToView();
        });
    });
}

function scrollToView() {
    const section = document.getElementById("dashboardContent");
    if (section) {
        section.scrollIntoView({ behavior: "smooth" });
    }
}

// ===================================================
// UPCOMING ACTIVITIES & ANNOUNCEMENTS
// ===================================================

async function loadUpcomingActivities() {
    try {
        const response = await fetch("/events?t=" + Date.now());
        const data = await response.json();

        const eventsList = Array.isArray(data) ? data : (data.events || data.data || []);
        const upcomingContainer = document.getElementById("upcomingActivities");

        if (upcomingContainer) {
            if (eventsList.length === 0) {
                upcomingContainer.innerHTML = `
                    <div class="event-item">
                        <h4>No Upcoming Activities</h4>
                        <p>New events will appear here.</p>
                    </div>
                `;
            } else {
                let html = "";
                eventsList.slice(0, 5).forEach((event) => {
                    const { title, rawDate, location } = extractEventFields(event);
                    const parsedDate = parseEventDate(rawDate);

                    html += `
                        <div class="event-item">
                            <h4>${escapeHtml(title)}</h4>
                            <p><i class="fa-regular fa-clock"></i> ${parsedDate.toLocaleString()}</p>
                            <p><i class="fa-solid fa-location-dot"></i> ${escapeHtml(location)}</p>
                        </div>
                        <hr class="card-divider">
                    `;
                });
                upcomingContainer.innerHTML = html;
            }
        }

        updateAnnouncements(eventsList);
    } catch (error) {
        console.error("Activities error:", error);
    }
}

function updateAnnouncements(events) {
    const list = document.getElementById("announcementList");
    if (!list) return;

    let html = "";

    if (!events || events.length === 0) {
        html = `<li>No upcoming events available.</li>`;
    } else {
        events.slice(0, 5).forEach((event) => {
            const { title, rawDate, location } = extractEventFields(event);
            const parsedDate = parseEventDate(rawDate);

            html += `
                <li>
                    <strong>${escapeHtml(title)}</strong><br>
                    🗓️ ${parsedDate.toLocaleDateString()} at ${escapeHtml(location)}
                </li>
            `;
        });
    }

    list.innerHTML = html;
}

// ===================================================
// EVENTS MANAGEMENT
// ===================================================

async function loadEvents() {
    const container = document.getElementById("dashboardContent");
    if (!container) return;

    container.innerHTML = `
        <div class="card">
            <h3>Loading Events...</h3>
        </div>
    `;

    try {
        const response = await fetch("/events?t=" + Date.now());
        const rawEvents = await response.json();

        let html = `
            <div class="card">
                <div class="card-header-inside">
                    <i class="fa-solid fa-calendar"></i>
                    <h2>Upcoming Events</h2>
                </div>
                <button class="btn btn-primary" onclick="renderAddEventForm()">+ Add Event</button>
                <hr class="card-divider">
        `;

        const eventsList = Array.isArray(rawEvents) ? rawEvents : (rawEvents.data || []);

        if (eventsList.length === 0) {
            html += `<p>No events found.</p>`;
        } else {
            eventsList.forEach((event) => {
                const { id, title, description, rawDate, location } = extractEventFields(event);
                const parsedDate = parseEventDate(rawDate);

                html += `
                    <div class="resource-card">
                        <h3>${escapeHtml(title)}</h3>
                        <p>${escapeHtml(description)}</p>
                        <p>📍 ${escapeHtml(location)}</p>
                        <p>🗓 ${parsedDate.toLocaleString()}</p>
                        ${
                            id
                                ? `<button class="btn" style="background:red; color:white;" onclick="deleteResource('/events/${id}', loadEvents)">
                                    🗑 Remove
                                   </button>`
                                : ""
                        }
                    </div>
                `;
            });
        }

        html += `</div>`;
        container.innerHTML = html;
    } catch (error) {
        console.error("Load events error:", error);
    }
}

function renderAddEventForm() {
    const container = document.getElementById("dashboardContent");
    container.innerHTML = `
        <div class="card">
            <h2>Create Event</h2>
            <form onsubmit="handleCreateEvent(event)">
                <label for="eventTitle">Title</label>
                <input id="eventTitle" placeholder="Event title" required class="w-100">
                <br><br>
                <label for="eventDescription">Description</label>
                <textarea id="eventDescription" placeholder="Description" class="w-100"></textarea>
                <br><br>
                <label for="eventDate">Date & Time</label>
                <input type="datetime-local" id="eventDate" required class="w-100">
                <br><br>
                <label for="eventLocation">Location</label>
                <input id="eventLocation" placeholder="Location" required class="w-100">
                <br><br>
                <button type="submit" class="btn btn-primary">Save Event</button>
                <button type="button" class="btn btn-secondary" onclick="loadEvents()">Cancel</button>
            </form>
        </div>
    `;
}

async function handleCreateEvent(event) {
    event.preventDefault();

    const title = document.getElementById("eventTitle").value;
    const description = document.getElementById("eventDescription").value;
    const rawDate = document.getElementById("eventDate").value;
    const location = document.getElementById("eventLocation").value;

    const data = {
        title: title,
        description: description,
        eventDate: rawDate,
        location: location
    };

    try {
        const response = await fetch("/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert("Event added successfully!");
            // Refresh counts, sidebar, and views directly after database write
            await fetchDashboardCounts();
            await loadUpcomingActivities();
            await loadEvents();
        } else {
            const resData = await response.json().catch(() => ({}));
            alert("Failed creating event: " + (resData.message || "Server error"));
        }
    } catch (error) {
        console.error("Save event network error:", error);
        alert("Network error. Could not connect to the server.");
    }
}

// ===================================================
// BIBLE STUDIES MANAGEMENT
// ===================================================

async function loadBibleStudies() {
    const container = document.getElementById("dashboardContent");
    if (!container) return;

    container.innerHTML = `<div class="card"><h3>Loading Bible Studies...</h3></div>`;

    try {
        const response = await fetch("/bible-studies?t=" + Date.now());
        const studies = await response.json();

        let html = `
            <div class="card">
                <div class="card-header-inside">
                    <i class="fa-solid fa-book-bible"></i>
                    <h2>Bible Study Resources</h2>
                </div>
                <button class="btn btn-primary" onclick="renderUploadForm()">+ Upload Document</button>
                <hr class="card-divider">
        `;

        const studiesList = Array.isArray(studies) ? studies : (studies.data || []);

        if (studiesList.length === 0) {
            html += `<p>No Bible studies uploaded yet.</p>`;
        } else {
            html += `<div class="cards-grid">`;
            studiesList.forEach((study) => {
                const resourceId = study.id || study._id;
                html += `
                    <div class="resource-card">
                        <h3>${escapeHtml(study.title)}</h3>
                        <p>${escapeHtml(study.description || "No description")}</p>
                        <small>Uploaded: ${new Date(study.uploadedAt || Date.now()).toLocaleDateString()}</small>
                        <br><br>
                        <a href="${study.filePath}" target="_blank" class="btn btn-primary">⬇ Download</a>
                        <button class="btn" style="background:red; color:white; margin-left:10px;" onclick="deleteResource('/bible-studies/${resourceId}', loadBibleStudies)">
                            🗑 Delete
                        </button>
                    </div>
                `;
            });
            html += `</div>`;
        }

        html += `</div>`;
        container.innerHTML = html;
    } catch (error) {
        console.error(error);
    }
}

function renderUploadForm() {
    const container = document.getElementById("dashboardContent");
    container.innerHTML = `
        <div class="card">
            <h2>Upload Bible Study</h2>
            <form onsubmit="handleStudyUpload(event)">
                <label>Title</label>
                <input id="studyTitle" required class="w-100">
                <br><br>
                <label>Description</label>
                <textarea id="studyDescription" class="w-100"></textarea>
                <br><br>
                <label>Document</label>
                <input type="file" id="studyDocument" required>
                <br><br>
                <button type="submit" class="btn btn-primary">Upload</button>
                <button type="button" class="btn btn-secondary" onclick="loadBibleStudies()">Cancel</button>
            </form>
        </div>
    `;
}

async function handleStudyUpload(event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append("title", document.getElementById("studyTitle").value);
    formData.append("description", document.getElementById("studyDescription").value);
    formData.append("document", document.getElementById("studyDocument").files[0]);

    try {
        const response = await fetch("/bible-studies", { method: "POST", body: formData });
        if (response.ok) {
            alert("Bible Study uploaded successfully");
            await fetchDashboardCounts();
            await loadBibleStudies();
        } else {
            alert("Failed to upload Bible study.");
        }
    } catch (error) {
        console.error(error);
    }
}

// ===================================================
// PRAYER REQUEST MANAGEMENT
// ===================================================

async function loadPrayers() {
    const container = document.getElementById("dashboardContent");
    container.innerHTML = `<div class="card"><h3>Loading Prayer Requests...</h3></div>`;

    try {
        const response = await fetch("/prayers?t=" + Date.now());
        const prayers = await response.json();

        let html = `
            <div class="card">
                <div class="card-header-inside">
                    <i class="fa-solid fa-hands-praying"></i>
                    <h2>Prayer Requests</h2>
                </div>
                <button class="btn btn-primary" onclick="renderAddPrayerForm()">+ Submit Prayer</button>
                <hr class="card-divider">
        `;

        const prayersList = Array.isArray(prayers) ? prayers : (prayers.data || []);

        if (prayersList.length === 0) {
            html += `<p>No prayer requests available.</p>`;
        } else {
            prayersList.forEach((prayer) => {
                const resourceId = prayer.id || prayer._id;
                html += `
                    <div class="resource-card">
                        <h3>From: ${escapeHtml(prayer.memberName)}</h3>
                        <p>"${escapeHtml(prayer.request)}"</p>
                        <small>${new Date(prayer.dateCreated || Date.now()).toLocaleDateString()}</small>
                        <br><br>
                        <button class="btn" style="background:red; color:white;" onclick="deleteResource('/prayers/${resourceId}', loadPrayers)">
                            🗑 Remove
                        </button>
                    </div>
                `;
            });
        }

        html += `</div>`;
        container.innerHTML = html;
    } catch (error) {
        console.error(error);
    }
}

function renderAddPrayerForm() {
    const container = document.getElementById("dashboardContent");
    const user = JSON.parse(localStorage.getItem("fcc_user") || "{}");
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();

    container.innerHTML = `
        <div class="card">
            <h2>Submit Prayer Request</h2>
            <form onsubmit="handleCreatePrayer(event)">
                <input id="prayerMemberName" value="${escapeHtml(fullName)}" placeholder="Your Name" required class="w-100">
                <br><br>
                <input id="prayerMemberEmail" value="${escapeHtml(user.email || "")}" type="email" required class="w-100">
                <br><br>
                <textarea id="prayerRequestText" placeholder="Prayer request" required class="w-100"></textarea>
                <br><br>
                <button type="submit" class="btn btn-primary">Submit</button>
                <button type="button" class="btn btn-secondary" onclick="loadPrayers()">Cancel</button>
            </form>
        </div>
    `;
}

async function handleCreatePrayer(event) {
    event.preventDefault();

    const data = {
        memberName: document.getElementById("prayerMemberName").value,
        email: document.getElementById("prayerMemberEmail").value,
        request: document.getElementById("prayerRequestText").value
    };

    try {
        const response = await fetch("/prayers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert("Prayer request submitted");
            await fetchDashboardCounts();
            await loadPrayers();
        }
    } catch (error) {
        console.error(error);
    }
}

// ===================================================
// MEMBERS MANAGEMENT
// ===================================================

async function loadMembers() {
    const container = document.getElementById("dashboardContent");
    container.innerHTML = `<div class="card"><h3>Loading Members...</h3></div>`;

    try {
        const response = await fetch("/members?t=" + Date.now());
        const members = await response.json();

        let html = `
            <div class="card">
                <h2>👥 FCC Members</h2>
                <hr>
                <table width="100%">
                    <tr>
                        <th>Member No</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Program</th>
                        <th>Year</th>
                        <th>Action</th>
                    </tr>
        `;

        const membersList = Array.isArray(members) ? members : (members.data || []);

        membersList.forEach((member) => {
            const resourceId = member.id || member._id;
            html += `
                <tr>
                    <td>${escapeHtml(member.memberNumber)}</td>
                    <td>${escapeHtml(member.firstName)} ${escapeHtml(member.lastName)}</td>
                    <td>${escapeHtml(member.email)}</td>
                    <td>${escapeHtml(member.programOfStudy)}</td>
                    <td>${escapeHtml(member.yearOfStudy)}</td>
                    <td>
                        <button class="btn" style="background:red; color:white;" onclick="deleteResource('/members/${resourceId}', loadMembers)">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `</table></div>`;
        container.innerHTML = html;
    } catch (error) {
        console.error(error);
    }
}

// ===================================================
// GLOBAL DELETE FUNCTION
// ===================================================

async function deleteResource(endpoint, callback) {
    if (!confirm("Are you sure you want to delete?")) return;

    try {
        const response = await fetch(endpoint, { method: "DELETE" });

        if (response.ok) {
            alert("Deleted successfully");
            await fetchDashboardCounts();
            await loadUpcomingActivities();
            if (callback) callback();
        } else {
            alert("Delete failed");
        }
    } catch (error) {
        console.error(error);
        alert("Server error");
    }
}

// ===================================================
// GLOBAL WINDOW EXPOSURES (CRITICAL FOR INLINE HTML)
// ===================================================
window.fetchDashboardCounts = fetchDashboardCounts;
window.loadUpcomingActivities = loadUpcomingActivities;
window.loadEvents = loadEvents;
window.renderAddEventForm = renderAddEventForm;
window.handleCreateEvent = handleCreateEvent;
window.loadBibleStudies = loadBibleStudies;
window.renderUploadForm = renderUploadForm;
window.handleStudyUpload = handleStudyUpload;
window.loadPrayers = loadPrayers;
window.renderAddPrayerForm = renderAddPrayerForm;
window.handleCreatePrayer = handleCreatePrayer;
window.loadMembers = loadMembers;
window.deleteResource = deleteResource;