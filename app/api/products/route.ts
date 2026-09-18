import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validations/product";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Error al obtener productos:", error);

    return NextResponse.json(
      { error: "No se pudieron obtener los productos" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = productSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const {
      categoryId,
      name,
      brand,
      model,
      description,
      slug,
    } = result.data;

    const category = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "La categoría no existe" },
        { status: 404 },
      );
    }

    const existingProduct = await prisma.product.findFirst({
      where: {
        OR: [{ name }, { slug }],
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: "El producto ya existe" },
        { status: 409 },
      );
    }

    const product = await prisma.product.create({
      data: {
        categoryId,
        name,
        brand,
        model,
        description,
        slug,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error al crear producto:", error);

    return NextResponse.json(
      { error: "No se pudo crear el producto" },
      { status: 500 },
    );
  }
}