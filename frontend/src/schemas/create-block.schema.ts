import { z } from 'zod';

import { BLOCK_SECTORS } from '@/types/block';

export const createBlockFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome do bloco.')
    .max(80, 'Nome muito longo.'),
  sector: z.enum(BLOCK_SECTORS, { message: 'Selecione o setor.' }),
  sectorIds: z
    .array(z.string())
    .min(1, 'Selecione pelo menos um centro de custo.'),
});

export type CreateBlockFormValues = z.infer<typeof createBlockFormSchema>;
