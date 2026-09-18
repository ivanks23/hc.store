import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validations/category";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error al obtener categorías:", error);

    return NextResponse.json(
      { error: "No se pudieron obtener las categorías" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = categorySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { name, slug } = result.data;

    const existingCategory = await prisma.category.findFirst({
      where: {
        OR: [{ name }, { slug }],
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: "La categoría ya existe" },
        { status: 409 },
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Error al crear categoría:", error);

    return NextResponse.json(
      { error: "No se pudo crear la categoría" },
      { status: 500 },
    );
  }
}