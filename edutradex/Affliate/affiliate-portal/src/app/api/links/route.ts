import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { TrackingService } from "@/services/tracking.service";

const createLinkSchema = z.object({
  type: z.enum(["REGISTER", "MAIN_PAGE", "ANDROID", "PLATFORM"]),
  comment: z.string().max(200).optional(),
  program: z.enum(["REVENUE_SHARE", "TURNOVER_SHARE"]).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const validated = createLinkSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const link = await TrackingService.createLink(session.user.id, {
      type: validated.data.type,
      comment: validated.data.comment,
      program: validated.data.program,
    });

    return NextResponse.json(
      {
        success: true,
        data: link,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create link error:", error);
    return NextResponse.json(
      { error: "Failed to create tracking link" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const isActive = searchParams.get("isActive");

    const links = await TrackingService.getPartnerLinks(session.user.id, {
      page,
      pageSize,
      isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
    });

    return NextResponse.json({
      success: true,
      ...links,
    });
  } catch (error) {
    console.error("Get links error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracking links" },
      { status: 500 }
    );
  }
}
