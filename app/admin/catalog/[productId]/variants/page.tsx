import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import VariantManager from "./variant-manager";
type PageProps = { params: Promise<{ productId: string }> };
export default async function VariantsPage({ params }: PageProps) {
 const session = await getServerSession(authOptions); if (!session?.user) redirect("/login?callbackUrl=/admin/catalog"); if (session.user.role !== "ADMIN") redirect("/");
 const { productId } = await params; const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, name: true, variants: { select: { id: true, sku: true, price: true, isActive: true }, orderBy: { sku: "asc" } } } }); if (!product) notFound();
 return <main className="min-h-screen bg-brand-background px-5 py-10"><div className="mx-auto max-w-3xl"><Link href="/admin/catalog" className="text-sm font-semibold text-brand-secondary">← Catálogo</Link><VariantManager product={{ ...product, variants: product.variants.map(v => ({ ...v, price: v.price.toString() })) }} /></div></main>;
}
