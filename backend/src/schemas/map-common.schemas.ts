import z from 'zod';

export const mapPercent = z.number().min(0).max(100);

export const lineLabelAnchorSchema = z.enum([
  'TOP_LEFT',
  'TOP_RIGHT',
  'BOTTOM_LEFT',
  'BOTTOM_RIGHT',
]);

export type LineLabelAnchor = z.infer<typeof lineLabelAnchorSchema>;
