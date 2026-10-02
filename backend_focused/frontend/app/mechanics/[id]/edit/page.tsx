import MechanicEditPageContent from '@/components/mechanics/MechanicEditPageContent';

interface MechanicEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function MechanicEditPage({ params }: MechanicEditPageProps) {
  const { id } = await params;
  return <MechanicEditPageContent mechanicId={Number(id)} />;
}
