import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(255),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72, "Password must be at most 72 characters."),
    role: z.enum(["CUSTOMER", "BUSINESS"]),
    businessName: z.string().trim().min(2).max(120).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "BUSINESS" && !data.businessName) {
      ctx.addIssue({
        code: "custom",
        path: ["businessName"],
        message: "Business name is required when registering as a business.",
      });
    }
  });

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, "Password is required."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
