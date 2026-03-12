// -----------------------------
// SUPABASE CONNECTION
// -----------------------------
const SUPABASE_URL = "https://yrfdiyjmxjfywymglsyp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_7xO5mtcWlTzBqVsGNnqfjg_lflSiEJX";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

async function checkAuth() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error) {
    console.error("Auth check error:", error);
    showLoggedOut();
    return;
  }

  if (data && data.user) {
    showLoggedIn();
  } else {
    showLoggedOut();
  }
}

function showLoggedIn() {
  document.getElementById("authSection").style.display = "none";
  document.getElementById("appSection").style.display = "block";
}

function showLoggedOut() {
  document.getElementById("authSection").style.display = "block";
  document.getElementById("appSection").style.display = "none";
}

async function signIn() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const authMessage = document.getElementById("authMessage");

  authMessage.textContent = "";

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error("Sign in error:", error);
    authMessage.textContent = error.message;
    return;
  }

  await checkAuth();
  await loadAthletes();
  await loadExercises();
  await loadClasses();
}

async function signOut() {
  await supabaseClient.auth.signOut();
  showLoggedOut();
}

// -----------------------------
// GLOBAL STATE
// -----------------------------
let athletes = [];
let selectedAthleteIndex = null;
let selectedAthleteSessions = [];
let editingSessionId = null;

// -----------------------------
// LOAD ATHLETES FROM DATABASE
// -----------------------------
async function loadAthletes() {
  const { data, error } = await supabaseClient
    .from("athletes")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error loading athletes:", error);
    alert("There was a problem loading athletes.");
    return;
  }

  athletes = data || [];
}

async function loadExercises() {
  const { data, error } = await supabaseClient
    .from("exercises")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true });

console.log("Exercises query result:", data);
console.log("Exercises query error:", error);  
  
  if (error) {
    console.error("Error loading exercises:", error);
    return;
  }

  const exerciseSelect = document.getElementById("exerciseName");
  exerciseSelect.innerHTML = `<option value="">Select exercise</option>`;

  (data || []).forEach((exercise) => {
  const option = document.createElement("option");
  option.value = exercise.id;
  option.textContent = exercise.name;
  option.dataset.exerciseName = exercise.name;
  exerciseSelect.appendChild(option);
});
}

// -----------------------------
// LOAD LAST EXERCISE SESSION
// -----------------------------

async function loadLastExerciseSession(exerciseName) {

  if (selectedAthleteIndex === null) return;

  const athlete = athletes[selectedAthleteIndex];
  if (!athlete || !exerciseName) return;

  const { data, error } = await supabaseClient
    .from("sessions")
    .select("*")
    .eq("athlete_id", athlete.id)
    .eq("exercise", exerciseName)
    .order("session_date", { ascending: false })
    .limit(1);

  const summaryDiv = document.getElementById("lastSessionSummary");

  if (error) {
    console.error("Error loading exercise history:", error);
    return;
  }

  if (!data || data.length === 0) {
    summaryDiv.innerHTML = `No previous record for ${exerciseName}.`;
    return;
  }

  const session = data[0];

  summaryDiv.innerHTML = `
    <p><strong>Last ${exerciseName}</strong></p>
    <p><strong>Date:</strong> ${session.session_date || "-"}</p>
    <p><strong>Weight:</strong> ${session.weight || "-"}</p>
    <p><strong>Reps:</strong> ${session.reps || "-"}</p>
    <p><strong>Sets:</strong> ${session.sets || "-"}</p>
    <p><strong>Assist Level:</strong> ${session.assist_level || "-"}</p>
    <p><strong>Notes:</strong> ${session.notes || "-"}</p>
  `;
}

// -----------------------------
// LOAD CLASSES
// -----------------------------
async function loadClasses() {
  const { data, error } = await supabaseClient
    .from("classes")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error loading classes:", error);
    return;
  }

  const classSelect = document.getElementById("classSelect");
  classSelect.innerHTML = `<option value="">Select class</option>`;

  (data || []).forEach((cls) => {
    const option = document.createElement("option");
    option.value = cls.id;
    option.textContent = cls.name;
    classSelect.appendChild(option);
  });
}

