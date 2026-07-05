import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let seed = 20260701;
function random() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

function between(min, max) {
  return min + random() * (max - min);
}

function intBetween(min, max) {
  return Math.round(between(min, max));
}

function isoDate(daysAgo) {
  const date = new Date("2026-07-01T00:00:00+05:30");
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const medicines = [
  ["amox", "Amoxicillin 500mg", "Antibiotic", "strips", 90, true],
  ["azith", "Azithromycin 500mg", "Antibiotic", "strips", 70, true],
  ["para", "Paracetamol 500mg", "Analgesic", "strips", 180, true],
  ["ors", "ORS sachets", "Rehydration", "sachets", 130, true],
  ["iron", "Iron folic acid", "Maternal health", "strips", 160, false],
  ["met", "Metformin 500mg", "NCD", "strips", 90, false],
  ["salb", "Salbutamol inhaler", "Respiratory", "inhalers", 28, true],
  ["rapid", "Malaria rapid test kit", "Diagnostics", "kits", 35, true]
];

const tests = [
  ["hb", "Hemoglobin"],
  ["malaria", "Malaria RDT"],
  ["pregnancy", "Pregnancy test"],
  ["bloodSugar", "Blood sugar"],
  ["urine", "Urine routine"],
  ["dengue", "Dengue NS1"]
];

const suryanagarCentres = [
  { id: "rampur-chc", name: "Rampur Community Health Centre", type: "CHC", block: "Rampur", catchmentPopulation: 94500, beds: 32, doctors: 7, demand: 1.18, struggling: "beds-doctors-stock", coordinates: { lat: 25.324, lng: 82.983 } },
  { id: "bhairavpur-phc", name: "Bhairavpur Primary Health Centre", type: "PHC", block: "Bhairavpur", catchmentPopulation: 38600, beds: 8, doctors: 3, demand: 0.82, struggling: "", coordinates: { lat: 25.245, lng: 82.901 } },
  { id: "nirmalganj-phc", name: "Nirmalganj Primary Health Centre", type: "PHC", block: "Nirmalganj", catchmentPopulation: 42100, beds: 10, doctors: 3, demand: 0.92, struggling: "stock-tests", coordinates: { lat: 25.377, lng: 83.067 } },
  { id: "kesaripur-chc", name: "Kesaripur Community Health Centre", type: "CHC", block: "Kesaripur", catchmentPopulation: 87200, beds: 28, doctors: 6, demand: 0.98, struggling: "", coordinates: { lat: 25.291, lng: 83.138 } },
  { id: "sonbarsa-phc", name: "Sonbarsa Primary Health Centre", type: "PHC", block: "Sonbarsa", catchmentPopulation: 33300, beds: 6, doctors: 2, demand: 0.78, struggling: "", coordinates: { lat: 25.184, lng: 83.024 } },
  { id: "devipur-phc", name: "Devipur Primary Health Centre", type: "PHC", block: "Devipur", catchmentPopulation: 47200, beds: 12, doctors: 4, demand: 1.05, struggling: "overcrowded", coordinates: { lat: 25.421, lng: 82.947 } },
  { id: "chandipur-phc", name: "Chandipur Primary Health Centre", type: "PHC", block: "Chandipur", catchmentPopulation: 28600, beds: 6, doctors: 2, demand: 0.7, struggling: "", coordinates: { lat: 25.463, lng: 83.019 } },
  { id: "madhopur-chc", name: "Madhopur Community Health Centre", type: "CHC", block: "Madhopur", catchmentPopulation: 112400, beds: 36, doctors: 8, demand: 1.22, struggling: "beds-stock", coordinates: { lat: 25.512, lng: 83.106 } },
  { id: "lalganj-phc", name: "Lalganj Primary Health Centre", type: "PHC", block: "Lalganj", catchmentPopulation: 51700, beds: 10, doctors: 3, demand: 0.95, struggling: "tests", coordinates: { lat: 25.142, lng: 82.873 } },
  { id: "shantipur-phc", name: "Shantipur Primary Health Centre", type: "PHC", block: "Shantipur", catchmentPopulation: 36500, beds: 8, doctors: 3, demand: 0.76, struggling: "doctors", coordinates: { lat: 25.226, lng: 83.211 } },
  { id: "gauriganj-chc", name: "Gauriganj Community Health Centre", type: "CHC", block: "Gauriganj", catchmentPopulation: 98200, beds: 30, doctors: 7, demand: 1.0, struggling: "", coordinates: { lat: 25.488, lng: 82.812 } },
  { id: "rajapur-phc", name: "Rajapur Primary Health Centre", type: "PHC", block: "Rajapur", catchmentPopulation: 44200, beds: 9, doctors: 3, demand: 1.08, struggling: "stock", coordinates: { lat: 25.096, lng: 83.071 } }
];

const doctorNames = [
  "Dr. Asha Verma",
  "Dr. Imran Khan",
  "Dr. Kavita Singh",
  "Dr. Ramesh Patel",
  "Dr. Neha Kulkarni",
  "Dr. Farah Ali",
  "Dr. Vivek Rao",
  "Dr. Meera Nair"
];

function createStockHistory(baseDailyUse, startingStock, struggling) {
  let closing = startingStock;
  const history = [];

  for (let day = 44; day >= 0; day -= 1) {
    const date = isoDate(day);
    const opening = closing;
    const demandTrend = 1 + (44 - day) * (struggling ? 0.006 : 0.0015);
    const consumed = Math.max(1, Math.round(baseDailyUse * demandTrend * between(0.78, 1.27)));
    const received = day === 32 || day === 16 ? Math.round(baseDailyUse * between(4, struggling ? 8 : 16)) : 0;
    closing = Math.max(0, opening + received - consumed);
    history.push({ date, opening, received, consumed, closing });
  }

  return history;
}

function makeDistrictCentres(config) {
  if (config.centres) return config.centres;

  const strain = ["", "stock", "tests", "beds", "doctors", "stock-tests", "overcrowded", "", "beds-stock", "stock"];
  return config.villages.map((village, index) => {
    const type = index % 4 === 0 || index === config.villages.length - 1 ? "CHC" : "PHC";
    const beds = type === "CHC" ? intBetween(24, 38) : intBetween(6, 12);
    const doctors = type === "CHC" ? intBetween(5, 8) : intBetween(2, 4);
    const catchmentPopulation = type === "CHC" ? intBetween(82000, 118000) : intBetween(28500, 56000);
    const demand = Number(between(0.72, 1.24).toFixed(2));
    const struggling = strain[(index + config.strainOffset) % strain.length];
    const id = `${config.slug}-${slugify(village)}-${type.toLowerCase()}`;

    return {
      id,
      name: `${village} ${type === "CHC" ? "Community Health Centre" : "Primary Health Centre"}`,
      type,
      block: village,
      catchmentPopulation,
      beds,
      doctors,
      demand,
      struggling,
      coordinates: {
        lat: Number((config.baseLat + between(-0.22, 0.22)).toFixed(3)),
        lng: Number((config.baseLng + between(-0.22, 0.22)).toFixed(3))
      }
    };
  });
}

function createCentre(raw, centreIndex, districtConfig) {
  const isStruggling = Boolean(raw.struggling);
  const centreMedicines = medicines.map(([id, name, category, unit, threshold, critical], medicineIndex) => {
    const baseUse = between(5, 18) * raw.demand * (category === "Antibiotic" ? 1.15 : 1);
    const lowStockItem = raw.struggling.includes("stock") && ["amox", "azith", "ors", "rapid"].includes(id);
    const startingStock = Math.round(baseUse * (lowStockItem ? between(42, 56) : between(58, 92)));

    return {
      id,
      name,
      category,
      unit,
      minThreshold: threshold,
      critical,
      history: createStockHistory(baseUse, startingStock + medicineIndex * 8, lowStockItem)
    };
  });

  const bedHistory = [];
  const footfall = [];
  for (let day = 44; day >= 0; day -= 1) {
    const pressure = raw.struggling.includes("overcrowded") || raw.struggling.includes("beds") ? between(0.92, 1.16) : between(0.48, 0.86);
    const occupied = Math.max(1, Math.round(raw.beds * pressure + between(-1.5, 1.8)));
    const patientCount = Math.round(raw.catchmentPopulation / 1050 + raw.beds * 1.8 + between(-9, 14) + (isStruggling ? 12 : 0));
    bedHistory.push({ date: isoDate(day), total: raw.beds, occupied });
    footfall.push({ date: isoDate(day), count: Math.min(180, Math.max(30, patientCount)) });
  }

  const doctors = Array.from({ length: raw.doctors }, (_, index) => ({
    id: `${raw.id}-doc-${index + 1}`,
    name: doctorNames[(centreIndex + index) % doctorNames.length],
    role: index === 0 ? "Medical Officer" : index % 3 === 0 ? "Staff Doctor" : "Duty Doctor",
    specialty: index === 0 ? "General medicine" : index % 2 === 0 ? "Maternal and child health" : "Emergency OPD"
  }));

  const attendance = [];
  for (let day = 44; day >= 0; day -= 1) {
    for (const doctor of doctors) {
      const absenceChance = raw.struggling.includes("doctors") ? 0.34 : between(0.06, 0.13);
      const lateChance = raw.struggling.includes("doctors") ? 0.13 : 0.05;
      const roll = random();
      attendance.push({
        date: isoDate(day),
        doctorId: doctor.id,
        status: roll < absenceChance ? "absent" : roll < absenceChance + lateChance ? "late" : "present"
      });
    }
  }

  const centreTests = tests.map(([id, name], index) => {
    const down = raw.struggling.includes("tests") && ["malaria", "dengue", "bloodSugar"].includes(id);
    const intermittent = !down && random() < 0.18;
    const unavailableDays30 = down ? intBetween(12, 24) : intermittent ? intBetween(2, 6) : 0;
    return {
      id,
      name,
      available: unavailableDays30 < 10 && !(raw.struggling.includes("tests") && index % 2 === 1),
      unavailableDays30
    };
  });

  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    block: raw.block,
    catchmentPopulation: raw.catchmentPopulation,
    coordinates: raw.coordinates,
    district: districtConfig.district,
    districtSlug: districtConfig.slug,
    state: districtConfig.state,
    medicines: centreMedicines,
    beds: { total: raw.beds, history: bedHistory },
    doctors,
    attendance,
    tests: centreTests,
    patientFootfall: footfall
  };
}

