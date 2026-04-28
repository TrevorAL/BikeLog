import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { isComponentOwnedByUser } from "@/lib/ownership";
import { replaceComponent } from "@/lib/component-service";

type RouteContext = {
  params: Promise<{
    componentId: string;
  }>;
};

function optionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const { componentId } = await context.params;
    const isOwned = await isComponentOwnedByUser({
      componentId,
      userId: auth.user.id,
    });

    if (!isOwned) {
      return NextResponse.json(
        { error: "Active component not found." },
        { status: 404 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;

    const installDateInput = optionalString(body.installDate);
    const installDate = installDateInput ? new Date(installDateInput) : undefined;

    if (installDate && Number.isNaN(installDate.getTime())) {
      return NextResponse.json({ error: "Install date is invalid." }, { status: 400 });
    }

    const result = await replaceComponent(componentId, {
      name: optionalString(body.name),
      brand: optionalString(body.brand),
      model: optionalString(body.model),
      installDate,
      notes: optionalString(body.notes),
    });

    if (!result) {
      return NextResponse.json(
        { error: "Active component not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to replace component", error);
    return NextResponse.json(
      { error: "Could not replace component right now." },
      { status: 500 },
    );
  }
}
