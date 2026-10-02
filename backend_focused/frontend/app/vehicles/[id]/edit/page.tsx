import VehicleEditPageContent from '@/components/vehicles/VehicleEditPageContent';

interface EditVehiclePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditVehiclePage({ params }: EditVehiclePageProps) {
  const { id } = await params;
  return <VehicleEditPageContent vehicleId={Number(id)} />;
}