const districtDefinitions = [
  {
    district: "Suryanagar",
    slug: "suryanagar",
    state: "Uttar Pradesh",
    generatedAt: "2026-07-01T00:00:00+05:30",
    centres: suryanagarCentres
  },
  {
    district: "Shivpur Kalan",
    slug: "shivpur-kalan",
    state: "Uttar Pradesh",
    generatedAt: "2026-07-01T00:00:00+05:30",
    villages: ["Basantpur", "Trilokpur", "Kalyanpur", "Reotipur", "Bhadarsa", "Semri", "Piprauli", "Kachhwa"],
    baseLat: 26.63,
    baseLng: 82.12,
    strainOffset: 2
  },
  {
    district: "Mahadevganj",
    slug: "mahadevganj",
    state: "Uttar Pradesh",
    generatedAt: "2026-07-01T00:00:00+05:30",
    villages: ["Belwa", "Chitaura", "Jaitpur", "Narayanpur", "Bhaisahi", "Gopalpur", "Baragaon", "Haripur", "Rasulabad", "Tilakpur"],
    baseLat: 27.1,
    baseLng: 81.95,
    strainOffset: 5
  }
];

const districts = districtDefinitions.map((definition) => {
  const rawCentres = makeDistrictCentres(definition);
  return {
    district: definition.district,
    districtSlug: definition.slug,
    state: definition.state,
    generatedAt: definition.generatedAt,
    centres: rawCentres.map((centre, index) => createCentre(centre, index, definition))
  };
});

