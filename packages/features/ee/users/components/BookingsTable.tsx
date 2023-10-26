import { useState, useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  ConfirmationDialogContent,
  Dialog,
  DropdownActions,
  showToast,
  Table,
  TextField,
} from "@calcom/ui";

import { withLicenseRequired } from "../../common/components/LicenseRequired";

const { Cell, ColumnTitle, Header, Row } = Table;

const FETCH_LIMIT = 25;

function BookingListBare() {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const mutation = trpc.viewer.users.delete.useMutation({
    onSuccess: async () => {
      showToast("Booking has been deleted", "success");
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
    trpc.viewer.admin.bookingsPaginated.useInfiniteQuery(
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

  const [userToDelete, setUserToDelete] = useState<number | null>(null);

  return (
    <>
      <TextField
        placeholder="username or title booking"
        label="Search"
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <div className="border-subtle rounded-md">
        <Table>
          <Header>
            <ColumnTitle widthClassNames="w-auto">User</ColumnTitle>
            <ColumnTitle>Title</ColumnTitle>
            <ColumnTitle>Start time</ColumnTitle>
            <ColumnTitle>End time</ColumnTitle>
            <ColumnTitle>Attendees</ColumnTitle>
            <ColumnTitle widthClassNames="w-auto">
              <span className="sr-only">Edit</span>
            </ColumnTitle>
          </Header>

          <tbody className="divide-subtle divide-y rounded-md">
            {flatData.map((book) => (
              <Row key={book.user?.username}>
                <Cell widthClassNames="w-auto">
                  <div className="min-h-10 flex ">
                    <div className="text-subtle font-medium">
                      <span className="text-default">{book.user?.name}</span>
                      <br />
                      <span>/{book.user?.username}</span>
                      <br />
                      <span className="break-all">{book.user?.phone}</span>
                    </div>
                  </div>
                </Cell>
                <Cell>{book.title}</Cell>
                <Cell>{dayjs(book.startTime).format("ddd. DD [of] MMM, YYYY hh:mmA")}</Cell>
                <Cell>{dayjs(book.endTime).format("ddd. DD [of] MMM, YYYY hh:mmA")}</Cell>
                <Cell>
                  {book.attendeesMany.map((att) => (
                    <>
                      <span className="text-default">{att.attendee.name}</span>
                      <br />
                      <span className="text-default">{att.attendee.phone}</span>
                    </>
                  ))}
                </Cell>
                <Cell widthClassNames="w-auto">
                  <div className="flex w-full justify-end">
                    <DropdownActions
                      actions={
                        [
                          // {
                          //   id: "edit",
                          //   label: "Edit",
                          //   href: `/settings/console/users/${user.id}/edit`,
                          //   icon: Edit,
                          // },
                          // {
                          //   id: "delete",
                          //   label: "Delete",
                          //   color: "destructive",
                          //   onClick: () => setUserToDelete(book.id),
                          //   icon: Trash,
                          // },
                        ]
                      }
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

export const BookingList = withLicenseRequired(BookingListBare);
