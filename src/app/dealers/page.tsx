import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { getDealerNetwork } from '@/app/api/dealer-network.api';
import { DealerNetworkClient } from '@/components/dealers/dealer-network-client';

export default async function DealersPage() {
  const user = await getCurrentUser();
  if (!user || !['dealer', 'admin', 'operator'].includes(user.role?.name ?? '')) notFound();
  return <DealerNetworkClient initialData={await getDealerNetwork()} currentUserId={user.id} isAdmin={user.role.name === 'admin'} />;
}
