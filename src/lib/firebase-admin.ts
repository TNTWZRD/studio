import admin from 'firebase-admin';

// Diagnostic logging
console.log("--- Firebase Admin SDK Initialization ---");
console.log("Project ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "Loaded" : "MISSING");
console.log("Client Email:", process.env.FIREBASE_CLIENT_EMAIL ? "Loaded" : "MISSING");
console.log("Private Key:", process.env.FIREBASE_PRIVATE_KEY ? "Loaded" : "MISSING");
console.log("--- End Diagnostic ---");

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error: any) {
    console.error("Firebase Admin SDK initialization error:", error.message);
  }
}

export const adminAuth = admin.auth();
