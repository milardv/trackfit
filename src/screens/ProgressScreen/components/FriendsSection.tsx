import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type {
  CopySharedPlanResult,
  FriendRequestRecord,
  FriendshipRecord,
  PublicUserProfile,
  SharedPlanRecord,
  SendFriendRequestResult,
} from "../../../services/firestoreService.ts";
import {
  acceptFriendRequest,
  copySharedPlanToUser,
  declineFriendRequest,
  listDiscoverableUserProfiles,
  listFriendships,
  listFriendsSharedPlans,
  listIncomingFriendRequests,
  listSentFriendRequests,
  searchUserProfiles,
  sendFriendRequest,
} from "../../../services/firestoreService.ts";
import type { FriendsSectionProps } from "./types.ts";

function buildAvatarUrl(name: string, background: string, color: string): string {
  const encodedName = encodeURIComponent(name.trim() || "TrackFit");
  return `https://ui-avatars.com/api/?name=${encodedName}&background=${background}&color=${color}&bold=true`;
}

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getFirstName(displayName: string): string {
  const [firstName] = displayName.trim().split(/\s+/);
  return firstName || "toi";
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));

  if (diffHours < 1) {
    return "À l'instant";
  }
  if (diffHours < 24) {
    return `Il y a ${diffHours} h`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays <= 1) {
    return "Hier";
  }

  return `Il y a ${diffDays} j`;
}

function getUserAvatar(profile: PublicUserProfile): string {
  return profile.photoURL ?? buildAvatarUrl(profile.displayName, "214833", "d9ffe1");
}

function getCounterpartProfile(
  friendship: FriendshipRecord,
  currentUserId: string,
): PublicUserProfile | null {
  const counterpart = friendship.members.find((member) => member.uid !== currentUserId);
  if (!counterpart) {
    return null;
  }

  return {
    id: counterpart.uid,
    displayName: counterpart.displayName,
    email: counterpart.email,
    photoURL: counterpart.photoURL ?? null,
  };
}

interface FriendCardItem {
  id: string;
  profile: PublicUserProfile;
  presenceLabel: string;
  activityLabel: string;
  activityValue: string;
  isOnline: boolean;
  sharedPlanCount: number;
}

function toFriendCardItem(
  friendship: FriendshipRecord,
  currentUserId: string,
  sharedPlanCount: number,
): FriendCardItem | null {
  const counterpart = getCounterpartProfile(friendship, currentUserId);
  if (!counterpart) {
    return null;
  }

  return {
    id: friendship.id,
    profile: counterpart,
    presenceLabel: formatRelativeTime(friendship.updatedAt.toDate()),
    activityLabel: sharedPlanCount > 0 ? "Seances publiques" : "Amitié TrackFit",
    activityValue:
      sharedPlanCount > 0
        ? `${sharedPlanCount} seance${sharedPlanCount > 1 ? "s" : ""} disponible${sharedPlanCount > 1 ? "s" : ""}`
        : "Connecté pour comparer vos séances",
    isOnline: false,
    sharedPlanCount,
  };
}

function onFriendCardKeyDown(
  event: ReactKeyboardEvent<HTMLElement>,
  onOpen: () => void,
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onOpen();
  }
}

interface DirectoryUserCardProps {
  profile: PublicUserProfile;
  actionLabel: string;
  disabled?: boolean;
  onAction: () => void;
}

function DirectoryUserCard({
  profile,
  actionLabel,
  disabled = false,
  onAction,
}: DirectoryUserCardProps) {
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/10 p-3">
      <img
        src={getUserAvatar(profile)}
        alt={profile.displayName}
        className="h-11 w-11 rounded-2xl border border-white/10 object-cover"
        referrerPolicy="no-referrer"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">{profile.displayName}</p>
        <p className="truncate text-xs text-slate-400">{profile.email}</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        disabled={disabled}
        className={`rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] transition-colors ${
          disabled
            ? "cursor-not-allowed border-white/10 bg-white/[0.04] text-slate-400"
            : "border-primary/25 bg-primary/10 text-primary hover:bg-primary/20"
        }`}
      >
        {actionLabel}
      </button>
    </article>
  );
}

