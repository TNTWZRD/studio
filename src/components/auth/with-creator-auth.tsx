'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, type ComponentType } from 'react';
import { Skeleton } from '../ui/skeleton';

function AccessDenied() {
  return (
    <div className="container mx-auto py-12 text-center">
      <h1 className="text-3xl font-bold">Access Denied</h1>
      <p className="text-muted-foreground mt-4">
        You do not have permission to view this page.
      </p>
    </div>
  );
}

export function withCreatorAuth<P extends object>(WrappedComponent: ComponentType<P>) {
  const WithCreatorAuth = (props: P) => {
    const { user, loading, canPost } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !user) {
        router.replace('/'); 
      }
    }, [user, loading, router]);

    if (loading) {
      return (
        <div className="container mx-auto py-12">
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-32 w-full" />
            </div>
        </div>
      );
    }

    if (!canPost) {
      return <AccessDenied />;
    }

    return <WrappedComponent {...props} />;
  };

  WithCreatorAuth.displayName = `withCreatorAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithCreatorAuth;
}
