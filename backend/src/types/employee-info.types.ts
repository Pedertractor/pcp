import type { Unit } from '../generated/prisma/enums.js';

export type EmployeeVerifyUnit = Unit;

export type EmployeeInfoByCardResponse = {
  id: number;
  name: string;
  cardNumber: string;
  unit: EmployeeVerifyUnit;
  status?: boolean;
  Designation?: Array<{
    sector: { name: string; costCenter?: string };
    position: { name: string };
  }>;
};
