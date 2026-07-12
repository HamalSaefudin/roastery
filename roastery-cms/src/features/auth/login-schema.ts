import { z } from 'zod'

// Aturan sama dgn DTO backend (docs/01. Authentication/api-contract.md)
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
})

export type LoginValues = z.infer<typeof loginSchema>
