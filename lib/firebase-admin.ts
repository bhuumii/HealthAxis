import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Record<string, string>;
  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key?.replace(/\\n/g, "\n")
  };
}

export function getAdminFirestore() {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const serviceAccount = parseServiceAccount();

  if (!projectId || !serviceAccount?.clientEmail || !serviceAccount.privateKey) {
    return null;
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId
    });
  }

  return getFirestore();
}
