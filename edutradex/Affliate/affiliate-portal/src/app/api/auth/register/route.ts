import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

const registerSchema = z.object({
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be less than 50 characters")
    .regex(/^[a-zA-Z\s-]+$/, "First name can only contain letters"),
  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must be less than 50 characters")
    .regex(/^[a-zA-Z\s-]+$/, "Last name can only contain letters"),
  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and number"
    ),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const validated = registerSchema.safeParse(body);
    if (!validated.success) {
      const errors: Record<string, string[]> = {};
      validated.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (!errors[field]) errors[field] = [];
        errors[field].push(issue.message);
      });
      return NextResponse.json({ errors }, { status: 400 });
    }

    const { firstName, lastName, email, password } = validated.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existingPartner = await db.partner.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingPartner) {
      return NextResponse.json(
        { errors: { email: ["This email is already registered"] } },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create partner
    const partner = await db.partner.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        passwordHash,
        level: "STARTER",
        status: "ACTIVE",
        availableBalance: 0,
        pendingBalance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        totalFTD: 0,
        totalTraders: 0,
        totalDeposits: 0,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully",
        data: {
          id: partner.id,
          email: partner.email,
          name: `${partner.firstName} ${partner.lastName}`,
          status: partner.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
