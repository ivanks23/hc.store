"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function StoreAccountNavigation() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return null;
  }

  if (session?.user.role === "ADMIN") {
    return (
      <Link
        href="/admin"
        className="hidden rounded-full px-3 py-2 text-sm font-semibold text-brand-secondary transition hover:bg-brand-green-tint hover:text-brand-ink sm:inline-flex"
      >
        Administración
      </Link>
    );
  }

  return (
    <Link
      href={session?.user ? "/account/orders" : "/login"}
      className="hidden rounded-full px-3 py-2 text-sm font-semibold text-brand-secondary transition hover:bg-brand-green-tint hover:text-brand-ink sm:inline-flex"
    >
      Mi cuenta
    </Link>
  );
}
