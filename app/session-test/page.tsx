"use client";

import { useSession } from "next-auth/react";

export default function SessionTestPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <main className="p-8">Cargando sesión...</main>;
  }

  if (!session) {
    return <main className="p-8">No hay una sesión activa.</main>;
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Sesión activa</h1>

      <div className="mt-4 space-y-2">
        <p>
          <strong>Nombre:</strong> {session.user?.name}
        </p>
        <p>
          <strong>Email:</strong> {session.user?.email}
        </p>
        <p>
        <strong>ID:</strong> {session.user.id}
        </p>

        <p>
        <strong>Rol:</strong> {session.user.role}
        </p>
      </div>
    </main>
  );
}