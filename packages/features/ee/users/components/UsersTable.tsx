import { useState, useRef, useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Badge,
  Button,
  ConfirmationDialogContent,
  Dialog,
  DropdownActions,
  showToast,
  Table,
  TextField,
} from "@calcom/ui";
import { Edit, Trash, Lock } from "@calcom/ui/components/icon";

import { withLicenseRequired } from "../../common/components/LicenseRequired";

const { Cell, ColumnTitle, Header, Row } = Table;

const FETCH_LIMIT = 20;

function UsersTableBare() {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { t } = useLocale();
  const utils = trpc.useContext();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const mutation = trpc.viewer.users.delete.useMutation({
    onSuccess: async () => {
      showToast("User has been deleted", "success");
      // Lets not invalidated the whole cache, just remove the user from the cache.
      // usefull cause in prod this will be fetching 100k+ users
      // FIXME: Tested locally and it doesnt't work, need to investigate
      utils.viewer.admin.listPaginated.setInfiniteData({ limit: FETCH_LIMIT }, (cachedData) => {
        if (!cachedData) {
          return {
            pages: [],
            pageParams: [],
          };
        }
        return {
          ...cachedData,
          pages: cachedData.pages.map((page) => ({
            ...page,
            rows: page.rows.filter((row) => row.id !== userToDelete),
          })),
        };
      });
    },
    onError: (err) => {
      console.error(err.message);
      showToast("There has been an error deleting this user.", "error");
    },
    onSettled: () => {
      setUserToDelete(null);
    },
  });

  const { data, fetchNextPage, isFetchingNextPage, hasNextPage } =
    trpc.viewer.admin.listPaginated.useInfiniteQuery(
      {
        limit: FETCH_LIMIT,
        searchTerm: debouncedSearchTerm,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        keepPreviousData: true,
        refetchOnWindowFocus: false,
      }
    );

  const sendPasswordResetEmail = trpc.viewer.admin.sendPasswordReset.useMutation({
    onSuccess: () => {
      showToast("Password reset email has been sent", "success");
    },
  });

  //we must flatten the array of arrays from the useInfiniteQuery hook
  const flatData = useMemo(() => data?.pages?.flatMap((page) => page.rows) ?? [], [data]);
  const totalDBRowCount = data?.pages?.[0]?.meta?.totalRowCount ?? 0;
  const totalFetched = flatData.length;

  //called on scroll and possibly on mount to fetch more data as the user scrolls and reaches bottom of table
  // const fetchMoreOnBottomReached = useCallback(
  //   (containerRefElement?: HTMLDivElement | null) => {
  //     if (containerRefElement) {
  //       const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
  //       //once the user has scrolled within 300px of the bottom of the table, fetch more data if there is any
  //       if (scrollHeight - scrollTop - clientHeight < 300 && !isFetching && totalFetched < totalDBRowCount) {
  //         fetchNextPage();
  //       }
  //     }
  //   },
  //   [fetchNextPage, isFetching, totalFetched, totalDBRowCount]
  // );

  // useEffect(() => {
  //   fetchMoreOnBottomReached(tableContainerRef.current);
  // }, [fetchMoreOnBottomReached]);

  const [userToDelete, setUserToDelete] = useState<number | null>(null);

  return (
    <>
      <TextField
        placeholder="username or email"
        label="Search"
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <div className="border-subtle rounded-md">
        <Table>
          <Header>
            <ColumnTitle widthClassNames="w-auto">User</ColumnTitle>
            <ColumnTitle>Create date</ColumnTitle>
            <ColumnTitle>Timezone</ColumnTitle>
            <ColumnTitle>Role</ColumnTitle>
            <ColumnTitle widthClassNames="w-auto">
              <span className="sr-only">Edit</span>
            </ColumnTitle>
          </Header>

          <tbody className="divide-subtle divide-y rounded-md">
            {flatData.map((user) => (
              <Row key={user.email}>
                <Cell widthClassNames="w-auto">
                  <div className="min-h-10 flex ">
                    {/* <Avatar
                      size="md"
                      alt={`Avatar of ${user.username || "Nameless"}`}
                      gravatarFallbackMd5=""
                      imageSrc={`${WEBAPP_URL}/${user.username}/avatar.png?orgId=${user.organizationId}`}
                    /> */}

                    <div className="text-subtle font-medium">
                      <span className="text-default">{user.name}</span>
                      <br />
                      <span>/{user.username}</span>
                      <br />
                      <span className="break-all">{user.email}</span>
                      <br />
                      <span className="break-all">{user.phone}</span>
                    </div>
                  </div>
                </Cell>
                <Cell>{dayjs(user.createdDate).format("ddd. DD [of] MMM, YYYY hh:mmA")}</Cell>
                <Cell>{user.timeZone}</Cell>
                <Cell>
                  <Badge className="capitalize" variant={user.role === "ADMIN" ? "red" : "gray"}>
                    {user.role.toLowerCase()}
                  </Badge>
                </Cell>
                <Cell widthClassNames="w-auto">
                  <div className="flex w-full justify-end">
                    <DropdownActions
                      actions={[
                        {
                          id: "edit",
                          label: "Edit",
                          href: `/settings/console/users/${user.id}/edit`,
                          icon: Edit,
                        },
                        {
                          id: "reset-password",
                          label: "Reset Password",
                          onClick: () => sendPasswordResetEmail.mutate({ userId: user.id }),
                          icon: Lock,
                        },
                        {
                          id: "delete",
                          label: "Delete",
                          color: "destructive",
                          onClick: () => setUserToDelete(user.id),
                          icon: Trash,
                        },
                      ]}
                    />
                  </div>
                </Cell>
              </Row>
            ))}
          </tbody>
        </Table>
        <div className="text-default p-4 text-center">
          <Button
            color="minimal"
            loading={isFetchingNextPage}
            disabled={!hasNextPage}
            onClick={() => fetchNextPage()}>
            {hasNextPage ? t("load_more_results") : t("no_more_results")}
          </Button>
        </div>
        <DeleteUserDialog
          user={userToDelete}
          onClose={() => setUserToDelete(null)}
          onConfirm={() => {
            if (!userToDelete) return;
            mutation.mutate({ userId: userToDelete });
          }}
        />
      </div>
    </>
  );
}

const DeleteUserDialog = ({
  user,
  onConfirm,
  onClose,
}: {
  user: number | null;
  onConfirm: () => void;
  onClose: () => void;
}) => {
  return (
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- noop
    <Dialog name="delete-user" open={!!user} onOpenChange={(open) => (open ? () => {} : onClose())}>
      <ConfirmationDialogContent
        title="Delete User"
        confirmBtnText="Delete"
        cancelBtnText="Cancel"
        variety="danger"
        onConfirm={onConfirm}>
        <p>Are you sure you want to delete this user?</p>
      </ConfirmationDialogContent>
    </Dialog>
  );
};

export const UsersTable = withLicenseRequired(UsersTableBare);
