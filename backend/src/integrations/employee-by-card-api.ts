import { getFromBaseApi } from './base-api.js';
import type {
  EmployeeInfoByCardResponse,
  EmployeeVerifyUnit,
} from '../types/employee-info.types.js';

export async function infoByCardAndUnit(
  unit: EmployeeVerifyUnit,
  card: string,
): Promise<EmployeeInfoByCardResponse | null> {
  const trimmedCard = card.trim();
  const encodedCard = encodeURIComponent(trimmedCard);
  const response = await getFromBaseApi<EmployeeInfoByCardResponse>(
    `/employee/get/${encodedCard}/${unit}`,
    { timeout: 5000 },
  );

  if (response.status === 404) {
    return null;
  }

  return response.data;
}