// -----------------------------
// LOAD CLASS ROSTER
// -----------------------------
async function loadClassRoster(classId) {
  const rosterDiv = document.getElementById("classRoster");
  rosterDiv.innerHTML = "";

  if (!classId) return;

  const { data, error } = await supabaseClient
    .from("athlete_classes")
    .select(`
      athlete_id,
      athletes (
        id,
        name,
        program,
        coach
      )
    `)
    .eq("class_id", classId);

  console.log("Class roster query result:", data);
  console.log("Class roster query error:", error);

  if (error) {
    console.error("Error loading class roster:", error);
    rosterDiv.innerHTML = `<div class="search-item">Could not load roster.</div>`;
    return;
  }

  if (!data || data.length === 0) {
    rosterDiv.innerHTML = `<div class="search-item">No athletes assigned to this class.</div>`;
    return;
  }

  const sortedAthletes = data
    .map((row) => Array.isArray(row.athletes) ? row.athletes[0] : row.athletes)
    .filter(Boolean)
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  sortedAthletes.forEach((athlete) => {
    const div = document.createElement("div");
    div.className = "search-item";
    div.textContent = `${athlete.name}${athlete.program ? " — " + athlete.program : ""}`;

    div.onclick = async () => {
      let actualIndex = athletes.findIndex((a) => a.id === athlete.id);

      if (actualIndex === -1) {
        athletes.push(athlete);
        actualIndex = athletes.length - 1;
      }

      await openAthleteProfile(actualIndex);

      // Optional: keep class roster visible, but clear search
      const searchBox = document.getElementById("athleteSearch");
      const resultsDiv = document.getElementById("searchResults");
      searchBox.value = "";
      resultsDiv.innerHTML = "";
    };

    rosterDiv.appendChild(div);
  });
}


// -----------------------------
// LOAD SESSIONS
// -----------------------------
async function loadSessionsForAthlete(athleteId) {
  const { data, error } = await supabaseClient
    .from("sessions")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading sessions:", error);
    selectedAthleteSessions = [];
    return;
  }

  selectedAthleteSessions = data || [];
}

// -----------------------------
// UI HELPERS
// -----------------------------
function showAddAthleteForm() {
  document.getElementById("addAthleteSection").classList.remove("hidden");
}

function hideAddAthleteForm() {
  document.getElementById("addAthleteSection").classList.add("hidden");
  document.getElementById("newAthleteName").value = "";
  document.getElementById("newAthleteProgram").value = "";
  document.getElementById("newAthleteCoach").value = "";
}

// -----------------------------
// ATHLETES
// -----------------------------
async function addAthlete() {
  const name = document.getElementById("newAthleteName").value.trim();
  const program = document.getElementById("newAthleteProgram").value.trim();
  const coach = document.getElementById("newAthleteCoach").value.trim();

  if (name === "") return;

  const { error } = await supabaseClient
    .from("athletes")
    .insert([
      {
        name: name,
        program: program || null,
        coach: coach || null
      }
    ]);

  if (error) {
    console.error("Error adding athlete:", error);
    alert("There was a problem saving the athlete.");
    return;
  }

  await loadAthletes();
  hideAddAthleteForm();
  await renderSearchResults(name);
}

