import DashboardView from '@/components/DashboardView';
import { loadDashboardData } from '@/lib/loadExcel';

export default function Home() {
  const data = loadDashboardData();

  return <DashboardView data={data} />;
}
