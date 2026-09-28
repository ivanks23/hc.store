export default function CheckoutPendingPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-xl border border-yellow-200 bg-white p-10 text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Pago pendiente
        </h1>

        <p className="mt-4 text-gray-600">
          Tu pago está pendiente de confirmación.
        </p>
      </div>
    </main>
  );
}