async function renderSearchResults(searchTerm = "") {
  const resultsDiv = document.getElementById("searchResults");
  resultsDiv.innerHTML = "";

  if (searchTerm.trim().length < 2) {
    return;
  }

  const { data, error } = await supabaseClient
    .from("athletes")
    .select("*")
    .ilike("name", `${searchTerm}%`)
    .order("name", { ascending: true })
    .limit(10);

  if (error) {
    console.error("Error searching athletes:", error);
    resultsDiv.innerHTML = `<div class="search-item">Search error.</div>`;
    return;
  }

  if (!data || data.length === 0) {
    resultsDiv.innerHTML = `<div class="search-item">No athlete found.</div>`;
    return;
  }

  data.forEach((athlete) => {
    const div = document.createElement("div");
    div.className = "search-item";
    div.textContent = `${athlete.name}${athlete.program ? " — " + athlete.program : ""}`;

div.onclick = async () => {
  let actualIndex = athletes.findIndex((a) => a.id === athlete.id);

  if (actualIndex === -1) {
    athletes.push(athlete);
    actualIndex = athletes.length - 1;
  }

  await openAthleteProfile(actualIndex);

  // Clear search box and results for next athlete
  const searchBox = document.getElementById("athleteSearch");
  const resultsDiv = document.getElementById("searchResults");

  searchBox.value = "";
  resultsDiv.innerHTML = "";

  // Put cursor back in search box
  searchBox.focus();
};

    resultsDiv.appendChild(div);
  });
}

async function openAthleteProfile(index) {
  selectedAthleteIndex = index;
  const athlete = athletes[index];

  if (!athlete) return;

  await loadSessionsForAthlete(athlete.id);

  document.getElementById("athleteProfileSection").classList.remove("hidden");
  document.getElementById("profileName").textContent = athlete.name;
  document.getElementById("profileMeta").textContent =
    `Program/Class: ${athlete.program || "Not entered"} | Coach: ${athlete.coach || "Not entered"}`;
  
  document.getElementById("sessionFormTitle").textContent = `Add New Session for ${athlete.name}`;
  
  document.getElementById("athleteTriggers").value = athlete.triggers || "";
  document.getElementById("athletePreferences").value = athlete.preferences || "";
  document.getElementById("athleteCommunicationStyle").value = athlete.communication_style || "";
  
  renderLastSession();
  renderHistory();

  const today = new Date().toISOString().split("T")[0];
  document.getElementById("sessionDate").value = today;
  document.getElementById("exerciseName").value = "";
  document.getElementById("weight").value = "";
  document.getElementById("reps").value = "";
  document.getElementById("sets").value = "";
  document.getElementById("assistLevel").value = "";
  document.getElementById("sessionNotes").value = "";
}

function renderLastSession() {
  const summaryDiv = document.getElementById("lastSessionSummary");

  if (!selectedAthleteSessions || selectedAthleteSessions.length === 0) {
    summaryDiv.innerHTML = "No sessions recorded yet.";
    return;
  }

  const lastSession = selectedAthleteSessions[0];

  summaryDiv.innerHTML = `
    <p><strong>Date:</strong> ${lastSession.session_date || "-"}</p>
    <p><strong>Exercise:</strong> ${lastSession.exercise || "-"}</p>
    <p><strong>Weight:</strong> ${lastSession.weight || "-"}</p>
    <p><strong>Reps:</strong> ${lastSession.reps || "-"}</p>
    <p><strong>Sets:</strong> ${lastSession.sets || "-"}</p>
    <p><strong>Assist Level:</strong> ${lastSession.assist_level || "-"}</p>
    <p><strong>Notes:</strong> ${lastSession.notes || "-"}</p>
  `;
}

