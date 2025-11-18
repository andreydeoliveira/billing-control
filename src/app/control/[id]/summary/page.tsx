import { MonthlySummaryView } from '@/components/control/MonthlySummaryView';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MonthlySummaryPage({ params }: PageProps) {
  const { id } = await params;

  return <MonthlySummaryView controlId={id} />;
}
