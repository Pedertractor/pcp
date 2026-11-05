import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import {
  blockPlanImageQueryKey,
  fetchBlockPlanImage,
} from '@/services/blocks/block.service';
import type { BlockPlanImage } from '@/types/block';

export function useBlockPlanImage(image: BlockPlanImage | null) {
  const imageQuery = useQuery({
    queryKey: blockPlanImageQueryKey(image?.id ?? ''),
    queryFn: () => fetchBlockPlanImage(image!.url),
    enabled: Boolean(image),
    staleTime: Infinity,
  });

  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imageQuery.data) {
      setObjectUrl(null);
      return;
    }

    const url = URL.createObjectURL(imageQuery.data);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageQuery.data]);

  return {
    src: objectUrl,
    isLoading: imageQuery.isLoading,
    isError: imageQuery.isError,
  };
}
