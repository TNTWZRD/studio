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
        You do not have permission to view this page. Please contact an admin if you believe this is a mistake.
      </p>
    </div>
  );
}

export function withCreatorAuth<P extends object>(WrappedComponent: ComponentType<P>) {
  const WithCreatorAuth = (props: P) => {
    const { user, loading, canPost, isMember } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && (!user || !isMember)) {
        router.replace('/'); 
      }
    }, [user, loading, isMember, router]);

    if (loading) {
      return (
        <div className="container mx-auto py-12">
            <div className="max-w-4xl mx-auto space-y-8">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-6 w-1/2" />
                <div className="space-y-4 mt-8">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
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
