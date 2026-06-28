import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { useToast } from '@/stores/toast.store';

type UseFriendshipsOptions = {
  enabled: boolean;
  onAcceptedConversation: (conversationId: string) => void;
};

export function useFriendships({
  enabled,
  onAcceptedConversation,
}: UseFriendshipsOptions) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: friendsData, isLoading: friendsLoading } = useQuery({
    queryKey: ['social-friends'],
    queryFn: () => api.listFriends(),
    enabled,
  });
  const { data: incomingRequestsData, isLoading: incomingRequestsLoading } =
    useQuery({
      queryKey: ['social-friends', 'incoming'],
      queryFn: () => api.listIncomingFriendRequests(),
      enabled,
    });
  const { data: sentRequestsData, isLoading: sentRequestsLoading } = useQuery({
    queryKey: ['social-friends', 'sent'],
    queryFn: () => api.listSentFriendRequests(),
    enabled,
  });

  const sendFriendRequest = useMutation({
    mutationFn: (targetUserId: string) => api.sendFriendRequest(targetUserId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['social-friends'] });
      void queryClient.invalidateQueries({ queryKey: ['social-conversations'] });
      showToast({ title: 'Friend request sent', kind: 'success' });
    },
    onError: (error) =>
      showToast({
        title: error instanceof Error ? error.message : 'Friend request failed',
        kind: 'error',
      }),
  });

  const acceptFriend = useMutation({
    mutationFn: (friendshipId: string) => api.acceptFriendRequest(friendshipId),
    onSuccess: ({ conversation }) => {
      onAcceptedConversation(conversation.id);
      void queryClient.invalidateQueries({ queryKey: ['social-friends'] });
      void queryClient.invalidateQueries({ queryKey: ['social-conversations'] });
      showToast({ title: 'Friend request accepted', kind: 'success' });
    },
    onError: (error) =>
      showToast({
        title: error instanceof Error ? error.message : 'Could not accept',
        kind: 'error',
      }),
  });

  const rejectFriend = useMutation({
    mutationFn: (friendshipId: string) => api.rejectFriendRequest(friendshipId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['social-friends'] });
      void queryClient.invalidateQueries({ queryKey: ['social-conversations'] });
    },
    onError: () =>
      showToast({ title: 'Could not reject request', kind: 'error' }),
  });

  const blockFriend = useMutation({
    mutationFn: (friendshipId: string) => api.blockFriendship(friendshipId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['social-friends'] });
      void queryClient.invalidateQueries({ queryKey: ['social-conversations'] });
    },
    onError: () => showToast({ title: 'Could not block friend', kind: 'error' }),
  });

  const unfriend = useMutation({
    mutationFn: (friendshipId: string) => api.unfriend(friendshipId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['social-friends'] });
      void queryClient.invalidateQueries({ queryKey: ['social-conversations'] });
    },
    onError: () => showToast({ title: 'Could not remove friend', kind: 'error' }),
  });

  return {
    friends: friendsData?.data ?? [],
    incomingRequests: incomingRequestsData?.data ?? [],
    sentRequests: sentRequestsData?.data ?? [],
    loading:
      friendsLoading || incomingRequestsLoading || sentRequestsLoading,
    busy:
      sendFriendRequest.isPending ||
      acceptFriend.isPending ||
      rejectFriend.isPending ||
      blockFriend.isPending ||
      unfriend.isPending,
    sendFriendRequest: (targetUserId: string) =>
      sendFriendRequest.mutate(targetUserId),
    acceptFriendRequest: (friendshipId: string) =>
      acceptFriend.mutate(friendshipId),
    rejectFriendRequest: (friendshipId: string) =>
      rejectFriend.mutate(friendshipId),
    blockFriend: (friendshipId: string) => blockFriend.mutate(friendshipId),
    unfriend: (friendshipId: string) => unfriend.mutate(friendshipId),
  };
}
