import { useQueryClient, useMutation } from '@tanstack/react-query';

import { apiKeys } from '@/hooks/use-api-key';
import { chatKeys } from '@/hooks/use-chat';
import { datasetKeys } from '@/hooks/use-dataset';
import { userKeys } from '@/hooks/use-user';
import { login, register } from '@/services/auth';

export function useAuthAction() {
  const queryClient = useQueryClient();

  const clearCache = async () => {
    await queryClient.invalidateQueries({
      queryKey: apiKeys.all,
      exact: false
    });
    await queryClient.invalidateQueries({
      queryKey: chatKeys.all,
      exact: false
    });
    await queryClient.invalidateQueries({
      queryKey: datasetKeys.all,
      exact: false
    });
    await queryClient.invalidateQueries({
      queryKey: userKeys.all,
      exact: false
    });
  };

  const signIn = useMutation({
    mutationFn: login,
    onSuccess: async (res) => {
      if (res?.status !== 1) {
        throw new Error(res?.msg);
      }
    },
  });

  const signUp = useMutation({
    mutationFn: register,
    onSuccess: async (res) => {
      if (res?.status !== 1) {
        throw new Error(res?.msg);
      }
    },
  });

  return {
    clearCache,
    signIn,
    signUp,
  }
}
