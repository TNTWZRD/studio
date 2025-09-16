'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// AuthHandler is a client component because it uses hooks.
function AuthHandlerInternal() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');
    const roleCheck = searchParams.get('roleCheck');

    useEffect(() => {
        if (token) {
            signInWithCustomToken(auth, token)
                .then(async (userCredential) => {
                    if (roleCheck === 'true' && userCredential.user) {
                        await userCredential.user.getIdToken(true);
                    }
                    const newUrl = window.location.pathname;
                    router.replace(newUrl, { scroll: false });
                })
                .catch((error) => {
                    console.error("Firebase custom token sign-in error", error);
                    const newUrl = window.location.pathname;
                    router.replace(newUrl, { scroll: false });
                });
        }
    }, [token, roleCheck, router]);

    return null;
}

// We wrap it in a Suspense boundary because useSearchParams() suspends rendering.
export function AuthHandler() {
    return (
        <Suspense>
            <AuthHandlerInternal />
        </Suspense>
    )
}
