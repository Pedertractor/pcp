import z from 'zod';

export const createPmpBlockFormSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do bloco').max(120),
  sectorIds: z
    .array(z.string().min(1))
    .min(1, 'Selecione ao menos um centro de custo'),
});

export type CreatePmpBlockFormValues = z.infer<typeof createPmpBlockFormSchema>;
