import VehicleDetailPageContent from '@/components/vehicles/VehicleDetailPageContent';

interface VehicleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function VehicleDetailPage({ params }: VehicleDetailPageProps) {
  const { id } = await params;
  return <VehicleDetailPageContent vehicleId={Number(id)} />;
}
