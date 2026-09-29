"use strict";

(() => {
  const DB_NAME = "forma-fitness-tracker";
  const DB_VERSION = 1;
  const STORE_NAME = "app-data";
  const DATA_KEY = "primary";
  const BACKUP_FORMAT = "fitness-tracker-backup";
  const BACKUP_VERSION = 1;

  const PROFILE_SEED = {
    id: 1,
    name: "Používateľ",
    sex: "muž",
    start_weight: 75,
    height_cm: 175,
    age: 30,
    activity_multiplier: 1.55,
    goal: "recomp",
    sauna_met: 1.5,
    protein_target: 150,
    steps_target: 8000,
  };

  const PLAN_SEED = [
    ["Pondelok", "Fullbody A", "Drep alebo leg press", 3, "6–10", "Kvadricepsy, zadok, základ sily"],
    ["Pondelok", "Fullbody A", "Bench press alebo tlak s jednoručkami", 3, "6–10", "Prsia, triceps, predné ramená"],
    ["Pondelok", "Fullbody A", "Sťahovanie kladky alebo zhyby", 3, "8–12", "Šírka chrbta, V-tvar"],
    ["Pondelok", "Fullbody A", "Rumunský mŕtvy ťah", 2, "8–12", "Hamstringy, zadok, spodný chrbát"],
    ["Pondelok", "Fullbody A", "Upažovanie", 3, "12–20", "Bočné ramená"],
    ["Pondelok", "Fullbody A", "Biceps zdvihy", 2, "10–15", "Kontrolovane"],
    ["Pondelok", "Fullbody A", "Triceps kladka", 2, "10–15", "Kontrolovane"],
    ["Pondelok", "Fullbody A", "Brucho", 2, "podľa cviku", "Plank alebo zdvihy nôh"],
    ["Utorok", "Fullbody B", "Hip thrust alebo zakopávanie", 3, "8–12", "Zadok a hamstringy"],
    ["Utorok", "Fullbody B", "Incline bench alebo tlak na šikmej lavičke", 3, "8–12", "Vrchné prsia, ramená"],
    ["Utorok", "Fullbody B", "Veslovanie na kladke alebo stroji", 3, "8–12", "Hrúbka chrbta"],
    ["Utorok", "Fullbody B", "Bulharské drepy alebo výpady", 2, "8–12/noha", "Stabilita, nohy, zadok"],
    ["Utorok", "Fullbody B", "Tlaky na ramená", 2, "6–10", "Neprehýbaj spodný chrbát"],
    ["Utorok", "Fullbody B", "Zadné ramená / face pulls", 3, "12–20", "Držanie tela"],
    ["Utorok", "Fullbody B", "Lýtka", 3, "10–20", "Plný rozsah"],
    ["Štvrtok", "Fullbody C", "Hacken drep / leg press / predkopávanie", 3, "8–12", "Kvadricepsy"],
    ["Štvrtok", "Fullbody C", "Chest press alebo asistované dipy", 3, "8–12", "Prsia, triceps"],
    ["Štvrtok", "Fullbody C", "Sťahovanie kladky nadhmatom/neutrálne", 3, "8–12", "Latissimy"],
    ["Štvrtok", "Fullbody C", "RDL alebo back extensions", 2, "8–12", "Zadný reťazec"],
    ["Štvrtok", "Fullbody C", "Upažovanie", 3, "12–20", "Bočné ramená"],
    ["Štvrtok", "Fullbody C", "Hammer curls", 3, "10–15", "Biceps a predlaktia"],
    ["Štvrtok", "Fullbody C", "Triceps nad hlavou alebo kladka", 3, "10–15", "Dlhá hlava tricepsu"],
    ["Štvrtok", "Fullbody C", "Brucho", 2, "podľa cviku", "Kontrolovane"],
    ["Piatok", "Fullbody D", "Leg press alebo goblet squat", 3, "10–15", "Ľahšie, technicky čisto"],
    ["Piatok", "Fullbody D", "Zakopávanie", 3, "10–15", "Hamstringy"],
    ["Piatok", "Fullbody D", "Veslovanie stroj/jednoručka", 3, "8–12", "Lopatky dozadu"],
    ["Piatok", "Fullbody D", "Rozpažovanie / pec deck / ľahší tlak", 2, "10–15", "Prsia bez prehnanej únavy"],
    ["Piatok", "Fullbody D", "Tlaky na ramená / machine press", 2, "8–12", "Stredne ťažko"],
    ["Piatok", "Fullbody D", "Zadné ramená", 3, "12–20", "Kvalitná kontrola"],
    ["Piatok", "Fullbody D", "Biceps + triceps superset", 3, "10–15 každý", "Pumpa, krátke pauzy"],
    ["Piatok", "Fullbody D", "Lýtka", 3, "10–20", "Plný rozsah"],
  ];

  const EXERCISES_SEED = [
    "Drep", "Leg press", "Bench press", "Tlak s jednoručkami", "Sťahovanie kladky", "Zhyby",
    "Rumunský mŕtvy ťah", "Upažovanie", "Biceps zdvihy", "Triceps kladka", "Hip thrust",
    "Zakopávanie", "Incline bench", "Veslovanie kladka/stroj", "Bulharské drepy", "Výpady",
    "Tlaky na ramená", "Face pulls", "Reverse pec deck", "Lýtka", "Hacken drep", "Predkopávanie",
    "Chest press", "Dipy asistované", "Back extensions", "Hammer curls", "Triceps nad hlavou",
    "Goblet squat", "Pec deck", "Rozpažovanie", "Machine shoulder press", "Brucho",
  ];

  let databasePromise;

  function clone(value) {
    return typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function localISODate(dateValue = new Date()) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, "0");
    const day = String(dateValue.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function initialData() {
    const timestamp = nowIso();
    return {
      profile: { ...PROFILE_SEED, updated_at: timestamp },
      exercises: EXERCISES_SEED.map((name, index) => ({ id: index + 1, name })),
      plans: PLAN_SEED.map(([day_name, workout, exercise, sets, reps, note], index) => ({
        id: index + 1,
        day_name,
        workout,
        exercise,
        sets,
        reps,
        note,
        sort_order: index + 1,
      })),
      workout_sets: [],
      body_entries: [],
      next_ids: { workout_set: 1, body_entry: 1, exercise: EXERCISES_SEED.length + 1 },
    };
  }

  function openDatabase() {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in globalThis)) {
        reject(new Error("Tento prehliadač nepodporuje lokálne úložisko IndexedDB."));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "key" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Lokálne úložisko sa nepodarilo otvoriť."));
      request.onblocked = () => reject(new Error("Aktualizáciu úložiska blokuje iné otvorené okno aplikácie."));
    });
    return databasePromise;
  }

  async function readData() {
    const db = await openDatabase();
    const record = await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(DATA_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    if (record?.value) return clone(record.value);
    const seeded = initialData();
    await writeData(seeded);
    return clone(seeded);
  }

  async function writeData(data) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put({ key: DATA_KEY, value: clone(data) });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("Dáta sa nepodarilo uložiť."));
      transaction.onabort = () => reject(transaction.error || new Error("Ukladanie dát bolo prerušené."));
    });
  }

  function cleanText(value, label, maximum = 160, required = true) {
    const result = String(value ?? "").trim();
    if (required && !result) throw new Error(`Pole „${label}“ je povinné.`);
    if (result.length > maximum) throw new Error(`Pole „${label}“ môže mať najviac ${maximum} znakov.`);
    return result;
  }

  function cleanNumber(value, label, minimum, maximum, required = true) {
    if (value === null || value === undefined || value === "") {
      if (required) throw new Error(`Pole „${label}“ je povinné.`);
      return null;
    }
    const result = Number(value);
    if (!Number.isFinite(result)) throw new Error(`Pole „${label}“ musí byť číslo.`);
    if (minimum !== undefined && result < minimum) throw new Error(`Pole „${label}“ musí byť aspoň ${minimum}.`);
    if (maximum !== undefined && result > maximum) throw new Error(`Pole „${label}“ môže byť najviac ${maximum}.`);
    return result;
  }

  function cleanInteger(value, label, minimum, maximum, required = true) {
    const result = cleanNumber(value, label, minimum, maximum, required);
    if (result !== null && !Number.isInteger(result)) throw new Error(`Pole „${label}“ musí byť celé číslo.`);
    return result;
  }

  function cleanDate(value) {
    const result = String(value ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) throw new Error("Dátum musí byť vo formáte RRRR-MM-DD.");
    const parsed = new Date(`${result}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== result) {
      throw new Error("Dátum nie je platný.");
    }
    return result;
  }

  function cleanProfile(payload) {
    const profile = {
      id: 1,
      name: cleanText(payload.name, "Meno", 80),
      sex: cleanText(payload.sex, "Pohlavie", 10),
      start_weight: cleanNumber(payload.start_weight, "Začiatočná váha", 25, 400),
      height_cm: cleanNumber(payload.height_cm, "Výška", 100, 250),
      age: cleanInteger(payload.age, "Vek", 13, 120),
      activity_multiplier: cleanNumber(payload.activity_multiplier, "Koeficient aktivity", 1, 2.5),
      goal: cleanText(payload.goal, "Cieľ", 10),
      sauna_met: cleanNumber(payload.sauna_met, "Sauna MET", 0.5, 10),
      protein_target: cleanNumber(payload.protein_target, "Cieľ proteínu", 0, 500),
      steps_target: cleanInteger(payload.steps_target, "Cieľ krokov", 0, 100000),
      updated_at: nowIso(),
    };
    if (!["muž", "žena"].includes(profile.sex)) throw new Error("Pohlavie musí byť muž alebo žena.");
    if (!["cut", "recomp", "bulk"].includes(profile.goal)) throw new Error("Cieľ musí byť redukcia, rekompozícia alebo naberanie.");
    return profile;
  }

  function cleanWorkout(payload) {
    return {
      date: cleanDate(payload.date),
      workout: cleanText(payload.workout, "Tréning", 60),
      exercise: cleanText(payload.exercise, "Cvik", 120),
      set_no: cleanInteger(payload.set_no, "Číslo série", 1, 100),
      weight: cleanNumber(payload.weight, "Váha", 0, 1000),
      reps: cleanInteger(payload.reps, "Opakovania", 1, 1000),
      rir: cleanNumber(payload.rir, "RIR", 0, 10, false),
      notes: cleanText(payload.notes, "Poznámka", 500, false),
    };
  }

  function cleanBody(payload) {
    const entry = {
      date: cleanDate(payload.date),
      weight: cleanNumber(payload.weight, "Váha", 25, 400, false),
      waist: cleanNumber(payload.waist, "Pás", 20, 300, false),
      hips: cleanNumber(payload.hips, "Boky", 20, 300, false),
      steps: cleanInteger(payload.steps, "Kroky", 0, 200000, false),
      calories_in: cleanNumber(payload.calories_in, "Kalórie", 0, 20000, false),
      protein_g: cleanNumber(payload.protein_g, "Proteín", 0, 1000, false),
      sleep_h: cleanNumber(payload.sleep_h, "Spánok", 0, 24, false),
      sauna_min: cleanNumber(payload.sauna_min, "Sauna", 0, 600, false),
      notes: cleanText(payload.notes, "Poznámka", 500, false),
    };
    const tracked = ["weight", "waist", "hips", "steps", "calories_in", "protein_g", "sleep_h", "sauna_min"];
    if (tracked.every((key) => entry[key] === null)) throw new Error("Vyplň aspoň jednu sledovanú hodnotu.");
    return entry;
  }

  function calculateBmr(profile, weight) {
    const base = 10 * weight + 6.25 * profile.height_cm - 5 * profile.age;
    return profile.sex === "žena" ? base - 161 : base + 5;
  }

  function deriveWorkout(entry) {
    return {
      ...entry,
      volume: Math.round(entry.weight * entry.reps * 100) / 100,
      e1rm: Math.round(entry.weight * (1 + entry.reps / 30) * 100) / 100,
    };
  }

  function deriveBody(entry, profile) {
    if (entry.weight === null) {
      return { ...entry, sauna_met: profile.sauna_met, sauna_kcal: null, bmr: null, expenditure: null, net_kcal: null };
    }
    const saunaKcal = profile.sauna_met * 3.5 * entry.weight / 200 * (entry.sauna_min || 0);
    const bodyBmr = calculateBmr(profile, entry.weight);
    const expenditure = bodyBmr * profile.activity_multiplier + saunaKcal;
    const net = entry.calories_in === null ? null : entry.calories_in - expenditure;
    return {
      ...entry,
      sauna_met: profile.sauna_met,
      sauna_kcal: Math.round(saunaKcal * 100) / 100,
      bmr: Math.round(bodyBmr * 100) / 100,
      expenditure: Math.round(expenditure * 100) / 100,
      net_kcal: net === null ? null : Math.round(net * 100) / 100,
    };
  }

  function dashboardData(profile, bodyEntries, workoutSets) {
    const latestBody = bodyEntries.find((entry) => entry.weight !== null);
    const currentWeight = latestBody?.weight ?? profile.start_weight;
    const currentBmr = calculateBmr(profile, currentWeight);
    const tdee = currentBmr * profile.activity_multiplier;
    const today = localISODate();
    const todayBody = bodyEntries.find((entry) => entry.date === today);
    const start = new Date(`${today}T00:00:00`);
    start.setDate(start.getDate() - 6);
    const weekStart = localISODate(start);
    const recentSets = workoutSets.filter((item) => item.date >= weekStart && item.date <= today);
    const goalAdjustment = { cut: -300, recomp: 0, bulk: 200 }[profile.goal] || 0;
    const todaySauna = todayBody?.sauna_kcal || 0;
    return {
      latest_weight: Math.round(currentWeight * 100) / 100,
      bmr: Math.round(currentBmr),
      tdee: Math.round(tdee),
      target_calories: Math.round(tdee + goalAdjustment),
      today_sauna_kcal: Math.round(todaySauna),
      today_expenditure: Math.round(tdee + todaySauna),
      total_sets: workoutSets.length,
      seven_day_volume: Math.round(recentSets.reduce((sum, item) => sum + item.volume, 0) * 10) / 10,
      today,
    };
  }

  function bootstrapFromData(data) {
    const profile = clone(data.profile);
    const workoutSets = data.workout_sets
      .map(deriveWorkout)
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    const bodyEntries = data.body_entries
      .map((entry) => deriveBody(entry, profile))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    return {
      profile,
      dashboard: dashboardData(profile, bodyEntries, workoutSets),
      workout_sets: workoutSets,
      body_entries: bodyEntries,
      plans: clone(data.plans).sort((a, b) => a.sort_order - b.sort_order),
      exercises: data.exercises.map((item) => item.name).sort((a, b) => a.localeCompare(b, "sk")),
    };
  }

  async function bootstrap() {
    return bootstrapFromData(await readData());
  }

  async function saveProfile(payload) {
    const data = await readData();
    data.profile = cleanProfile(payload);
    await writeData(data);
    return clone(data.profile);
  }

  async function saveWorkout(payload) {
    const data = await readData();
    const entry = {
      id: data.next_ids.workout_set++,
      ...cleanWorkout(payload),
      created_at: nowIso(),
    };
    data.workout_sets.push(entry);
    if (!data.exercises.some((item) => item.name.localeCompare(entry.exercise, "sk", { sensitivity: "base" }) === 0)) {
      data.exercises.push({ id: data.next_ids.exercise++, name: entry.exercise });
    }
    await writeData(data);
    return deriveWorkout(entry);
  }

  async function saveBody(payload) {
    const data = await readData();
    const clean = cleanBody(payload);
    const existingIndex = data.body_entries.findIndex((item) => item.date === clean.date);
    const timestamp = nowIso();
    let entry;
    if (existingIndex >= 0) {
      const existing = data.body_entries[existingIndex];
      entry = { ...existing, ...clean, updated_at: timestamp };
      data.body_entries[existingIndex] = entry;
    } else {
      entry = {
        id: data.next_ids.body_entry++,
        ...clean,
        created_at: timestamp,
        updated_at: timestamp,
      };
      data.body_entries.push(entry);
    }
    await writeData(data);
    return deriveBody(entry, data.profile);
  }

  async function deleteRecord(collection, id) {
    const data = await readData();
    const numericId = cleanInteger(id, "ID záznamu", 1, Number.MAX_SAFE_INTEGER);
    const before = data[collection].length;
    data[collection] = data[collection].filter((item) => item.id !== numericId);
    const deleted = data[collection].length !== before;
    if (deleted) await writeData(data);
    return deleted;
  }

  function exportFromData(data) {
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exported_at: nowIso(),
      profile: clone(data.profile),
      exercises: clone(data.exercises).sort((a, b) => a.id - b.id),
      plans: clone(data.plans).sort((a, b) => a.sort_order - b.sort_order),
      workout_sets: clone(data.workout_sets).sort((a, b) => a.id - b.id),
      body_entries: clone(data.body_entries).sort((a, b) => a.id - b.id),
    };
  }

  async function exportBackup() {
    return exportFromData(await readData());
  }

  function normalizeBackup(payload) {
    if (!payload || typeof payload !== "object" || payload.format !== BACKUP_FORMAT || payload.version !== BACKUP_VERSION) {
      throw new Error("Súbor nie je podporovaná záloha Fitness trackera.");
    }
    const requiredLists = ["exercises", "plans", "workout_sets", "body_entries"];
    if (!payload.profile || typeof payload.profile !== "object" || requiredLists.some((key) => !Array.isArray(payload[key]))) {
      throw new Error("Záloha nemá úplnú dátovú štruktúru.");
    }

    const timestamp = nowIso();
    const profile = cleanProfile(payload.profile);
    const exerciseNames = [];
    for (const item of payload.exercises) {
      const name = cleanText(item?.name, "Cvik", 120);
      if (!exerciseNames.some((saved) => saved.localeCompare(name, "sk", { sensitivity: "base" }) === 0)) exerciseNames.push(name);
    }
    const plans = payload.plans.map((item, index) => ({
      id: index + 1,
      day_name: cleanText(item?.day_name, "Deň", 40),
      workout: cleanText(item?.workout, "Tréning", 60),
      exercise: cleanText(item?.exercise, "Cvik", 120),
      sets: cleanInteger(item?.sets, "Série", 1, 100),
      reps: cleanText(item?.reps, "Opakovania", 40),
      note: cleanText(item?.note, "Poznámka", 500, false),
      sort_order: index + 1,
    }));
    const workoutSets = payload.workout_sets.map((item, index) => ({
      id: index + 1,
      ...cleanWorkout(item || {}),
      created_at: typeof item?.created_at === "string" ? item.created_at : timestamp,
    }));
    const bodyEntries = payload.body_entries.map((item, index) => ({
      id: index + 1,
      ...cleanBody(item || {}),
      created_at: typeof item?.created_at === "string" ? item.created_at : timestamp,
      updated_at: typeof item?.updated_at === "string" ? item.updated_at : timestamp,
    }));
    const duplicateDates = new Set();
    bodyEntries.forEach((entry) => {
      if (duplicateDates.has(entry.date)) throw new Error(`Záloha obsahuje viac denných záznamov pre dátum ${entry.date}.`);
      duplicateDates.add(entry.date);
    });
    workoutSets.forEach((entry) => {
      if (!exerciseNames.some((name) => name.localeCompare(entry.exercise, "sk", { sensitivity: "base" }) === 0)) {
        exerciseNames.push(entry.exercise);
      }
    });
    return {
      profile,
      exercises: exerciseNames.map((name, index) => ({ id: index + 1, name })),
      plans,
      workout_sets: workoutSets,
      body_entries: bodyEntries,
      next_ids: {
        workout_set: workoutSets.length + 1,
        body_entry: bodyEntries.length + 1,
        exercise: exerciseNames.length + 1,
      },
    };
  }

  async function restoreBackup(payload) {
    const normalized = normalizeBackup(payload);
    await writeData(normalized);
  }

  async function request(path, options = {}) {
    const method = String(options.method || "GET").toUpperCase();
    const body = typeof options.body === "string" ? JSON.parse(options.body) : (options.body || {});
    if (method === "GET" && path === "/api/bootstrap") return bootstrap();
    if (method === "POST" && path === "/api/profile") return { profile: await saveProfile(body) };
    if (method === "POST" && path === "/api/workout-sets") return { item: await saveWorkout(body) };
    if (method === "POST" && path === "/api/body-entries") return { item: await saveBody(body) };
    if (method === "POST" && path === "/api/restore") {
      await restoreBackup(body);
      return { status: "ok" };
    }
    const workoutMatch = path.match(/^\/api\/workout-sets\/(\d+)$/);
    if (method === "DELETE" && workoutMatch) return { deleted: await deleteRecord("workout_sets", workoutMatch[1]) };
    const bodyMatch = path.match(/^\/api\/body-entries\/(\d+)$/);
    if (method === "DELETE" && bodyMatch) return { deleted: await deleteRecord("body_entries", bodyMatch[1]) };
    throw new Error("Požadovaná operácia neexistuje.");
  }

  async function requestPersistentStorage() {
    if (navigator.storage?.persist) {
      try { return await navigator.storage.persist(); }
      catch { return false; }
    }
    return false;
  }

  const publicApi = {
    request,
    exportBackup,
    restoreBackup,
    requestPersistentStorage,
    _test: {
      cleanProfile,
      cleanWorkout,
      cleanBody,
      deriveWorkout,
      deriveBody,
      bootstrapFromData,
      exportFromData,
      normalizeBackup,
      initialData,
    },
  };

  if (typeof window !== "undefined") window.FitnessStorage = publicApi;
  if (typeof module !== "undefined" && module.exports) module.exports = publicApi;
})();
