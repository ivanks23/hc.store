"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  registerSchema,
  type RegisterInput,
} from "@/lib/validations/auth";

export default function RegisterPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (data: RegisterInput) => {
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? "No se pudo crear la cuenta",
        );
      }

      setSuccess(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo crear la cuenta",
      );
    }
  };

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-3xl font-bold">Crear cuenta</h1>

        <p className="mt-2 text-sm text-gray-600">
          Regístrate para comenzar a comprar en HyperCode Store.
        </p>

        {error && (
          <p className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {success && (
          <p className="mt-6 rounded-md bg-green-50 p-3 text-sm text-green-700">
            Cuenta creada correctamente.
          </p>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium"
            >
              Nombre
            </label>

            <input
              id="name"
              type="text"
              {...register("name")}
              className="mt-1 w-full rounded-md border px-3 py-2"
            />

            {errors.name && (
              <p className="mt-1 text-sm text-red-600">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium"
            >
              Correo electrónico
            </label>

            <input
              id="email"
              type="email"
              {...register("email")}
              className="mt-1 w-full rounded-md border px-3 py-2"
            />

            {errors.email && (
              <p className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium"
            >
              Contraseña
            </label>

            <input
              id="password"
              type="password"
              {...register("password")}
              className="mt-1 w-full rounded-md border px-3 py-2"
            />

            {errors.password && (
              <p className="mt-1 text-sm text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>
      </div>
    </main>
  );
}