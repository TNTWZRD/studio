'use client';

import React, { createContext, useContext, useEffect, useState, Suspense } from 'react';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { isAdmin, canPost, isGuildMember } from '@/lib/auth';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';


interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  canPost: boolean;
  isMember: boolean;
  signIn: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


// This internal component handles the client-side logic of parsing the token from the URL
// and signing the user in. It's wrapped in Suspense because it uses useSearchParams().
function AuthTokenProcessor() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const token = searchParams.get('token');
    const roleCheck = searchParams.get('roleCheck');

    useEffect(() => {
        if (token) {
            signInWithCustomToken(auth, token)
                .then(async (userCredential) => {
                    // After sign-in, force a token refresh to get custom claims if specified.
                    if (roleCheck === 'true' && userCredential.user) {
                        await userCredential.user.getIdToken(true);
                    }
                    // Clean the URL by removing the token parameter.
                    router.replace(pathname, { scroll: false });
                })
                .catch((error) => {
                    console.error("Firebase custom token sign-in error", error);
                    // Still clean the URL on error.
                    router.replace(pathname, { scroll: false });
                });
        }
    }, [token, roleCheck, router, pathname]);

    return null; // This component does not render anything.
}


export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [canUserPost, setCanUserPost] = useState(false);
  const [isUserMember, setIsUserMember] = useState(false);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Force refresh to get custom claims.
        const tokenResult = await user.getIdTokenResult(true);
        // Attach claims to user object for easier access
        (user as any).claims = tokenResult.claims;
        
        const userIsAdmin = isAdmin(user);
        const userIsMember = isGuildMember(user);
        
        // If they are not a member (and not an admin), sign them out.
        if (!userIsMember) {
          await firebaseSignOut(auth);
          setUser(null);
          setIsUserAdmin(false);
          setCanUserPost(false);
          setIsUserMember(false);
        } else {
            setUser(user);
            setIsUserAdmin(userIsAdmin);
            setCanUserPost(canPost(user));
            setIsUserMember(userIsMember);
        }

      } else {
        setUser(null);
        setIsUserAdmin(false);
        setCanUserPost(false);
        setIsUserMember(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = () => {
    const discordClientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI;
    
    if (!discordClientId || !redirectUri) {
      alert('Discord authentication is not configured. Please check your environment variables.');
      return;
    }

    const scope = 'identify email guilds guilds.members.read';
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${discordClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
    window.location.href = discordAuthUrl;
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin: isUserAdmin, canPost: canUserPost, isMember: isUserMember, signIn, signOut }}>
        <Suspense>
            <AuthTokenProcessor />
        </Suspense>
        {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