export function FriendsSection({ userId, displayName }: FriendsSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestRecord[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequestRecord[]>([]);
  const [friendships, setFriendships] = useState<FriendshipRecord[]>([]);
  const [friendSharedPlans, setFriendSharedPlans] = useState<SharedPlanRecord[]>([]);
  const [directoryUsers, setDirectoryUsers] = useState<PublicUserProfile[]>([]);
  const [isLoadingSocialData, setIsLoadingSocialData] = useState(true);
  const [isLoadingSharedPlans, setIsLoadingSharedPlans] = useState(true);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [sharedPlansError, setSharedPlansError] = useState<string | null>(null);
  const [sharedPlansStatus, setSharedPlansStatus] = useState<string | null>(null);
  const [sendingRequestToUserId, setSendingRequestToUserId] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [copyingSharedPlanId, setCopyingSharedPlanId] = useState<string | null>(null);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(searchQuery);
  const normalizedQuery = useMemo(
    () => normalizeSearchValue(deferredQuery),
    [deferredQuery],
  );
  const firstName = useMemo(() => getFirstName(displayName), [displayName]);
  const isSearchActive = normalizedQuery.length > 0;

  useEffect(() => {
    let cancelled = false;

    const loadRelationshipData = async (showLoadingState: boolean) => {
      if (showLoadingState) {
        setIsLoadingSocialData(true);
      }

      try {
        const [incoming, sent, existingFriendships] = await Promise.all([
          listIncomingFriendRequests(userId, 24),
          listSentFriendRequests(userId, 24),
          listFriendships(userId, 40),
        ]);

        if (!cancelled) {
          setIncomingRequests(incoming);
          setSentRequests(sent);
          setFriendships(existingFriendships);
          setSocialError(null);
        }
      } catch {
        if (!cancelled) {
          setSocialError(
            "Impossible de charger vos demandes et vos amis pour le moment.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSocialData(false);
        }
      }
    };

    void loadRelationshipData(true);
    const intervalId = window.setInterval(() => {
      void loadRelationshipData(false);
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    const loadSharedPlans = async (showLoadingState: boolean) => {
      if (showLoadingState) {
        setIsLoadingSharedPlans(true);
      }

      try {
        const sharedPlans = await listFriendsSharedPlans(userId, 24);

        if (!cancelled) {
          setFriendSharedPlans(sharedPlans);
          setSharedPlansError(null);
        }
      } catch {
        if (!cancelled) {
          setSharedPlansError(
            "Impossible de charger les seances publiques de tes amis pour le moment.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSharedPlans(false);
        }
      }
    };

    void loadSharedPlans(true);
    const intervalId = window.setInterval(() => {
      void loadSharedPlans(false);
    }, 20000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setIsLoadingDirectory(true);

      const loader = isSearchActive
        ? searchUserProfiles(userId, normalizedQuery, 8)
        : listDiscoverableUserProfiles(userId, 6);

      void loader
        .then((profiles) => {
          if (!cancelled) {
            setDirectoryUsers(profiles);
            setDirectoryError(null);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setDirectoryUsers([]);
            setDirectoryError(
              "Impossible d interroger les profils utilisateurs pour le moment.",
            );
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoadingDirectory(false);
          }
        });
    }, isSearchActive ? 220 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isSearchActive, normalizedQuery, userId]);

  const incomingRequesterIds = useMemo(
    () => new Set(incomingRequests.map((request) => request.fromUserId)),
    [incomingRequests],
  );
  const sentRecipientIds = useMemo(
    () => new Set(sentRequests.map((request) => request.toUserId)),
    [sentRequests],
  );
  const friendIds = useMemo(
    () =>
      new Set(
        friendships
          .map((friendship) => getCounterpartProfile(friendship, userId)?.id ?? null)
          .filter((value): value is string => value !== null),
      ),
    [friendships, userId],
  );
  const sharedPlanCountByOwnerId = useMemo(() => {
    const counts = new Map<string, number>();

    friendSharedPlans.forEach((sharedPlan) => {
      counts.set(
        sharedPlan.ownerProfile.id,
        (counts.get(sharedPlan.ownerProfile.id) ?? 0) + 1,
      );
    });

    return counts;
  }, [friendSharedPlans]);

  const pendingRequestEntries = useMemo(
    () =>
      incomingRequests.map((request) => ({
        id: request.id,
        profile: request.fromProfile,
        note:
          request.note.trim().length > 0
            ? request.note
            : `${request.fromProfile.displayName} souhaite vous ajouter sur TrackFit.`,
      })),
    [incomingRequests],
  );

  const friendEntries = useMemo(
    () =>
      friendships
        .map((friendship) =>
          toFriendCardItem(
            friendship,
            userId,
            sharedPlanCountByOwnerId.get(
              getCounterpartProfile(friendship, userId)?.id ?? "",
            ) ?? 0,
          ),
        )
        .filter((entry): entry is FriendCardItem => entry !== null),
    [friendships, sharedPlanCountByOwnerId, userId],
  );
  const selectedFriendEntry = useMemo(
    () => friendEntries.find((entry) => entry.profile.id === selectedFriendId) ?? null,
    [friendEntries, selectedFriendId],
  );
  const selectedFriendSharedPlans = useMemo(
    () =>
      friendSharedPlans.filter(
        (sharedPlan) => sharedPlan.ownerProfile.id === selectedFriendId,
      ),
    [friendSharedPlans, selectedFriendId],
  );

  const visibleDirectoryUsers = useMemo(
    () =>
      directoryUsers.filter(
        (profile) =>
          !friendIds.has(profile.id) && !incomingRequesterIds.has(profile.id),
      ),
    [directoryUsers, friendIds, incomingRequesterIds],
  );

  useEffect(() => {
    if (!selectedFriendId) {
      return;
    }

    const stillVisible = friendEntries.some((entry) => entry.profile.id === selectedFriendId);
    if (!stillVisible) {
      setSelectedFriendId(null);
    }
  }, [friendEntries, selectedFriendId]);

  useEffect(() => {
    if (!selectedFriendEntry) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedFriendId(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedFriendEntry]);

  const handleSendRequest = async (profile: PublicUserProfile) => {
    if (sendingRequestToUserId) {
      return;
    }

    setSendingRequestToUserId(profile.id);
    setSocialError(null);

    try {
      const result: SendFriendRequestResult = await sendFriendRequest(userId, profile.id);

      if (result.status === "sent") {
        const request = await listSentFriendRequests(userId, 24);
        setSentRequests(request);
      } else {
        const [incoming, sent, existingFriendships, sharedPlans] = await Promise.all([
          listIncomingFriendRequests(userId, 24),
          listSentFriendRequests(userId, 24),
          listFriendships(userId, 40),
          listFriendsSharedPlans(userId, 24),
        ]);
        setIncomingRequests(incoming);
        setSentRequests(sent);
        setFriendships(existingFriendships);
        setFriendSharedPlans(sharedPlans);
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Impossible d envoyer la demande pour le moment.";
      setSocialError(message);
    } finally {
      setSendingRequestToUserId(null);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (processingRequestId) {
      return;
    }

    setProcessingRequestId(requestId);
    setSocialError(null);

    try {
      await acceptFriendRequest(userId, requestId);
      const [incoming, sent, existingFriendships, sharedPlans] = await Promise.all([
        listIncomingFriendRequests(userId, 24),
        listSentFriendRequests(userId, 24),
        listFriendships(userId, 40),
        listFriendsSharedPlans(userId, 24),
      ]);
      setIncomingRequests(incoming);
      setSentRequests(sent);
      setFriendships(existingFriendships);
      setFriendSharedPlans(sharedPlans);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Impossible d accepter la demande pour le moment.";
      setSocialError(message);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    if (processingRequestId) {
      return;
    }

    setProcessingRequestId(requestId);
    setSocialError(null);

    try {
      await declineFriendRequest(userId, requestId);
      const incoming = await listIncomingFriendRequests(userId, 24);
      setIncomingRequests(incoming);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Impossible de refuser la demande pour le moment.";
      setSocialError(message);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleCopySharedPlan = async (sharedPlan: SharedPlanRecord) => {
    if (copyingSharedPlanId) {
      return;
    }

    setCopyingSharedPlanId(sharedPlan.id);
    setSharedPlansError(null);
    setSharedPlansStatus(null);

    try {
      const result: CopySharedPlanResult = await copySharedPlanToUser(userId, sharedPlan.id);
      setSharedPlansStatus(
        `"${sharedPlan.name}" a ete copiee dans tes seances (${result.createdExerciseCount} exercice${result.createdExerciseCount > 1 ? "s" : ""} cree${result.createdExerciseCount > 1 ? "s" : ""}, ${result.reusedExerciseCount} reutilise${result.reusedExerciseCount > 1 ? "s" : ""}).`,
      );
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Impossible de copier cette seance pour le moment.";
      setSharedPlansError(message);
    } finally {
      setCopyingSharedPlanId(null);
    }
  };

  const searchResultsContent = isLoadingDirectory ? (
    <div className="rounded-2xl border border-white/8 bg-black/10 p-4 text-sm text-slate-400">
      Recherche des utilisateurs...
    </div>
  ) : visibleDirectoryUsers.length > 0 ? (
    <div className="space-y-3">
      {visibleDirectoryUsers.map((profile) => (
        <DirectoryUserCard
          key={profile.id}
          profile={profile}
          actionLabel={sentRecipientIds.has(profile.id) ? "Envoyee" : "Ajouter"}
          disabled={sentRecipientIds.has(profile.id) || sendingRequestToUserId === profile.id}
          onAction={() => {
            void handleSendRequest(profile);
          }}
        />
      ))}
    </div>
  ) : (
    <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-sm text-slate-400">
      Aucun utilisateur trouvé dans la base pour cette recherche.
    </div>
  );

  const requestsContent = isLoadingSocialData ? (
    <div className="rounded-2xl border border-white/8 bg-black/10 p-4 text-sm text-slate-400">
      Chargement des demandes...
    </div>
  ) : pendingRequestEntries.length > 0 ? (
    <div className="space-y-3">
      {pendingRequestEntries.slice(0, 3).map((request) => {
        const isProcessing = processingRequestId === request.id;

        return (
          <div
            key={request.id}
            className="rounded-2xl border border-white/8 bg-black/10 p-3"
          >
            <div className="flex items-start gap-3">
              <img
                src={getUserAvatar(request.profile)}
                alt={request.profile.displayName}
                className="h-12 w-12 rounded-2xl border border-white/10 object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">
                  {request.profile.displayName}
                </p>
                <p className="truncate text-xs text-slate-400">{request.profile.email}</p>
                <p className="mt-2 text-xs leading-5 text-slate-300">{request.note}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handleAcceptRequest(request.id);
                    }}
                    disabled={isProcessing}
                    className="flex h-9 items-center justify-center rounded-xl bg-primary/15 px-3 text-xs font-bold uppercase tracking-[0.12em] text-primary transition-colors hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Accepter
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleDeclineRequest(request.id);
                    }}
                    disabled={isProcessing}
                    className="flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-200 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Refuser
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-sm text-slate-400">
      Aucune demande d'ajout reçue pour le moment.
    </div>
  );

  const suggestionsContent = isLoadingDirectory && !isSearchActive ? (
    <div className="rounded-2xl border border-white/8 bg-black/10 p-4 text-sm text-slate-400">
      Chargement des profils suggérés...
    </div>
  ) : !isSearchActive && visibleDirectoryUsers.length > 0 ? (
    <div className="space-y-4">
      <div className="flex -space-x-3">
        {visibleDirectoryUsers.slice(0, 4).map((profile) => (
          <img
            key={`stack-${profile.id}`}
            src={getUserAvatar(profile)}
            alt={profile.displayName}
            className="h-10 w-10 rounded-full border-2 border-[#1a3424] object-cover"
            referrerPolicy="no-referrer"
          />
        ))}
        {visibleDirectoryUsers.length > 4 ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1a3424] bg-surface-container-high text-[11px] font-bold text-white">
            +{visibleDirectoryUsers.length - 4}
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        {visibleDirectoryUsers.slice(0, 2).map((profile) => (
          <DirectoryUserCard
            key={profile.id}
            profile={profile}
            actionLabel={sentRecipientIds.has(profile.id) ? "Envoyee" : "Ajouter"}
            disabled={sentRecipientIds.has(profile.id) || sendingRequestToUserId === profile.id}
            onAction={() => {
              void handleSendRequest(profile);
            }}
          />
        ))}
      </div>
    </div>
  ) : (
    <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-sm text-slate-400">
      Aucun profil disponible à proposer pour le moment.
    </div>
  );

  const friendsContent = isLoadingSocialData ? (
    <div className="rounded-2xl border border-white/8 bg-[#12271b]/70 p-4 text-sm text-slate-400">
      Chargement de vos amis...
    </div>
  ) : friendEntries.length > 0 ? (
    <div className="space-y-3">
      {friendEntries.map((friend) => (
        <article
          key={friend.id}
          role="button"
          tabIndex={0}
          onClick={() => setSelectedFriendId(friend.profile.id)}
          onKeyDown={(event) =>
            onFriendCardKeyDown(event, () => setSelectedFriendId(friend.profile.id))}
          className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-white/8 bg-[#12271b]/80 p-4 transition-colors hover:bg-[#173222]"
        >
          <div className="relative shrink-0">
            <img
              src={getUserAvatar(friend.profile)}
              alt={friend.profile.displayName}
              className="h-14 w-14 rounded-2xl border border-white/10 object-cover"
              referrerPolicy="no-referrer"
            />
            {friend.isOnline ? (
              <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#12271b] bg-primary" />
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="truncate text-sm font-bold text-white">
                  {friend.profile.displayName}
                </h4>
                <p className="truncate text-xs text-slate-400">{friend.profile.email}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300">
                  {friend.presenceLabel}
                </span>
                {friend.sharedPlanCount > 0 ? (
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                    {friend.sharedPlanCount} seance{friend.sharedPlanCount > 1 ? "s" : ""}
                  </span>
                ) : null}
              </div>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-300">
              {friend.activityLabel}:{" "}
              <span className="font-semibold text-white">{friend.activityValue}</span>
            </p>
          </div>

          <span className="material-symbols-outlined text-slate-500 transition-colors group-hover:text-primary">
            chevron_right
          </span>
        </article>
      ))}
    </div>
  ) : (
    <div className="rounded-2xl border border-dashed border-white/10 bg-[#12271b]/70 p-4 text-sm text-slate-400">
      Aucun ami enregistré pour le moment.
    </div>
  );

  const selectedFriendModal = selectedFriendEntry ? (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-[30px] border border-primary/15 bg-[#102216] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative border-b border-white/8 px-5 pb-5 pt-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={getUserAvatar(selectedFriendEntry.profile)}
                alt={selectedFriendEntry.profile.displayName}
                className="h-14 w-14 rounded-2xl border border-white/10 object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <p className="truncate text-lg font-black text-white">
                  {selectedFriendEntry.profile.displayName}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {selectedFriendEntry.profile.email}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
                  {selectedFriendSharedPlans.length} seance
                  {selectedFriendSharedPlans.length > 1 ? "s" : ""} publique
                  {selectedFriendSharedPlans.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedFriendId(null)}
              className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-200 transition-colors hover:bg-white/[0.08]"
              aria-label="Fermer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-300">
            Clique sur une seance publique de {selectedFriendEntry.profile.displayName} pour
            l importer dans tes propres seances.
          </div>
        </div>

        <div className="hide-scrollbar relative flex-1 overflow-y-auto px-5 py-5">
          {sharedPlansError ? (
            <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              {sharedPlansError}
            </div>
          ) : null}

          {sharedPlansStatus ? (
            <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary">
              {sharedPlansStatus}
            </div>
          ) : null}

          {isLoadingSharedPlans ? (
            <div className="rounded-2xl border border-white/8 bg-[#12271b]/70 p-4 text-sm text-slate-400">
              Chargement des seances partagees...
            </div>
          ) : selectedFriendSharedPlans.length > 0 ? (
            <div className="space-y-3">
              {selectedFriendSharedPlans.map((sharedPlan) => (
                <article
                  key={sharedPlan.id}
                  className="rounded-3xl border border-white/8 bg-[#12271b]/80 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{sharedPlan.name}</p>
                      <p className="mt-1 text-xs text-slate-400">{sharedPlan.gymName}</p>
                    </div>
                    <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300">
                      {formatRelativeTime(sharedPlan.updatedAt.toDate())}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                      {sharedPlan.exerciseCount} exercice{sharedPlan.exerciseCount > 1 ? "s" : ""}
                    </span>
                    {sharedPlan.estimatedDurationMin ? (
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-200">
                        {sharedPlan.estimatedDurationMin} min
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {sharedPlan.exercises.slice(0, 4).map((exercise, index) => (
                      <span
                        key={`${sharedPlan.id}-${exercise.sourceExerciseId}-detail-${index}`}
                        className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1 text-[11px] font-medium text-slate-200"
                      >
                        {exercise.exerciseName}
                      </span>
                    ))}
                    {sharedPlan.exerciseCount > 4 ? (
                      <span className="px-2 py-1 text-[11px] font-medium text-slate-400">
                        +{sharedPlan.exerciseCount - 4} autres
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        void handleCopySharedPlan(sharedPlan);
                      }}
                      disabled={copyingSharedPlanId === sharedPlan.id}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-bold uppercase tracking-[0.12em] text-background-dark transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-base">download</span>
                      {copyingSharedPlanId === sharedPlan.id
                        ? "Import..."
                        : "Importer dans mes seances"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#12271b]/70 p-4 text-sm text-slate-400">
              {selectedFriendEntry.profile.displayName} n a pas encore de seance publique.
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <section className="relative overflow-hidden rounded-[28px] border border-primary/15 bg-gradient-to-br from-[#163022] via-card-dark to-[#102216] p-5 shadow-[0_18px_45px_rgba(19,236,91,0.08)]">
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-0 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">
                Social
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
                Amis et activité
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">
                Gère le cercle de {firstName}, vois immédiatement les demandes d'ajout reçues et
                réponds-y sans quitter le profil.
              </p>
            </div>

            <div className="grid min-w-[118px] grid-cols-1 gap-2 text-right">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Amis
                </p>
                <p className="mt-1 text-xl font-black text-white">{friendEntries.length}</p>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary/80">
                  Demandes
                </p>
                <p className="mt-1 text-xl font-black text-primary">{pendingRequestEntries.length}</p>
              </div>
            </div>
          </div>

          {pendingRequestEntries.length > 0 ? (
            <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/10 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    person_add
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {pendingRequestEntries.length} demande
                    {pendingRequestEntries.length > 1 ? "s" : ""} d'ajout en attente
                  </p>
                  <p className="text-xs text-slate-300">
                    Elles sont affichées juste en dessous, avec réponse immédiate.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <label className="relative block">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <span className="material-symbols-outlined">search</span>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Rechercher un utilisateur par nom ou email..."
              className="h-14 w-full rounded-2xl border border-white/10 bg-[#12271b]/80 pl-12 pr-4 text-sm font-medium text-white outline-none transition-colors placeholder:text-slate-500 focus:border-primary/40 focus:bg-[#142c1f]"
            />
          </label>

          {socialError ? (
            <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              {socialError}
            </div>
          ) : null}

          {directoryError ? (
            <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              {directoryError}
            </div>
          ) : null}

          {isSearchActive ? (
            <div className="mt-5 rounded-2xl border border-primary/15 bg-[#12271b]/75 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary/85">
                    Résultats
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    Utilisateurs trouvés pour "{searchQuery.trim()}".
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                  {visibleDirectoryUsers.length} profil
                  {visibleDirectoryUsers.length > 1 ? "s" : ""}
                </span>
              </div>

              {searchResultsContent}
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <article className="relative overflow-hidden rounded-2xl border border-white/8 bg-[#173021]/80 p-5">
              <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
              <div className="relative">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-300">
                    Demandes reçues
                  </h3>
                  <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-background-dark">
                    {pendingRequestEntries.length}
                  </span>
                </div>

                {requestsContent}
              </div>
            </article>

            <article className="rounded-2xl border border-white/8 bg-[#1a3424]/85 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-300">
                  Suggestions
                </h3>
                <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                  Utilisateurs
                </span>
              </div>

              {suggestionsContent}
            </article>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary/90">
                Mes amis
              </h3>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                {friendEntries.length} visibles
              </span>
            </div>

            {friendsContent}
          </div>
        </div>
      </section>

      {selectedFriendModal}
    </>
  );
}
