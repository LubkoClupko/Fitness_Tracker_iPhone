"use strict";

const state = {
  profile: null,
  dashboard: null,
  workout_sets: [],
  body_entries: [],
  plans: [],
  exercises: [],
  activePlan: "Fullbody A",
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const numberFormatter = new Intl.NumberFormat("sk-SK", { maximumFractionDigits: 1 });
const integerFormatter = new Intl.NumberFormat("sk-SK", { maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "short", year: "numeric" });
const weekdayFormatter = new Intl.DateTimeFormat("sk-SK", { weekday: "short", day: "numeric", month: "numeric" });

const planExerciseDefaults = {
  "Drep alebo leg press": "Drep",
  "Bench press alebo tlak s jednoručkami": "Bench press",
  "Sťahovanie kladky alebo zhyby": "Sťahovanie kladky",
  "Rumunský mŕtvy ťah": "Rumunský mŕtvy ťah",
  "Upažovanie": "Upažovanie",
  "Biceps zdvihy": "Biceps zdvihy",
  "Triceps kladka": "Triceps kladka",
  "Brucho": "Brucho",
  "Hip thrust alebo zakopávanie": "Hip thrust",
  "Incline bench alebo tlak na šikmej lavičke": "Incline bench",
  "Veslovanie na kladke alebo stroji": "Veslovanie kladka/stroj",
  "Bulharské drepy alebo výpady": "Bulharské drepy",
  "Tlaky na ramená": "Tlaky na ramená",
  "Zadné ramená / face pulls": "Face pulls",
  "Lýtka": "Lýtka",
  "Hacken drep / leg press / predkopávanie": "Hacken drep",
  "Chest press alebo asistované dipy": "Chest press",
  "Sťahovanie kladky nadhmatom/neutrálne": "Sťahovanie kladky",
  "RDL alebo back extensions": "Rumunský mŕtvy ťah",
  "Hammer curls": "Hammer curls",
  "Triceps nad hlavou alebo kladka": "Triceps nad hlavou",
  "Leg press alebo goblet squat": "Leg press",
  "Zakopávanie": "Zakopávanie",
  "Veslovanie stroj/jednoručka": "Veslovanie kladka/stroj",
  "Rozpažovanie / pec deck / ľahší tlak": "Pec deck",
  "Tlaky na ramená / machine press": "Machine shoulder press",
  "Zadné ramená": "Reverse pec deck",
  "Biceps + triceps superset": "Biceps zdvihy",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function localISODate(dateValue = new Date()) {
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const day = String(dateValue.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value) {
  return new Date(`${value}T00:00:00`);
}

function formatDate(value) {
  return value ? dateFormatter.format(parseLocalDate(value)) : "—";
}

function formatShortDate(value) {
  return value ? weekdayFormatter.format(parseLocalDate(value)) : "—";
}

function formatNumber(value, fallback = "—") {
  return value === null || value === undefined || Number.isNaN(Number(value)) ? fallback : numberFormatter.format(Number(value));
}

function formatInteger(value, fallback = "—") {
  return value === null || value === undefined || Number.isNaN(Number(value)) ? fallback : integerFormatter.format(Number(value));
}

function goalLabel(goal) {
  return { cut: "Redukcia", recomp: "Rekompozícia", bulk: "Naberanie" }[goal] || goal;
}

async function api(path, options = {}) {
  if (!window.FitnessStorage) throw new Error("Lokálne úložisko aplikácie sa nenačítalo.");
  return window.FitnessStorage.request(path, options);
}

let toastTimer;
function showToast(message, type = "success") {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.toggle("error", type === "error");
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function setLoading(loading) {
  $("#loading").classList.toggle("hidden", !loading);
}

async function loadData({ quiet = false } = {}) {
  if (!quiet) setLoading(true);
  try {
    Object.assign(state, await api("/api/bootstrap"));
    renderAll();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    if (!quiet) setLoading(false);
  }
}

function navigate(viewName) {
  const target = $(`#view-${viewName}`);
  if (!target) return;
  $$(".view").forEach((view) => view.classList.toggle("active", view === target));
  $$('[data-view]').forEach((button) => {
    if (button.classList.contains("nav-item") && !button.classList.contains("quick-add")) {
      button.classList.toggle("active", button.dataset.view === viewName);
    }
  });
  $("#page-title").textContent = target.dataset.title || "Forma";
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (viewName === "progress") requestAnimationFrame(renderProgress);
}

function renderAll() {
  renderProfile();
  renderDashboard();
  renderExerciseOptions();
  renderPlanPreview();
  renderWorkoutHistory();
  renderBodyHistory();
  renderProgress();
  renderPlan();
  fillProfileForm();
  updatePreviousSet();
  updateBodyPreview();
}

function renderProfile() {
  const profile = state.profile;
  if (!profile) return;
  $("#profile-name").textContent = profile.name;
  $("#profile-avatar").textContent = (profile.name.trim()[0] || "F").toUpperCase();
  $("#profile-goal").textContent = goalLabel(profile.goal);
  const today = new Date();
  $("#today-label").textContent = new Intl.DateTimeFormat("sk-SK", { weekday: "long", day: "numeric", month: "long" }).format(today);
}

function renderDashboard() {
  const d = state.dashboard;
  const profile = state.profile;
  if (!d || !profile) return;
  $("#hero-volume").textContent = formatInteger(d.seven_day_volume, "0");
  $("#metric-weight").textContent = formatNumber(d.latest_weight);
  $("#metric-calories").textContent = formatInteger(d.target_calories);
  $("#metric-tdee").textContent = formatInteger(d.tdee);
  $("#metric-bmr").textContent = `BMR ${formatInteger(d.bmr)} kcal`;
  $("#metric-sets").textContent = formatInteger(d.total_sets, "0");
  const latest = state.body_entries.find((entry) => entry.weight !== null);
  $("#metric-weight-note").textContent = latest ? `záznam ${formatDate(latest.date)}` : "Začiatočná hodnota";
  $("#metric-calories-note").textContent = `${goalLabel(profile.goal)} · ${profile.goal === "cut" ? "−300" : profile.goal === "bulk" ? "+200" : "±0"} kcal`;

  const today = state.body_entries.find((entry) => entry.date === d.today) || {};
  const protein = Number(today.protein_g || 0);
  const steps = Number(today.steps || 0);
  const calories = Number(today.calories_in || 0);
  setGoalProgress("protein", protein, Number(profile.protein_target), "g");
  setGoalProgress("steps", steps, Number(profile.steps_target), "");
  setGoalProgress("calorie", calories, Number(d.target_calories), "kcal");
  $("#goals-date").textContent = formatShortDate(d.today);

  const recent = state.workout_sets.slice(0, 4);
  const container = $("#dashboard-recent");
  if (!recent.length) {
    container.className = "activity-list empty-state";
    container.textContent = "Zatiaľ tu nie je žiadny tréning.";
    return;
  }
  container.className = "activity-list";
  container.innerHTML = recent.map((item) => {
    const parsed = parseLocalDate(item.date);
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = new Intl.DateTimeFormat("sk-SK", { month: "short" }).format(parsed).replace(".", "");
    return `<div class="activity-item">
      <div class="activity-date">${day}<br>${escapeHtml(month)}</div>
      <div><strong>${escapeHtml(item.exercise)}</strong><p>${escapeHtml(item.workout)} · séria ${item.set_no}</p></div>
      <div class="activity-value">${formatNumber(item.weight)} kg × ${formatInteger(item.reps)}</div>
    </div>`;
  }).join("");
}

function setGoalProgress(id, current, target, unit) {
  const safeTarget = target > 0 ? target : 1;
  const percentage = Math.min(100, Math.max(0, current / safeTarget * 100));
  $(`#${id}-progress`).style.width = `${percentage}%`;
  const suffix = unit ? ` ${unit}` : "";
  $(`#${id}-progress-label`).textContent = `${formatInteger(current, "0")} / ${formatInteger(target, "0")}${suffix}`;
}

function renderExerciseOptions() {
  $("#exercise-list").innerHTML = state.exercises.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");
}

function renderPlanPreview() {
  const workout = $("#workout-type").value || "Fullbody A";
  $("#plan-preview-title").textContent = workout;
  const plan = state.plans.filter((item) => item.workout === workout);
  const container = $("#plan-preview-list");
  if (!plan.length) {
    container.innerHTML = '<div class="empty-state">Pre tento tréning nie je pripravená šablóna.</div>';
    return;
  }
  container.innerHTML = plan.map((item, index) => `<button type="button" class="mini-plan-item" data-plan-exercise="${escapeHtml(item.exercise)}">
    <span class="mini-plan-index">${index + 1}</span>
    <span><strong>${escapeHtml(item.exercise)}</strong><small>${escapeHtml(item.note)}</small></span>
    <span>${item.sets} × ${escapeHtml(item.reps)}</span>
  </button>`).join("");
}

function workoutFilters() {
  return {
    query: $("#workout-search").value.trim().toLocaleLowerCase("sk"),
    workout: $("#workout-history-filter").value,
  };
}

function renderWorkoutHistory() {
  const { query, workout } = workoutFilters();
  const rows = state.workout_sets.filter((item) => {
    const matchesText = !query || item.exercise.toLocaleLowerCase("sk").includes(query) || item.notes.toLocaleLowerCase("sk").includes(query);
    return matchesText && (!workout || item.workout === workout);
  });
  const tbody = $("#workout-table");
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="10" class="table-empty">Žiadne série nezodpovedajú filtru.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.slice(0, 120).map((item) => `<tr>
    <td>${formatDate(item.date)}</td>
    <td><span class="workout-tag">${escapeHtml(item.workout)}</span></td>
    <td><strong>${escapeHtml(item.exercise)}</strong></td>
    <td>${item.set_no}</td>
    <td>${formatNumber(item.weight)} kg</td>
    <td>${item.reps}</td>
    <td>${item.rir ?? "—"}</td>
    <td>${formatNumber(item.volume)} kg</td>
    <td>${formatNumber(item.e1rm)} kg</td>
    <td><button class="delete-button" data-delete-set="${item.id}" aria-label="Odstrániť sériu"><svg><use href="#icon-trash"/></svg></button></td>
  </tr>`).join("");
}

function updatePreviousSet() {
  const exercise = $("#workout-exercise").value.trim();
  const dateValue = $("#workout-date").value;
  const workout = $("#workout-type").value;
  const sameSession = state.workout_sets.filter((item) => item.date === dateValue && item.workout === workout && item.exercise.toLocaleLowerCase("sk") === exercise.toLocaleLowerCase("sk"));
  const nextSet = sameSession.length ? Math.max(...sameSession.map((item) => item.set_no)) + 1 : 1;
  $("#workout-set").value = nextSet;
  const previous = state.workout_sets.find((item) => item.exercise.toLocaleLowerCase("sk") === exercise.toLocaleLowerCase("sk"));
  const note = $("#previous-set");
  if (!exercise) {
    note.textContent = "Vyber cvik a ukážeme ti posledný výkon.";
  } else if (!previous) {
    note.innerHTML = `<strong>${escapeHtml(exercise)}</strong> ešte nemá žiadny záznam. Začínaš novú históriu.`;
  } else {
    note.innerHTML = `Naposledy <strong>${formatDate(previous.date)}</strong>: ${formatNumber(previous.weight)} kg × ${previous.reps}, RIR ${previous.rir ?? "—"} · e1RM ${formatNumber(previous.e1rm)} kg.`;
  }
}

function renderBodyHistory() {
  const tbody = $("#body-table");
  if (!state.body_entries.length) {
    tbody.innerHTML = '<tr><td colspan="10" class="table-empty">Zatiaľ tu nie je žiadny denný záznam.</td></tr>';
    return;
  }
  tbody.innerHTML = state.body_entries.slice(0, 120).map((item) => {
    const netClass = item.net_kcal === null ? "" : item.net_kcal <= 0 ? "negative" : "positive";
    const net = item.net_kcal === null ? "—" : `${item.net_kcal > 0 ? "+" : ""}${formatInteger(item.net_kcal)} kcal`;
    return `<tr>
      <td><strong>${formatDate(item.date)}</strong></td>
      <td>${formatNumber(item.weight)} kg</td>
      <td>${formatNumber(item.waist)} cm</td>
      <td>${formatInteger(item.steps)}</td>
      <td>${formatInteger(item.calories_in)} kcal</td>
      <td>${formatInteger(item.protein_g)} g</td>
      <td>${formatNumber(item.sleep_h)} h</td>
      <td>${formatInteger(item.expenditure)} kcal</td>
      <td class="${netClass}">${net}</td>
      <td><button class="delete-button" data-delete-body="${item.id}" aria-label="Odstrániť denný záznam"><svg><use href="#icon-trash"/></svg></button></td>
    </tr>`;
  }).join("");
}

function updateBodyPreview() {
  if (!state.profile) return;
  const weight = Number($("#body-weight").value);
  const sauna = Number($("#body-sauna").value || 0);
  const preview = $("#body-calculation-preview");
  if (!weight) {
    preview.textContent = "Výdaj sa dopočíta po zadaní váhy.";
    return;
  }
  const p = state.profile;
  const base = 10 * weight + 6.25 * p.height_cm - 5 * p.age;
  const bmr = p.sex === "žena" ? base - 161 : base + 5;
  const saunaKcal = p.sauna_met * 3.5 * weight / 200 * sauna;
  const expenditure = bmr * p.activity_multiplier + saunaKcal;
  preview.textContent = `Odhad výdaja ${formatInteger(expenditure)} kcal · sauna ${formatInteger(saunaKcal, "0")} kcal`;
}

function renderProgress() {
  if (!state.profile) return;
  const sets = state.workout_sets;
  const bodies = [...state.body_entries].reverse();
  const best = sets.reduce((winner, item) => !winner || item.e1rm > winner.e1rm ? item : winner, null);
  $("#progress-best-e1rm").textContent = best ? formatNumber(best.e1rm) : "—";
  $("#progress-best-exercise").textContent = best ? best.exercise : "Bez dát";
  $("#progress-total-volume").textContent = formatInteger(sets.reduce((sum, item) => sum + item.volume, 0), "0");
  const weights = bodies.map((item) => item.weight).filter((value) => value !== null);
  $("#progress-avg-weight").textContent = weights.length ? formatNumber(weights.reduce((a, b) => a + b, 0) / weights.length) : "—";
  $("#progress-days").textContent = new Set(sets.map((item) => item.date)).size;

  renderPRTable();
  renderWeightChart(bodies);
  renderVolumeChart(sets);
  renderStrengthSelectorAndChart(sets);
}

function groupPRs() {
  const groups = new Map();
  state.workout_sets.forEach((item) => {
    const current = groups.get(item.exercise) || {
      exercise: item.exercise, best_e1rm: 0, max_weight: 0, max_reps: 0, sets: 0, volume: 0, last_trained: item.date,
    };
    current.best_e1rm = Math.max(current.best_e1rm, item.e1rm);
    current.max_weight = Math.max(current.max_weight, item.weight);
    current.max_reps = Math.max(current.max_reps, item.reps);
    current.sets += 1;
    current.volume += item.volume;
    if (item.date > current.last_trained) current.last_trained = item.date;
    groups.set(item.exercise, current);
  });
  return [...groups.values()].sort((a, b) => b.best_e1rm - a.best_e1rm);
}

function renderPRTable() {
  const records = groupPRs();
  const tbody = $("#pr-table");
  if (!records.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Rekordy sa zobrazia po prvom tréningu.</td></tr>';
    return;
  }
  tbody.innerHTML = records.map((record) => `<tr>
    <td><strong>${escapeHtml(record.exercise)}</strong></td>
    <td>${formatNumber(record.best_e1rm)} kg</td>
    <td>${formatNumber(record.max_weight)} kg</td>
    <td>${record.max_reps}</td>
    <td>${record.sets}</td>
    <td>${formatInteger(record.volume)} kg</td>
    <td>${formatDate(record.last_trained)}</td>
  </tr>`).join("");
}

function movingAverage(entries, index, days = 7) {
  const currentDate = parseLocalDate(entries[index].date);
  const lower = new Date(currentDate);
  lower.setDate(lower.getDate() - days + 1);
  const values = entries
    .filter((entry, candidateIndex) => candidateIndex <= index && entry.weight !== null)
    .filter((entry) => {
      const parsed = parseLocalDate(entry.date);
      return parsed >= lower && parsed <= currentDate;
    })
    .map((entry) => entry.weight);
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function renderWeightChart(entries) {
  const usable = entries.filter((entry) => entry.weight !== null);
  renderLineChart($("#weight-chart"), usable.map((entry) => entry.date), [
    { values: usable.map((entry) => entry.weight), className: "chart-line-primary", area: true },
    { values: usable.map((_, index) => movingAverage(usable, index)), className: "chart-line-secondary" },
  ], "Pridaj aspoň jeden záznam váhy.");
}

function mondayOf(dateString) {
  const parsed = parseLocalDate(dateString);
  const weekday = parsed.getDay() || 7;
  parsed.setDate(parsed.getDate() - weekday + 1);
  return localISODate(parsed);
}

function renderVolumeChart(sets) {
  const grouped = new Map();
  sets.forEach((item) => {
    const week = mondayOf(item.date);
    grouped.set(week, (grouped.get(week) || 0) + item.volume);
  });
  const rows = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12);
  renderBarChart($("#volume-chart"), rows.map(([label]) => label), rows.map(([, value]) => value), "Objem sa zobrazí po prvom tréningu.");
}

function renderStrengthSelectorAndChart(sets) {
  const select = $("#exercise-chart-select");
  const current = select.value;
  const counts = new Map();
  sets.forEach((item) => counts.set(item.exercise, (counts.get(item.exercise) || 0) + 1));
  const exercises = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b, "sk"));
  select.innerHTML = exercises.map((exercise) => `<option value="${escapeHtml(exercise)}">${escapeHtml(exercise)}</option>`).join("");
  if (current && exercises.includes(current)) select.value = current;
  renderStrengthChart();
}

function renderStrengthChart() {
  const exercise = $("#exercise-chart-select").value;
  const grouped = new Map();
  state.workout_sets.filter((item) => item.exercise === exercise).forEach((item) => {
    grouped.set(item.date, Math.max(grouped.get(item.date) || 0, item.e1rm));
  });
  const rows = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  renderLineChart($("#strength-chart"), rows.map(([label]) => label), [{ values: rows.map(([, value]) => value), className: "chart-line-primary", area: true }], "Vyber cvik s aspoň jednou sériou.");
}

let chartSequence = 0;
function renderLineChart(container, labels, series, emptyMessage) {
  const numeric = series.flatMap((item) => item.values).filter((value) => value !== null && Number.isFinite(Number(value))).map(Number);
  if (!labels.length || !numeric.length) {
    container.innerHTML = `<div class="chart-empty">${escapeHtml(emptyMessage)}</div>`;
    return;
  }
  const width = 700, height = 260, left = 48, right = 16, top = 15, bottom = 34;
  const innerWidth = width - left - right, innerHeight = height - top - bottom;
  let min = Math.min(...numeric), max = Math.max(...numeric);
  const padding = Math.max((max - min) * .15, Math.max(Math.abs(max) * .03, 1));
  min -= padding; max += padding;
  if (min === max) { min -= 1; max += 1; }
  const x = (index) => labels.length === 1 ? left + innerWidth / 2 : left + index / (labels.length - 1) * innerWidth;
  const y = (value) => top + (max - value) / (max - min) * innerHeight;
  const grid = [0, 1, 2, 3, 4].map((index) => {
    const yy = top + index / 4 * innerHeight;
    const value = max - index / 4 * (max - min);
    return `<line class="chart-grid-line" x1="${left}" y1="${yy}" x2="${width - right}" y2="${yy}"/><text x="${left - 8}" y="${yy + 3}" text-anchor="end">${escapeHtml(formatNumber(value))}</text>`;
  }).join("");
  const labelIndexes = [...new Set([0, Math.floor((labels.length - 1) / 2), labels.length - 1])];
  const xLabels = labelIndexes.map((index) => `<text x="${x(index)}" y="${height - 9}" text-anchor="middle">${escapeHtml(new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "numeric" }).format(parseLocalDate(labels[index])))}</text>`).join("");
  const id = `areaGradient${++chartSequence}`;
  const seriesSvg = series.map((item, seriesIndex) => {
    const points = item.values.map((value, index) => value === null ? null : [x(index), y(Number(value))]).filter(Boolean);
    if (!points.length) return "";
    const path = points.map(([px, py], index) => `${index ? "L" : "M"}${px.toFixed(2)},${py.toFixed(2)}`).join(" ");
    const area = item.area && points.length > 1 ? `<path class="chart-area" fill="url(#${id})" d="${path} L${points.at(-1)[0]},${top + innerHeight} L${points[0][0]},${top + innerHeight} Z"/>` : "";
    const dots = seriesIndex === 0 ? points.map(([px, py]) => `<circle class="chart-dot" cx="${px}" cy="${py}" r="3.5"/>`).join("") : "";
    return `${area}<path class="${item.className}" d="${path}"/>${dots}`;
  }).join("");
  container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Čiarový graf">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a6ef67" stop-opacity=".28"/><stop offset="1" stop-color="#a6ef67" stop-opacity="0"/></linearGradient></defs>
    ${grid}<line class="chart-axis-line" x1="${left}" y1="${top + innerHeight}" x2="${width - right}" y2="${top + innerHeight}"/>${xLabels}${seriesSvg}
  </svg>`;
}

function renderBarChart(container, labels, values, emptyMessage) {
  if (!labels.length || !values.length) {
    container.innerHTML = `<div class="chart-empty">${escapeHtml(emptyMessage)}</div>`;
    return;
  }
  const width = 700, height = 260, left = 48, right = 16, top = 15, bottom = 34;
  const innerWidth = width - left - right, innerHeight = height - top - bottom;
  const max = Math.max(...values, 1) * 1.12;
  const slot = innerWidth / values.length;
  const barWidth = Math.max(7, Math.min(34, slot * .58));
  const grid = [0, 1, 2, 3, 4].map((index) => {
    const yy = top + index / 4 * innerHeight;
    const value = max - index / 4 * max;
    return `<line class="chart-grid-line" x1="${left}" y1="${yy}" x2="${width - right}" y2="${yy}"/><text x="${left - 8}" y="${yy + 3}" text-anchor="end">${escapeHtml(formatInteger(value))}</text>`;
  }).join("");
  const bars = values.map((value, index) => {
    const barHeight = value / max * innerHeight;
    const xx = left + slot * index + (slot - barWidth) / 2;
    const yy = top + innerHeight - barHeight;
    return `<rect class="chart-bar" x="${xx}" y="${yy}" width="${barWidth}" height="${barHeight}" rx="5"><title>${formatDate(labels[index])}: ${formatInteger(value)} kg</title></rect>`;
  }).join("");
  const every = Math.max(1, Math.ceil(labels.length / 6));
  const xLabels = labels.map((label, index) => index % every === 0 || index === labels.length - 1 ? `<text x="${left + slot * index + slot / 2}" y="${height - 9}" text-anchor="middle">${escapeHtml(new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "numeric" }).format(parseLocalDate(label)))}</text>` : "").join("");
  container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Stĺpcový graf">${grid}${bars}${xLabels}</svg>`;
}

