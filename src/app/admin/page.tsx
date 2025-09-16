'use client';

import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function AdminPage() {
  return (
    <div className="container mx-auto py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-headline mb-8">Admin Dashboard</h1>

        <Card>
          <CardHeader>
            <CardTitle>Welcome, Admin!</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is a protected area. Only users with the 'Captain' role can see this.</p>
            <p className="mt-4">You can add your admin components and functionality here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default withAdminAuth(AdminPage);