const primaryDistrict = districts.find((district) => district.districtSlug === "suryanagar") ?? districts[0];
writeFileSync(join(process.cwd(), "data", "district-data.json"), `${JSON.stringify(primaryDistrict, null, 2)}\n`);
writeFileSync(join(process.cwd(), "data", "districts-data.json"), `${JSON.stringify(districts, null, 2)}\n`);
console.log(`Generated ${districts.reduce((sum, district) => sum + district.centres.length, 0)} centres across ${districts.length} districts.`);

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key?.replace(/\\n/g, "\n")
  };
}

async function seedFirestore() {
  console.log(
    `Firestore env check: FIREBASE_PROJECT_ID=${process.env.FIREBASE_PROJECT_ID ? "present" : "missing"}, FIREBASE_SERVICE_ACCOUNT_KEY=${process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? "present" : "missing"}`
  );

  const serviceAccount = parseServiceAccount();
  const projectId = process.env.FIREBASE_PROJECT_ID || serviceAccount?.projectId;

  if (!projectId || !serviceAccount?.clientEmail || !serviceAccount.privateKey) {
    console.log("Skipped Firestore seed: set FIREBASE_SERVICE_ACCOUNT_KEY and FIREBASE_PROJECT_ID.");
    return;
  }

  initializeApp({
    credential: cert(serviceAccount),
    projectId
  });

  const db = getFirestore();
  let batch = db.batch();
  let pendingWrites = 0;
  let committedBatches = 0;

  async function setDocument(ref, value) {
    batch.set(ref, value);
    pendingWrites += 1;

    if (pendingWrites >= 450) {
      await batch.commit();
      committedBatches += 1;
      batch = db.batch();
      pendingWrites = 0;
    }
  }

  for (const district of districts) {
    for (const centre of district.centres) {
      const districtFields = {
        district: district.district,
        districtSlug: district.districtSlug,
        state: district.state,
        generatedAt: district.generatedAt
      };

      await setDocument(db.collection("centres").doc(centre.id), {
        id: centre.id,
        name: centre.name,
        type: centre.type,
        block: centre.block,
        catchmentPopulation: centre.catchmentPopulation,
        coordinates: centre.coordinates,
        ...districtFields
      });

      await setDocument(db.collection("beds").doc(centre.id), {
        centreId: centre.id,
        total: centre.beds.total,
        history: centre.beds.history,
        ...districtFields
      });

      for (const medicine of centre.medicines) {
        await setDocument(db.collection("stock_items").doc(`${centre.id}_${medicine.id}`), {
          centreId: centre.id,
          ...medicine,
          ...districtFields
        });
      }

      for (const doctor of centre.doctors) {
        await setDocument(db.collection("doctors").doc(doctor.id), {
          centreId: centre.id,
          ...doctor,
          attendance: centre.attendance.filter((record) => record.doctorId === doctor.id),
          ...districtFields
        });
      }

      for (const test of centre.tests) {
        await setDocument(db.collection("tests").doc(`${centre.id}_${test.id}`), {
          centreId: centre.id,
          ...test,
          ...districtFields
        });
      }

      for (const point of centre.patientFootfall) {
        await setDocument(db.collection("footfall_logs").doc(`${centre.id}_${point.date}`), {
          centreId: centre.id,
          ...point,
          ...districtFields
        });
      }
    }
  }

  if (pendingWrites > 0) {
    await batch.commit();
    committedBatches += 1;
  }

  console.log(`Seeded Firestore collections for ${districts.length} districts (${committedBatches} batches).`);
}

await seedFirestore();
