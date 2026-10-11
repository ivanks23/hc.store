import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import CatalogManager from "./catalog-manager";

export const metadata = { title: "Administración de catálogo" };

export default async function AdminCatalogPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/admin/catalog");
  if (session.user.role !== "ADMIN") redirect("/");
  return <CatalogManager />;
}
