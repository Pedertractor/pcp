import type { PrismaClient } from '../generated/prisma/client.js';
import { listBaseApiSectors } from '../integrations/sector-api.js';
import type { SectorOption } from '../schemas/sector.schemas.js';
import type { BaseApiSector } from '../types/sector.types.js';

export class SectorService {
  constructor(private readonly prisma: PrismaClient) {}

  async listActiveSectors(): Promise<BaseApiSector[]> {
    const sectors = await listBaseApiSectors();
    return sectors.filter((sector) => sector.status);
  }

  async listSectorOptions(): Promise<SectorOption[]> {
    const [sectors, linked, linkedPmp] = await Promise.all([
      this.listActiveSectors(),
      this.prisma.costCenter.findMany({
        select: {
          sectorIdBaseApi: true,
          block: { select: { id: true, name: true } },
        },
      }),
      this.prisma.pmpCostCenter.findMany({
        select: {
          sectorIdApi: true,
          pmpBlock: { select: { id: true, name: true } },
        },
      }),
    ]);

    const linkedBySector = new Map(
      linked.map((item) => [item.sectorIdBaseApi, item.block]),
    );
    const linkedPmpBySector = new Map(
      linkedPmp.map((item) => [item.sectorIdApi, item.pmpBlock]),
    );

    return sectors
      .map((sector) => ({
        id: sector.id,
        name: sector.name,
        costCenter: sector.costCenter,
        normalizedName: sector.normalizedName,
        operationId: sector.operationId,
        linkedBlock: linkedBySector.get(sector.id) ?? null,
        linkedPmpBlock: linkedPmpBySector.get(sector.id) ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }
}
