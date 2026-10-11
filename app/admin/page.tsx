import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import AdminDashboard from "./admin-dashboard";

export const metadata = {
  title: "Administración",
};

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }

  if (session.user.role !== "ADMIN") {
    return (
      <main className="min-h-screen bg-brand-background px-5 py-12">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold text-brand-ink">Acceso restringido</h1>
          <p className="mt-3 text-brand-muted">Esta área está disponible únicamente para administradores.</p>
        </div>
      </main>
    );
  }

  return <AdminDashboard />;
}