function renderPlan() {
  const workouts = [...new Set(state.plans.map((item) => item.workout))];
  if (!workouts.includes(state.activePlan)) state.activePlan = workouts[0] || "";
  $("#plan-tabs").innerHTML = workouts.map((workout) => `<button type="button" role="tab" aria-selected="${workout === state.activePlan}" class="${workout === state.activePlan ? "active" : ""}" data-plan-tab="${escapeHtml(workout)}">${escapeHtml(workout)}</button>`).join("");
  const rows = state.plans.filter((item) => item.workout === state.activePlan);
  $("#plan-board").innerHTML = rows.map((item, index) => `<article class="plan-item">
    <div class="plan-number">${String(index + 1).padStart(2, "0")}</div>
    <div><h3>${escapeHtml(item.exercise)}</h3><p>${escapeHtml(item.note)}</p></div>
    <div class="plan-prescription"><strong>${item.sets}×</strong><span>${escapeHtml(item.reps)} opak.</span></div>
  </article>`).join("");
}

function fillProfileForm() {
  const form = $("#profile-form");
  const p = state.profile;
  if (!form || !p) return;
  Object.entries(p).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value;
  });
}

function formPayload(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function saveBackupFile() {
  const payload = await window.FitnessStorage.exportBackup();
  const filename = `forma-zaloha-${localISODate()}.json`;
  const file = new File([JSON.stringify(payload, null, 2)], filename, { type: "application/json" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: "Záloha Forma", files: [file] });
      showToast("Záloha je pripravená na uloženie.");
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  showToast("Záloha bola stiahnutá.");
}

function updateInstallState() {
  const installed = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const card = $(".install-card");
  const status = $("#install-status");
  if (!card || !status) return;
  card.classList.toggle("installed", installed);
  status.textContent = installed ? "Nainštalované" : "V prehliadači";
  const note = $(".install-note", card);
  if (installed && note) note.textContent = "Forma je nainštalovaná a pripravená fungovať offline. Zálohu si pravidelne ukladaj do Súborov alebo iCloudu.";
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  try {
    await navigator.serviceWorker.register("./service-worker.js", { scope: "./" });
  } catch (error) {
    console.error("Registrácia offline režimu zlyhala:", error);
  }
}

function fillBodyFormForDate(dateValue) {
  const form = $("#body-form");
  const entry = state.body_entries.find((item) => item.date === dateValue);
  const fields = ["weight", "waist", "hips", "steps", "calories_in", "protein_g", "sleep_h", "sauna_min", "notes"];
  fields.forEach((field) => { form.elements[field].value = entry?.[field] ?? ""; });
  updateBodyPreview();
}

async function deleteSet(id) {
  if (!confirm("Odstrániť túto sériu?")) return;
  try {
    await api(`/api/workout-sets/${id}`, { method: "DELETE" });
    await loadData({ quiet: true });
    showToast("Séria bola odstránená.");
  } catch (error) { showToast(error.message, "error"); }
}

async function deleteBody(id) {
  if (!confirm("Odstrániť tento denný záznam?")) return;
  try {
    await api(`/api/body-entries/${id}`, { method: "DELETE" });
    await loadData({ quiet: true });
    showToast("Denný záznam bol odstránený.");
  } catch (error) { showToast(error.message, "error"); }
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) navigate(viewButton.dataset.view);

    const planExercise = event.target.closest("[data-plan-exercise]");
    if (planExercise) {
      const source = planExercise.dataset.planExercise;
      $("#workout-exercise").value = planExerciseDefaults[source] || source;
      updatePreviousSet();
      $("#workout-weight").focus();
    }

    const planTab = event.target.closest("[data-plan-tab]");
    if (planTab) { state.activePlan = planTab.dataset.planTab; renderPlan(); }

    const deleteSetButton = event.target.closest("[data-delete-set]");
    if (deleteSetButton) deleteSet(deleteSetButton.dataset.deleteSet);
    const deleteBodyButton = event.target.closest("[data-delete-body]");
    if (deleteBodyButton) deleteBody(deleteBodyButton.dataset.deleteBody);
  });

  $("#workout-type").addEventListener("change", () => { renderPlanPreview(); updatePreviousSet(); });
  $("#workout-exercise").addEventListener("input", updatePreviousSet);
  $("#workout-date").addEventListener("change", updatePreviousSet);
  $("#workout-search").addEventListener("input", renderWorkoutHistory);
  $("#workout-history-filter").addEventListener("change", renderWorkoutHistory);
  $("#exercise-chart-select").addEventListener("change", renderStrengthChart);
  $("#body-weight").addEventListener("input", updateBodyPreview);
  $("#body-sauna").addEventListener("input", updateBodyPreview);
  $("#body-date").addEventListener("change", (event) => fillBodyFormForDate(event.target.value));

  $("#export-data").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try { await saveBackupFile(); }
    catch (error) { showToast(error.message || "Zálohu sa nepodarilo vytvoriť.", "error"); }
    finally { button.disabled = false; }
  });

  $("#workout-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $("button[type=submit]", form);
    const payload = formPayload(form);
    button.disabled = true;
    try {
      await api("/api/workout-sets", { method: "POST", body: payload });
      const retained = { date: payload.date, workout: payload.workout, exercise: payload.exercise, weight: payload.weight };
      await loadData({ quiet: true });
      form.reset();
      $("#workout-date").value = retained.date;
      $("#workout-type").value = retained.workout;
      $("#workout-exercise").value = retained.exercise;
      $("#workout-weight").value = retained.weight;
      renderPlanPreview(); updatePreviousSet();
      $("#workout-reps").focus();
      showToast("Séria je uložená.");
    } catch (error) { showToast(error.message, "error"); }
    finally { button.disabled = false; }
  });

  $("#body-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $("button[type=submit]", form);
    button.disabled = true;
    try {
      await api("/api/body-entries", { method: "POST", body: formPayload(form) });
      const selectedDate = $("#body-date").value;
      await loadData({ quiet: true });
      fillBodyFormForDate(selectedDate);
      showToast("Denný záznam je uložený.");
    } catch (error) { showToast(error.message, "error"); }
    finally { button.disabled = false; }
  });

  $("#profile-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $("button[type=submit]", form);
    button.disabled = true;
    try {
      await api("/api/profile", { method: "POST", body: formPayload(form) });
      await loadData({ quiet: true });
      showToast("Profil je uložený.");
    } catch (error) { showToast(error.message, "error"); }
    finally { button.disabled = false; }
  });

  $("#restore-file").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!confirm("Obnova nahradí všetky aktuálne dáta obsahom zálohy. Pokračovať?")) { event.target.value = ""; return; }
    try {
      const payload = JSON.parse(await file.text());
      await api("/api/restore", { method: "POST", body: payload });
      await loadData({ quiet: true });
      showToast("Záloha bola obnovená.");
    } catch (error) { showToast(error.message || "Zálohu sa nepodarilo načítať.", "error"); }
    finally { event.target.value = ""; }
  });
}

function initializeDefaults() {
  const today = localISODate();
  $("#workout-date").value = today;
  $("#body-date").value = today;
}

document.addEventListener("DOMContentLoaded", async () => {
  initializeDefaults();
  bindEvents();
  updateInstallState();
  window.FitnessStorage.requestPersistentStorage();
  registerServiceWorker();
  await loadData();
});
