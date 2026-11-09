/** Peça retornada por GET /part/number/... ou /part/unique/... na API base. */
export type BasePartImageRow = {
  id: number;
  partId: number;
  path: string;
  name: string;
  ripSelected: boolean;
  isDeletable: boolean;
};

export type BasePartDetailResponse = {
  id: number;
  partCode: string;
  partNumber: string;
  description: string | null;
  group: string;
  client: string | null;
  serverPath: string | null;
  localPath: string | null;
  review: string | null;
  reviewChanged: boolean;
  status: boolean;
  images?: BasePartImageRow[];
  createdAt: string;
  updatedAt: string;
};
