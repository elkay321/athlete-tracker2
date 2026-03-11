// -----------------------------
// SUPABASE CONNECTION
// -----------------------------
const SUPABASE_URL = "https://yrfdiyjmxjfywymglsyp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_7xO5mtcWlTzBqVsGNnqfjg_lflSiEJX";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// -----------------------------
// GLOBAL STATE
// -----------------------------
let athletes = [];
let selectedAthleteIndex = null;
let selectedAthleteSessions = [];

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
    option.value = exercise.name;
    option.textContent = exercise.name;
    exerciseSelect.appendChild(option);
  });
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
    .map((row) => row.athletes)
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
        <td colspan="7">No session history yet.</td>
      </tr>
    `;
    return;
  }

  selectedAthleteSessions.forEach((session) => {
    const row = `
      <tr>
        <td>${session.session_date || ""}</td>
        <td>${session.exercise || ""}</td>
        <td>${session.weight || ""}</td>
        <td>${session.reps || ""}</td>
        <td>${session.sets || ""}</td>
        <td>${session.assist_level || ""}</td>
        <td>${session.notes || ""}</td>
      </tr>
    `;
    historyBody.innerHTML += row;
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

  const { error } = await supabaseClient
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

  if (error) {
    console.error("Error saving session:", error);
    alert("There was a problem saving the session.");
    return;
  }

  await openAthleteProfile(selectedAthleteIndex);

// Clear exercise fields for quick entry of next exercise
document.getElementById("exerciseName").value = "";
document.getElementById("weight").value = "";
document.getElementById("reps").value = "";
document.getElementById("sets").value = "";
document.getElementById("assistLevel").value = "";
document.getElementById("sessionNotes").value = "";

// Return cursor to search box so coach can move to next athlete
const searchBox = document.getElementById("athleteSearch");
searchBox.focus();
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

window.addEventListener("DOMContentLoaded", async () => {
  await loadAthletes();
  await loadExercises();
  await loadClasses();
});










