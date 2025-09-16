'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, type ComponentType } from 'react';
import { Skeleton } from '../ui/skeleton';

function AdminAccessDenied() {
  return (
    <div className="container mx-auto py-12 text-center">
      <h1 className="text-3xl font-bold">Access Denied</h1>
      <p className="text-muted-foreground mt-4">
        You do not have permission to view this page.
      </p>
    </div>
  );
}


export function withAdminAuth<P extends object>(WrappedComponent: ComponentType<P>) {
  const WithAdminAuth = (props: P) => {
    const { user, loading, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
      // If loading is finished and there's no user, redirect them.
      if (!loading && !user) {
        router.replace('/'); 
      }
    }, [user, loading, router]);

    if (loading) {
      // Show a loading skeleton while we verify the user's auth state and claims.
      // This prevents flashing the "Access Denied" page on a slow connection.
      return (
        <div className="container mx-auto py-12">
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-32 w-full" />
            </div>
        </div>
      )
    }

    if (!user || !isAdmin) {
      // If we're done loading and the user is either not logged in or not an admin,
      // show the access denied page.
      return <AdminAccessDenied />;
    }

    // If all checks pass, render the wrapped component.
    return <WrappedComponent {...props} />;
  };

  WithAdminAuth.displayName = `withAdminAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithAdminAuth;
}
