import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import InventoryHistoryManager from "./inventory-history-manager";

export const metadata = { title: "Historial de inventario" };

export default async function InventoryHistoryPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect("/login?callbackUrl=/admin/inventory");
  if (session.user.role !== "ADMIN") redirect("/");

  return <InventoryHistoryManager />;
}
