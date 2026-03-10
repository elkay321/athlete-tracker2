let athletes = JSON.parse(localStorage.getItem("athletes")) || [
  {
    name: "Riyad",
    program: "Limitless Strength",
    coach: "Karen",
    sessions: [
      {
        date: "2026-03-01",
        exercise: "Farmer Carry",
        weight: "15",
        reps: "",
        sets: "2",
        assistLevel: "Min verbal cues",
        notes: "Improved posture and trunk control"
      },
      {
        date: "2026-03-08",
        exercise: "Trap Bar Deadlift",
        weight: "35",
        reps: "5",
        sets: "3",
        assistLevel: "Modeling + verbal cues",
        notes: "Better setup than last week"
      }
    ]
  },
  {
    name: "Evan",
    program: "Teen Strength",
    coach: "Susan",
    sessions: [
      {
        date: "2026-03-03",
        exercise: "Plank Hold",
        weight: "",
        reps: "",
        sets: "3",
        assistLevel: "Independent",
        notes: "Held 20 seconds each round"
      }
    ]
  },
  {
    name: "Mia",
    program: "Limitless Strength",
    coach: "Karen",
    sessions: []
  }
];
let selectedAthleteIndex = null;

function saveToStorage() {
  localStorage.setItem("athletes", JSON.stringify(athletes));
}

function showAddAthleteForm() {
  document.getElementById("addAthleteSection").classList.remove("hidden");
}

function hideAddAthleteForm() {
  document.getElementById("addAthleteSection").classList.add("hidden");
  document.getElementById("newAthleteName").value = "";
  document.getElementById("newAthleteProgram").value = "";
  document.getElementById("newAthleteCoach").value = "";
}

function addAthlete() {
  const name = document.getElementById("newAthleteName").value.trim();
  const program = document.getElementById("newAthleteProgram").value.trim();
  const coach = document.getElementById("newAthleteCoach").value.trim();

  if (name === "") return;

  athletes.push({
    name,
    program,
    coach,
    sessions: []
  });

  saveToStorage();
  hideAddAthleteForm();
  renderSearchResults(name);
}

function renderSearchResults(searchTerm = "") {
  const resultsDiv = document.getElementById("searchResults");
  resultsDiv.innerHTML = "";

  const filtered = athletes.filter((athlete, index) =>
    athlete.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (filtered.length === 0 && searchTerm.trim() !== "") {
    resultsDiv.innerHTML = `<div class="search-item">No athlete found.</div>`;
    return;
  }

  if (searchTerm.trim() === "") {
    resultsDiv.innerHTML = "";
    return;
  }

  filtered.forEach((athlete) => {
    const actualIndex = athletes.findIndex(a => a.name === athlete.name && a.program === athlete.program && a.coach === athlete.coach);
    const div = document.createElement("div");
    div.className = "search-item";
    div.textContent = `${athlete.name}${athlete.program ? " — " + athlete.program : ""}`;
    div.onclick = () => openAthleteProfile(actualIndex);
    resultsDiv.appendChild(div);
  });
}

function openAthleteProfile(index) {
  selectedAthleteIndex = index;
  const athlete = athletes[index];

  document.getElementById("athleteProfileSection").classList.remove("hidden");
  document.getElementById("profileName").textContent = athlete.name;
  document.getElementById("profileMeta").textContent =
    `Program/Class: ${athlete.program || "Not entered"} | Coach: ${athlete.coach || "Not entered"}`;

  renderLastSession(index);
  renderHistory(index);

  const today = new Date().toISOString().split("T")[0];
  document.getElementById("sessionDate").value = today;
  document.getElementById("exerciseName").value = "";
  document.getElementById("weight").value = "";
  document.getElementById("reps").value = "";
  document.getElementById("sets").value = "";
  document.getElementById("assistLevel").value = "";
  document.getElementById("sessionNotes").value = "";
}

function renderLastSession(index) {
  const athlete = athletes[index];
  const summaryDiv = document.getElementById("lastSessionSummary");

  if (!athlete.sessions || athlete.sessions.length === 0) {
    summaryDiv.innerHTML = "No sessions recorded yet.";
    return;
  }

  const lastSession = athlete.sessions[athlete.sessions.length - 1];

  summaryDiv.innerHTML = `
    <p><strong>Date:</strong> ${lastSession.date || "-"}</p>
    <p><strong>Exercise:</strong> ${lastSession.exercise || "-"}</p>
    <p><strong>Weight:</strong> ${lastSession.weight || "-"}</p>
    <p><strong>Reps:</strong> ${lastSession.reps || "-"}</p>
    <p><strong>Sets:</strong> ${lastSession.sets || "-"}</p>
    <p><strong>Assist Level:</strong> ${lastSession.assistLevel || "-"}</p>
    <p><strong>Notes:</strong> ${lastSession.notes || "-"}</p>
  `;
}

function renderHistory(index) {
  const athlete = athletes[index];
  const historyBody = document.getElementById("historyBody");
  historyBody.innerHTML = "";

  if (!athlete.sessions || athlete.sessions.length === 0) {
    historyBody.innerHTML = `
      <tr>
        <td colspan="7">No session history yet.</td>
      </tr>
    `;
    return;
  }

  const sessionsNewestFirst = [...athlete.sessions].reverse();

  sessionsNewestFirst.forEach((session) => {
    const row = `
      <tr>
        <td>${session.date || ""}</td>
        <td>${session.exercise || ""}</td>
        <td>${session.weight || ""}</td>
        <td>${session.reps || ""}</td>
        <td>${session.sets || ""}</td>
        <td>${session.assistLevel || ""}</td>
        <td>${session.notes || ""}</td>
      </tr>
    `;
    historyBody.innerHTML += row;
  });
}

function saveSession() {
  if (selectedAthleteIndex === null) return;

  const date = document.getElementById("sessionDate").value;
  const exercise = document.getElementById("exerciseName").value.trim();
  const weight = document.getElementById("weight").value;
  const reps = document.getElementById("reps").value;
  const sets = document.getElementById("sets").value;
  const assistLevel = document.getElementById("assistLevel").value.trim();
  const notes = document.getElementById("sessionNotes").value.trim();

  if (exercise === "") return;

  athletes[selectedAthleteIndex].sessions.push({
    date,
    exercise,
    weight,
    reps,
    sets,
    assistLevel,
    notes
  });

  saveToStorage();
  openAthleteProfile(selectedAthleteIndex);
}

function exportCSV() {
  let csv = "Athlete Name,Program,Coach,Date,Exercise,Weight,Reps,Sets,Assist Level,Notes\n";

  athletes.forEach((athlete) => {
    if (!athlete.sessions || athlete.sessions.length === 0) {
      csv += `${wrapCSV(athlete.name)},${wrapCSV(athlete.program)},${wrapCSV(athlete.coach)},,,,,,\n`;
    } else {
      athlete.sessions.forEach((session) => {
        csv += [
          wrapCSV(athlete.name),
          wrapCSV(athlete.program),
          wrapCSV(athlete.coach),
          wrapCSV(session.date),
          wrapCSV(session.exercise),
          wrapCSV(session.weight),
          wrapCSV(session.reps),
          wrapCSV(session.sets),
          wrapCSV(session.assistLevel),
          wrapCSV(session.notes)
        ].join(",") + "\n";
      });
    }
  });

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

document.getElementById("athleteSearch").addEventListener("input", function () {
  renderSearchResults(this.value);

});