function renderHistory() {

  const historyBody = document.getElementById("historyBody");
  historyBody.innerHTML = "";

  if (!selectedAthleteSessions || selectedAthleteSessions.length === 0) {
    historyBody.innerHTML = `
      <tr>
        <td colspan="9">No session history yet.</td>
      </tr>
    `;
    return;
  }

  selectedAthleteSessions.forEach((session) => {

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${session.session_date || ""}</td>
      <td>${session.exercise || ""}</td>
      <td>${session.weight || ""}</td>
      <td>${session.reps || ""}</td>
      <td>${session.sets || ""}</td>
      <td>${session.assist_level || ""}</td>
      <td>${session.notes || ""}</td>

      <td><button class="edit-session-btn">Edit</button></td>
      <td><button class="delete-session-btn">Delete</button></td>
    `;

    const editButton = row.querySelector(".edit-session-btn");
    const deleteButton = row.querySelector(".delete-session-btn");

    editButton.addEventListener("click", async () => {
      await editSession(session.id);
    });

    deleteButton.addEventListener("click", async () => {
      await deleteSession(session.id);
    });

    historyBody.appendChild(row);

  });
}

// -----------------------------
// SESSIONS
// -----------------------------
async function saveSession() {
  if (selectedAthleteIndex === null) return;

  const athlete = athletes[selectedAthleteIndex];
  if (!athlete) return;

  const date = document.getElementById("sessionDate").value;
  const exercise = document.getElementById("exerciseName").value.trim();
  const weightRaw = document.getElementById("weight").value;
  const repsRaw = document.getElementById("reps").value;
  const setsRaw = document.getElementById("sets").value;
  const assistLevel = document.getElementById("assistLevel").value.trim();
  const notes = document.getElementById("sessionNotes").value.trim();

  if (exercise === "") return;

  let error;

  if (editingSessionId) {
    const result = await supabaseClient
      .from("sessions")
      .update({
        athlete_id: athlete.id,
        session_date: date || null,
        exercise: exercise,
        weight: weightRaw === "" ? null : Number(weightRaw),
        reps: repsRaw === "" ? null : Number(repsRaw),
        sets: setsRaw === "" ? null : Number(setsRaw),
        assist_level: assistLevel || null,
        notes: notes || null
      })
      .eq("id", editingSessionId);

    error = result.error;
  } else {
    const result = await supabaseClient
      .from("sessions")
      .insert([
        {
          athlete_id: athlete.id,
          session_date: date || null,
          exercise: exercise,
          weight: weightRaw === "" ? null : Number(weightRaw),
          reps: repsRaw === "" ? null : Number(repsRaw),
          sets: setsRaw === "" ? null : Number(setsRaw),
          assist_level: assistLevel || null,
          notes: notes || null
        }
      ]);

    error = result.error;
  }

  if (error) {
    console.error("Error saving session:", error);
    alert("There was a problem saving the session.");
    return;
  }

   const wasEditing = !!editingSessionId;

  editingSessionId = null;
  document.getElementById("cancelEditBtn").style.display = "none";

  await openAthleteProfile(selectedAthleteIndex);

  document.getElementById("sessionFormTitle").textContent =
    `Add New Session for ${athletes[selectedAthleteIndex].name}`;

  // Clear exercise fields for quick entry of next exercise
  document.getElementById("exerciseName").value = "";
  document.getElementById("weight").value = "";
  document.getElementById("reps").value = "";
  document.getElementById("sets").value = "";
  document.getElementById("assistLevel").value = "";
  document.getElementById("sessionNotes").value = "";

  // Keep user near the relevant section
  if (wasEditing) {
    document.getElementById("historyTable").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  } else {
    document.getElementById("sessionFormTitle").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

// Trigger section
async function saveAthleteProfileNotes() {
  if (selectedAthleteIndex === null) return;

  const athlete = athletes[selectedAthleteIndex];
  if (!athlete) return;

  const triggers = document.getElementById("athleteTriggers").value.trim();
  const preferences = document.getElementById("athletePreferences").value.trim();
  const communicationStyle = document.getElementById("athleteCommunicationStyle").value.trim();

  const { error } = await supabaseClient
    .from("athletes")
    .update({
      triggers: triggers || null,
      preferences: preferences || null,
      communication_style: communicationStyle || null
    })
    .eq("id", athlete.id);

  if (error) {
    console.error("Error saving athlete support profile:", error);
    alert("There was a problem saving the support profile.");
    return;
  }

  athletes[selectedAthleteIndex].triggers = triggers || null;
  athletes[selectedAthleteIndex].preferences = preferences || null;
  athletes[selectedAthleteIndex].communication_style = communicationStyle || null;
}

// -----------------------------
// EXPORT
// -----------------------------
async function exportCSV() {
  let csv = "Athlete Name,Program,Coach,Date,Exercise,Weight,Reps,Sets,Assist Level,Notes\n";

  for (const athlete of athletes) {
    const { data: sessions, error } = await supabaseClient
      .from("sessions")
      .select("*")
      .eq("athlete_id", athlete.id)
      .order("session_date", { ascending: true });

    if (error) {
      console.error(`Error exporting sessions for ${athlete.name}:`, error);
      continue;
    }

    if (!sessions || sessions.length === 0) {
      csv += `${wrapCSV(athlete.name)},${wrapCSV(athlete.program)},${wrapCSV(athlete.coach)},,,,,,\n`;
    } else {
      sessions.forEach((session) => {
        csv += [
          wrapCSV(athlete.name),
          wrapCSV(athlete.program),
          wrapCSV(athlete.coach),
          wrapCSV(session.session_date),
          wrapCSV(session.exercise),
          wrapCSV(session.weight),
          wrapCSV(session.reps),
          wrapCSV(session.sets),
          wrapCSV(session.assist_level),
          wrapCSV(session.notes)
        ].join(",") + "\n";
      });
    }
  }

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "athlete_progress_tracker.csv";
  link.click();
}

function wrapCSV(value) {
  const safeValue = value ?? "";
  return `"${String(safeValue).replace(/"/g, '""')}"`;
}

