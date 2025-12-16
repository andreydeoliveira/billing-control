import { getCurrentUser } from '@/lib/session';
import { logout } from '@/app/auth/actions';

export default async function UserInfo() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-white shadow rounded-lg">
      <div className="flex-1">
        <p className="text-sm text-gray-600">Logado como:</p>
        <p className="font-semibold">{user.name || user.email}</p>
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Sair
        </button>
      </form>
    </div>
  );
}
