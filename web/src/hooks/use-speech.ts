import { useMutation } from '@tanstack/react-query';

import { recognizeSpeech, synthesizeSpeech } from '@/services/speech';


export function useSpeechAction() {

  const play = useMutation({
    mutationFn: synthesizeSpeech,
  });

  const recognize = useMutation({
    mutationFn: recognizeSpeech,
  });

  return {
    play,
    recognize,
  };

}
