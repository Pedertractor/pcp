/** Processo retornado pela API base (OF). */
export type BaseOfProcess = {
  OF: number;
  OP: number;
  QTD: number;
  QTD_APT: number;
  employeeName: string | null;
  employeeCard: string | null;
  employeeUnit: string | null;
  employeeId: number | null;
  costCenter: string;
  nameSector: string | null;
};

export type BaseOfProcessStatus = 'completed' | 'in_progress' | 'pending';

export function getBaseOfProcessStatus(process: BaseOfProcess): BaseOfProcessStatus {
  if (process.QTD > 0 && process.QTD_APT >= process.QTD) {
    return 'completed';
  }
  if (process.QTD_APT > 0) {
    return 'in_progress';
  }
  return 'pending';
}

/** Cabeçalho da OF retornado pela API base. */
export type BaseOfHeader = {
  ofNumber: string;
  partCode: string;
  partNumber: string;
  date: string;
  quantity: number;
  originalQuantity: number;
  serialNumber: number | null;
  observation: string;
  partDescription: string | null;
  company: string | null;
};
