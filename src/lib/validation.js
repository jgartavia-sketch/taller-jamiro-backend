import { z } from "zod";
export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());
export const passwordSchema = z.string()
  .min(8, "La contraseña debe tener mínimo 8 caracteres.")
  .max(72)
  .regex(/\p{Lu}/u, "La contraseña debe incluir al menos una letra mayúscula.")
  .regex(/[0-9]/, "La contraseña debe combinar letras y números.")
  .refine(
  (value) => Buffer.byteLength(value, "utf8") <= 72,
  "La contraseña supera el límite de 72 bytes.",
);
export const dateSchema = z.string().trim().refine((value) => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "La fecha no es válida.").optional();

export const customerRegistrationSchema = z.object({
  name: z.string().trim().min(3).max(100),
  email: emailSchema,
  phone: z.string().trim().min(8).max(30),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((input) => input.password === input.confirmPassword, {
  message: "Las contraseñas no coinciden.", path: ["confirmPassword"],
});
