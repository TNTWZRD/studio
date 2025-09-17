'use client';

import { AuthHandler } from "@/components/auth/auth-handler";
import { AuthProvider } from "@/hooks/use-auth";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <AuthHandler />
            {children}
        </AuthProvider>
    );
}
