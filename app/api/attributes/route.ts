import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { attributeSchema } from "@/lib/validations/attribute";


export async function GET() {
  try {
    const attributes = await prisma.attribute.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(attributes);
  } catch (error) {
    console.error("Error al obtener atributos:", error);

    return NextResponse.json(
      { error: "No se pudieron obtener los atributos" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = attributeSchema.safeParse(body);

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

    const existingAttribute = await prisma.attribute.findFirst({
      where: {
        OR: [{ name }, { slug }],
      },
    });

    if (existingAttribute) {
      return NextResponse.json(
        { error: "El atributo ya existe" },
        { status: 409 },
      );
    }

    const attribute = await prisma.attribute.create({
      data: {
        name,
        slug,
      },
    });

    return NextResponse.json(attribute, { status: 201 });
  } catch (error) {
    console.error("Error al crear atributo:", error);

    return NextResponse.json(
      { error: "No se pudo crear el atributo" },
      { status: 500 },
    );
  }
}