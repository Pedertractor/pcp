import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  createBlockFormSchema,
  type CreateBlockFormValues,
} from '@/schemas/create-block.schema';
import {
  blockDetailQueryKey,
  blocksListQueryKey,
  createBlock,
  uploadBlockPlanImage,
} from '@/services/blocks/block.service';
import {
  listSectors,
  sectorsListQueryKey,
} from '@/services/sectors/sector.service';
import type { SectorOption } from '@/types/sector';

const DEFAULT_VALUES: CreateBlockFormValues = {
  name: '',
  sector: 'PAINT',
  sectorIds: [],
};

export function useCreateBlock() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [openDialog, setOpenDialog] = useState(false);
  const [planFile, setPlanFile] = useState<File | null>(null);

  const form = useForm<CreateBlockFormValues>({
    resolver: zodResolver(createBlockFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const sector = watch('sector');
  const sectorIds = watch('sectorIds');

  useEffect(() => {
    if (!openDialog) {
      reset(DEFAULT_VALUES);
      setPlanFile(null);
    }
  }, [openDialog, reset]);

  const sectorsQuery = useQuery({
    queryKey: sectorsListQueryKey,
    queryFn: listSectors,
    enabled: openDialog,
    staleTime: 5 * 60_000,
  });

  const sectors = useMemo(() => sectorsQuery.data ?? [], [sectorsQuery.data]);

  const selectedSectors = useMemo(() => {
    const byId = new Map(sectors.map((item) => [item.id, item]));
    return sectorIds
      .map((id) => byId.get(id))
      .filter((item): item is SectorOption => Boolean(item));
  }, [sectors, sectorIds]);

  function toggleSector(id: string): void {
    const next = sectorIds.includes(id)
      ? sectorIds.filter((item) => item !== id)
      : [...sectorIds, id];
    setValue('sectorIds', next, { shouldValidate: true });
  }

  const mutationCreateBlock = useMutation({
    mutationFn: async (data: CreateBlockFormValues) => {
      const block = await createBlock({
        name: data.name.trim(),
        sector: data.sector,
        sectorIds: data.sectorIds,
      });
      if (!planFile) {
        return block;
      }
      try {
        return await uploadBlockPlanImage(block.id, planFile);
      } catch (error) {
        toast.error(
          `Bloco criado, mas a planta não foi enviada: ${(error as Error).message}`,
        );
        return block;
      }
    },
    onSuccess: (block) => {
      toast.success('Bloco criado com sucesso.');
      queryClient.setQueryData(blockDetailQueryKey(block.id), block);
      void queryClient.invalidateQueries({ queryKey: blocksListQueryKey });
      void queryClient.invalidateQueries({ queryKey: sectorsListQueryKey });
      setOpenDialog(false);
      navigate(`/controle-produtivo/${block.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    openDialog,
    setOpenDialog,
    register,
    errors,
    sector,
    setValue,
    sectors,
    sectorsLoading: sectorsQuery.isLoading,
    sectorsError: sectorsQuery.isError ? sectorsQuery.error.message : null,
    refetchSectors: () => void sectorsQuery.refetch(),
    selectedSectorIds: sectorIds,
    selectedSectors,
    toggleSector,
    planFile,
    setPlanFile,
    handleSubmit: handleSubmit((data) => mutationCreateBlock.mutate(data)),
    isSubmitting: mutationCreateBlock.isPending,
  };
}
