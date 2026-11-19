import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { getDealerNetwork, getNetworkRegistrationRequests } from '@/app/api/dealer-network.api';
import { DealerNetworkClient } from '@/components/dealers/dealer-network-client';
import { dealerRegistrationRequestId } from '@/lib/dealer-registration-request';

export default async function DealersPage({ searchParams }: { searchParams: Promise<{ registrationRequest?: string | string[] }> }) {
  const requestId = dealerRegistrationRequestId((await searchParams).registrationRequest);
  const user = await getCurrentUser();
  if (!user && requestId) redirect(`/login?registrationRequest=${requestId}`);
  if (!user || !['dealer', 'admin', 'operator'].includes(user.role?.name ?? '')) notFound();
  const network = await getDealerNetwork();
  const requests = network.canCreate ? await getNetworkRegistrationRequests() : [];
  return <DealerNetworkClient initialData={network} registrationRequests={requests} currentUserId={user.id}
    isAdmin={user.role.name === 'admin'} initialRegistrationRequest={requestId} />;
}