// -----------------------------
// EVENTS
// -----------------------------
document.getElementById("athleteSearch").addEventListener("input", async function () {
  await renderSearchResults(this.value);
});

document.getElementById("classSelect").addEventListener("change", async function () {
  await loadClassRoster(this.value);
});

document.getElementById("exerciseName").addEventListener("change", async function () {
  await loadLastExerciseSession(this.value);
});

window.addEventListener("DOMContentLoaded", async () => {
  await checkAuth();

  const { data } = await supabaseClient.auth.getUser();

  if (data && data.user) {
    await loadAthletes();
    await loadExercises();
    await loadClasses();
  }
});

// -----------------------------
// EDIT AND DELETE FUNCTIONALITY
// -----------------------------

async function deleteSession(sessionId) {
  const confirmDelete = confirm("Delete this session?");
  if (!confirmDelete) return;

  const { error } = await supabaseClient
    .from("sessions")
    .delete()
    .eq("id", sessionId);

  if (error) {
    console.error("Delete error:", error);
    alert("Could not delete session.");
    return;
  }

  editingSessionId = null;

  await openAthleteProfile(selectedAthleteIndex);

  document.getElementById("sessionFormTitle").textContent =
    `Add New Session for ${athletes[selectedAthleteIndex].name}`;

  document.getElementById("historyTable").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

//EDIT

async function editSession(sessionId) {
  const session = selectedAthleteSessions.find(s => s.id === sessionId);
  if (!session) return;

  editingSessionId = session.id;

  document.getElementById("cancelEditBtn").style.display = "inline-block";

  document.getElementById("sessionDate").value = session.session_date || "";
  document.getElementById("exerciseName").value = session.exercise || "";
  document.getElementById("weight").value = session.weight || "";
  document.getElementById("reps").value = session.reps || "";
  document.getElementById("sets").value = session.sets || "";
  document.getElementById("assistLevel").value = session.assist_level || "";
  document.getElementById("sessionNotes").value = session.notes || "";

  document.getElementById("sessionFormTitle").textContent =
    `Editing Session for ${athletes[selectedAthleteIndex].name}`;

  // Keep the user near the form
  document.getElementById("sessionFormTitle").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// Cancel edit functionality
function cancelEdit() {

  editingSessionId = null;

  document.getElementById("sessionFormTitle").textContent =
    `Add New Session for ${athletes[selectedAthleteIndex].name}`;

  document.getElementById("exerciseName").value = "";
  document.getElementById("weight").value = "";
  document.getElementById("reps").value = "";
  document.getElementById("sets").value = "";
  document.getElementById("assistLevel").value = "";
  document.getElementById("sessionNotes").value = "";

  document.getElementById("cancelEditBtn").style.display = "none";

  document.getElementById("sessionFormTitle").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}






















