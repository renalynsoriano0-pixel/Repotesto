const STORAGE_KEY = "grade12AttendanceTracker_v1";
const students = loadStudents();

const dateInput = document.getElementById("attendanceDate");
const form = document.getElementById("studentForm");
const tableBody = document.getElementById("studentTable");
const searchInput = document.getElementById("searchInput");
const notice = document.getElementById("notice");

function localDateString() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

dateInput.value = localDateString();

function loadStudents() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveStudents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
}

function statusFor(student, date = dateInput.value) {
  return (student.attendance && student.attendance[date]) || "Not marked";
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = students.filter(s =>
    [s.number, s.name, s.section].some(v => v.toLowerCase().includes(query))
  );

  tableBody.innerHTML = "";
  filtered.forEach(student => {
    const tr = document.createElement("tr");
    const numberCell = document.createElement("td");
    numberCell.textContent = student.number;
    const nameCell = document.createElement("td");
    nameCell.textContent = student.name;
    const sectionCell = document.createElement("td");
    sectionCell.textContent = student.section;

    const statusCell = document.createElement("td");
    const select = document.createElement("select");
    select.className = "status-select";
    ["Not marked", "Present", "Absent", "Late"].forEach(status => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status;
      select.appendChild(option);
    });
    select.value = statusFor(student);
    select.addEventListener("change", () => {
      if (!student.attendance) student.attendance = {};
      student.attendance[dateInput.value] = select.value;
      saveStudents();
      updateStats();
      notice.textContent = "Attendance updated for " + dateInput.value + ".";
    });
    statusCell.appendChild(select);

    const actionCell = document.createElement("td");
    const remove = document.createElement("button");
    remove.className = "delete-btn";
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      if (confirm("Remove " + student.name + " from the student roster?")) {
        const index = students.findIndex(s => s.id === student.id);
        if (index !== -1) students.splice(index, 1);
        saveStudents();
        render();
        notice.textContent = "Student removed.";
      }
    });
    actionCell.appendChild(remove);

    [numberCell, nameCell, sectionCell, statusCell, actionCell].forEach(cell => tr.appendChild(cell));
    tableBody.appendChild(tr);
  });

  document.getElementById("emptyMessage").style.display = filtered.length ? "none" : "block";
  updateStats();
}

function updateStats() {
  const counts = { Present: 0, Absent: 0, Late: 0 };
  students.forEach(student => {
    const status = statusFor(student);
    if (Object.prototype.hasOwnProperty.call(counts, status)) counts[status]++;
  });
  document.getElementById("totalCount").textContent = students.length;
  document.getElementById("presentCount").textContent = counts.Present;
  document.getElementById("absentCount").textContent = counts.Absent;
  document.getElementById("lateCount").textContent = counts.Late;
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const number = document.getElementById("studentNumber").value.trim();
  const name = document.getElementById("studentName").value.trim();
  const section = document.getElementById("studentSection").value.trim();

  if (students.some(s => s.number.toLowerCase() === number.toLowerCase())) {
    notice.textContent = "That student number already exists.";
    return;
  }

  students.push({
    id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
    number, name, section, attendance: {}
  });
  saveStudents();
  form.reset();
  render();
  notice.textContent = "Student added successfully.";
});

dateInput.addEventListener("change", () => {
  notice.textContent = "";
  render();
});
searchInput.addEventListener("input", render);

document.getElementById("saveButton").addEventListener("click", () => {
  saveStudents();
  notice.textContent = "Roster and attendance saved in this browser.";
});

document.getElementById("exportButton").addEventListener("click", () => {
  const date = dateInput.value;
  const rows = [["Date", "Student Number", "Student Name", "Section", "Status"]];
  students.forEach(s => rows.push([date, s.number, s.name, s.section, statusFor(s, date)]));
  const csv = rows.map(row => row.map(value =>
    '"' + String(value).replace(/"/g, '""') + '"'
  ).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "grade12-attendance-" + date + ".csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  notice.textContent = "CSV file exported.";
});

render();
