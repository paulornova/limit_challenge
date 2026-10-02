import OfficeDetailPageContent from '@/components/offices/OfficeDetailPageContent';

interface OfficeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OfficeDetailPage({ params }: OfficeDetailPageProps) {
  const { id } = await params;
  return <OfficeDetailPageContent officeId={Number(id)} />;
}
