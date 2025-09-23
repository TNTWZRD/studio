import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged as modularOnAuthStateChanged } from 'firebase/auth';

export const hasClientConfig = !!(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);

let app: any = null;
let auth: any = null;

if (hasClientConfig) {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  // Initialize Firebase client
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  auth = getAuth(app);

  // Non-sensitive runtime diagnostics (do NOT log secret values)
  try {
    // Only print presence, not the actual secret values
    // eslint-disable-next-line no-console
    console.log('[firebase] client config detected: NEXT_PUBLIC_FIREBASE_API_KEY present?', !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
    // eslint-disable-next-line no-console
    console.log('[firebase] auth initialized?', !!auth && typeof auth === 'object' ? (auth.constructor ? auth.constructor.name : 'object') : 'no');
  } catch (e) {
    // ignore
  }
  // Compatibility shim: attach instance-style onAuthStateChanged to auth so
  // older code or libraries that call auth.onAuthStateChanged(...) won't crash.
  try {
    if (auth && typeof auth === 'object' && typeof modularOnAuthStateChanged === 'function') {
      // only attach if not present
      const proto = Object.getPrototypeOf(auth);
      if (proto && typeof proto === 'object') {
        if (!proto.hasOwnProperty('onAuthStateChanged')) {
          try {
            Object.defineProperty(proto, 'onAuthStateChanged', {
              value: function(cb: any) {
                // 'this' will be the auth instance returned by getAuth
                return modularOnAuthStateChanged(this, cb as any);
              },
              writable: false,
              configurable: true,
            });
          } catch (e) {
            // fallback: attach directly to instance
            (auth as any).onAuthStateChanged = function(cb: any) { return modularOnAuthStateChanged(auth, cb as any); };
          }
        }
      } else {
        if (!(auth as any).onAuthStateChanged) {
          (auth as any).onAuthStateChanged = function(cb: any) { return modularOnAuthStateChanged(auth, cb as any); };
        }
      }
    }
  } catch (e) {
    // ignore
  }
} else {
  // Export stubs to avoid build-time runtime errors when client firebase config is absent
  const throwIfCalled = () => {
    throw new Error('Firebase client not initialized. Set NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID in the environment.');
  };

  const stub: any = new Proxy({}, { get() { return throwIfCalled; } });
  app = null;
  auth = stub as any;
}

export { app, auth };
