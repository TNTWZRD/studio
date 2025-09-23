import admin from 'firebase-admin';

// Guard initialization: when building inside Docker, service account env vars are often not
// available. Avoid initializing the Admin SDK at module import time if the required
// env vars are missing (this prevents next build from executing admin code during
// collection of page data).

const hasServiceAccount = !!(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);

let adminAuthVar: any = null;

// Create a Proxy stub that throws helpful errors when admin APIs are used before initialization
const throwIfCalled = () => {
  throw new Error('Firebase Admin SDK not initialized. Set FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, and NEXT_PUBLIC_FIREBASE_PROJECT_ID in the environment before using admin APIs.');
};
const adminStub: any = new Proxy({}, { get() { return throwIfCalled; } });

if (hasServiceAccount) {
  // Diagnostic logging
  console.log('--- Firebase Admin SDK Initialization ---');
  console.log('Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'Loaded' : 'MISSING');
  console.log('Client Email:', process.env.FIREBASE_CLIENT_EMAIL ? 'Loaded' : 'MISSING');
  console.log('Private Key:', process.env.FIREBASE_PRIVATE_KEY ? 'Loaded' : 'MISSING');
  console.log('--- End Diagnostic ---');

  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          // Firebase SDK expects these keys in the service account object
          project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        } as any),
      });
      console.log('Firebase Admin SDK initialized successfully.');
      // Only use admin.auth() if initialization succeeded
      adminAuthVar = admin.auth();
    } catch (error: any) {
      console.error('Firebase Admin SDK initialization error:', error.message);
      adminAuthVar = adminStub;
    }
  } else {
    // Already initialized by another module
    adminAuthVar = admin.auth();
  }

} else {
  console.warn('Firebase Admin SDK not initialized: missing service account env vars. Skipping initialization.');
  adminAuthVar = adminStub;
}

export const adminAuth = adminAuthVar;
