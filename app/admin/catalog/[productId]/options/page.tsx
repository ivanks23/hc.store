import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import ProductOptionsManager from "./product-options-manager";
type Props = { params: Promise<{ productId: string }> };
export default async function ProductOptionsPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/admin/catalog");
  if (session.user.role !== "ADMIN") redirect("/");
  const { productId } = await params;
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, name: true, slug: true } });
  if (!product) notFound();
  return <main className="min-h-screen bg-brand-background px-5 py-10 sm:px-8"><div className="mx-auto max-w-5xl"><Link href="/admin/catalog" className="text-sm font-semibold text-brand-secondary">← Volver al catálogo</Link><ProductOptionsManager product={product} /></div></main>;
}
