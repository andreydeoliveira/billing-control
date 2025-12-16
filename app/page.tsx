import HomeClient from './HomeClient';
import { getDashboardData } from './actions';

export default async function Home() {
  const data = await getDashboardData();

  return <HomeClient initialData={data} />;
}
