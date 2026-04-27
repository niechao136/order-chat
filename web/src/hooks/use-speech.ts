import { useMutation } from '@tanstack/react-query';

import { synthesizeSpeech } from '@/services/speech';


export function useSpeechAction() {

  const play = useMutation({
    mutationFn: synthesizeSpeech,
  });

  return {
    play,
  };

}
