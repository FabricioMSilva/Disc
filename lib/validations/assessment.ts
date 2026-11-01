import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
});

export const scaleAnswerSchema = z.object({
  assessmentId: z.string().uuid(), questionId: z.string().uuid(), score: z.number().int().min(1).max(5),
});

export const textAnswerSchema = z.object({
  assessmentId: z.string().uuid(), questionId: z.string().uuid(), answer: z.string().max(10000),
});