import type { Metadata } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";

import "./globals.css";
import Providers from "./providers";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Hypercode Store | Tecnología útil para tu día a día",
    template: "%s | Hypercode Store",
  },
  description:
    "Productos y accesorios seleccionados para trabajar, crear y disfrutar mejor cada día.",
};

function StoreHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-brand-border-subtle bg-brand-surface/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Hypercode Store, inicio">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-ink text-sm font-black tracking-tight text-brand-accent">H.</span>
          <span className="text-sm font-extrabold tracking-[0.16em] text-brand-ink">HYPERCODE</span>
        </Link>

        <nav aria-label="Navegación principal" className="flex items-center gap-2 sm:gap-5">
          <Link href="/catalog" className="rounded-full px-3 py-2 text-sm font-semibold text-brand-secondary transition hover:bg-brand-green-tint hover:text-brand-ink">
            Catálogo
          </Link>
          <Link href="/login" className="hidden rounded-full px-3 py-2 text-sm font-semibold text-brand-secondary transition hover:bg-brand-green-tint hover:text-brand-ink sm:inline-flex">
            Mi cuenta
          </Link>
          <Link href="/cart" className="rounded-full bg-brand-ink px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-forest-hover">
            Carrito <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

function StoreFooter() {
  return (
    <footer className="bg-brand-ink text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <Link href="/" className="font-extrabold tracking-[0.16em] text-brand-accent">HYPERCODE STORE</Link>
        <p className="text-white/55">Tecnología útil, elegida para ti.</p>
        <div className="flex gap-5 text-white/75">
          <Link href="/catalog" className="hover:text-white">Catálogo</Link>
          <Link href="/account/orders" className="hover:text-white">Mis pedidos</Link>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX" className={`${geist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-brand-background font-sans text-brand-ink">
        <Providers>
          <StoreHeader />
          <div className="flex flex-1 flex-col">{children}</div>
          <StoreFooter />
        </Providers>
      </body>
    </html>
  );
}
