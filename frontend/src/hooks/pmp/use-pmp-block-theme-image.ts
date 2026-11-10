import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import {
  fetchPmpBlockThemeImage,
  pmpBlockThemeImageQueryKey,
} from '@/services/pmp/pmp-block.service';
import type { PmpBlockThemeImage } from '@/types/pmp-block';

export function usePmpBlockThemeImage(image: PmpBlockThemeImage | null) {
  const imageQuery = useQuery({
    queryKey: pmpBlockThemeImageQueryKey(image?.id ?? ''),
    queryFn: () => fetchPmpBlockThemeImage(image!.url),
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
