"use client";

import { collection, onSnapshot, query, where, type DocumentData, type Firestore, type Unsubscribe } from "firebase/firestore";
import { getClientFirestore } from "@/lib/firebase-client";
import { composeDistrictData, type BedDoc, type CentreDoc, type DoctorDoc, type FootfallDoc, type StockDoc, type TestDoc } from "@/lib/firestore-compose";
import type { DistrictOption } from "@/lib/districts";
import type { DistrictData } from "@/lib/types";

function asRecord(data: DocumentData): Record<string, unknown> {
  return data as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string, fallback = "") {
  const value = record[key];
  return typeof value === "string" ? value : fallback;
}

function readNumber(record: Record<string, unknown>, key: string, fallback = 0) {
  const value = record[key];
  return typeof value === "number" ? value : fallback;
}

function readArray<T>(record: Record<string, unknown>, key: string): T[] {
  const value = record[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeCentre(id: string, data: DocumentData, district: DistrictOption): CentreDoc {
  const record = asRecord(data);
  const type = readString(record, "type") === "CHC" ? "CHC" : "PHC";
  const coordinates = (record.coordinates ?? {}) as { lat?: unknown; lng?: unknown };

  return {
    id: readString(record, "id", id),
    name: readString(record, "name"),
    type,
    block: readString(record, "block"),
    catchmentPopulation: readNumber(record, "catchmentPopulation"),
    coordinates: {
      lat: typeof coordinates.lat === "number" ? coordinates.lat : 0,
      lng: typeof coordinates.lng === "number" ? coordinates.lng : 0
    },
    district: readString(record, "district", district.name),
    districtSlug: readString(record, "districtSlug", district.slug),
    state: readString(record, "state", district.state),
    generatedAt: readString(record, "generatedAt", new Date().toISOString())
  };
}

function normalizeStock(id: string, data: DocumentData): StockDoc {
  const record = asRecord(data);
  return {
    id: readString(record, "id", id),
    centreId: readString(record, "centreId"),
    name: readString(record, "name"),
    category: readString(record, "category"),
    unit: readString(record, "unit"),
    minThreshold: readNumber(record, "minThreshold"),
    critical: Boolean(record.critical),
    history: readArray(record, "history")
  };
}

function normalizeBed(data: DocumentData): BedDoc {
  const record = asRecord(data);
  return {
    centreId: readString(record, "centreId"),
    total: readNumber(record, "total"),
    history: readArray(record, "history")
  };
}

function normalizeDoctor(id: string, data: DocumentData): DoctorDoc {
  const record = asRecord(data);
  return {
    id: readString(record, "id", id),
    centreId: readString(record, "centreId"),
    name: readString(record, "name"),
    role: readString(record, "role"),
    specialty: readString(record, "specialty"),
    attendance: readArray(record, "attendance")
  };
}

function normalizeTest(id: string, data: DocumentData): TestDoc {
  const record = asRecord(data);
  return {
    id: readString(record, "id", id),
    centreId: readString(record, "centreId"),
    name: readString(record, "name"),
    available: Boolean(record.available),
    unavailableDays30: readNumber(record, "unavailableDays30"),
    history: readArray(record, "history")
  };
}

function normalizeFootfall(data: DocumentData): FootfallDoc {
  const record = asRecord(data);
  return {
    centreId: readString(record, "centreId"),
    date: readString(record, "date"),
    count: readNumber(record, "count")
  };
}

export function subscribeToDistrictData(
  district: DistrictOption,
  onData: (data: DistrictData) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const db = getClientFirestore();
  if (!db) {
    onError(new Error("Missing Firebase client environment variables."));
    return () => undefined;
  }

  return subscribeWithDb(db, district, onData, onError);
}

function districtCollection(db: Firestore, collectionName: string, district: DistrictOption) {
  return query(collection(db, collectionName), where("district", "==", district.name));
}

function subscribeWithDb(db: Firestore, district: DistrictOption, onData: (data: DistrictData) => void, onError: (error: Error) => void): Unsubscribe {
  const snapshot = {
    centres: [] as CentreDoc[],
    stocks: [] as StockDoc[],
    beds: [] as BedDoc[],
    doctors: [] as DoctorDoc[],
    tests: [] as TestDoc[],
    footfall: [] as FootfallDoc[]
  };
  const loaded = new Set<string>();

  const emit = () => {
    if (loaded.size === 6) onData(composeDistrictData(snapshot));
  };

  const subscriptions = [
    onSnapshot(
      districtCollection(db, "centres", district),
      (querySnapshot) => {
        snapshot.centres = querySnapshot.docs.map((doc) => normalizeCentre(doc.id, doc.data(), district));
        loaded.add("centres");
        emit();
      },
      onError
    ),
    onSnapshot(
      districtCollection(db, "stock_items", district),
      (querySnapshot) => {
        snapshot.stocks = querySnapshot.docs.map((doc) => normalizeStock(doc.id, doc.data()));
        loaded.add("stock_items");
        emit();
      },
      onError
    ),
    onSnapshot(
      districtCollection(db, "beds", district),
      (querySnapshot) => {
        snapshot.beds = querySnapshot.docs.map((doc) => normalizeBed(doc.data()));
        loaded.add("beds");
        emit();
      },
      onError
    ),
    onSnapshot(
      districtCollection(db, "doctors", district),
      (querySnapshot) => {
        snapshot.doctors = querySnapshot.docs.map((doc) => normalizeDoctor(doc.id, doc.data()));
        loaded.add("doctors");
        emit();
      },
      onError
    ),
    onSnapshot(
      districtCollection(db, "tests", district),
      (querySnapshot) => {
        snapshot.tests = querySnapshot.docs.map((doc) => normalizeTest(doc.id, doc.data()));
        loaded.add("tests");
        emit();
      },
      onError
    ),
    onSnapshot(
      districtCollection(db, "footfall_logs", district),
      (querySnapshot) => {
        snapshot.footfall = querySnapshot.docs.map((doc) => normalizeFootfall(doc.data()));
        loaded.add("footfall_logs");
        emit();
      },
      onError
    )
  ];

  return () => subscriptions.forEach((unsubscribe) => unsubscribe());
}
