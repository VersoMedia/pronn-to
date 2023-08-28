import { useAutoAnimate } from "@formkit/auto-animate/react";
import format from "date-fns/format";
import getDay from "date-fns/getDay";
import esEs from "date-fns/locale/es";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import moment from "moment";
import type { GetStaticPaths, GetStaticProps } from "next";
import { Fragment, useCallback, useState } from "react";
import React from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { z } from "zod";

import { getLayout } from "@calcom/features/MainLayout";
import { FiltersContainer } from "@calcom/features/bookings/components/FiltersContainer";
//import type { filterQuerySchema } from "@calcom/features/bookings/lib/useFilterQuery";
import { useFilterQuery } from "@calcom/features/bookings/lib/useFilterQuery";
import { ShellMain } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button, HorizontalTabs, Switch } from "@calcom/ui";
import type { VerticalTabItemProps, HorizontalTabItemProps } from "@calcom/ui";
import { Alert } from "@calcom/ui";

//import { Calendar } from "@calcom/ui/components/icon";
import { useInViewObserver } from "@lib/hooks/useInViewObserver";

import PageWrapper from "@components/PageWrapper";
import BookingListItem from "@components/booking/BookingListItem";
import SkeletonLoader from "@components/booking/SkeletonLoader";

import { ssgInit } from "@server/lib/ssg";

import { WipeMyCalActionButton } from "../../../../packages/app-store/wipemycalother/components";

//type BookingListingStatus = z.infer<NonNullable<typeof filterQuerySchema>>["status"];
type BookingOutput = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][0];

type RecurringInfo = {
  recurringEventId: string | null;
  count: number;
  firstDate: Date | null;
  bookings: { [key: string]: Date[] };
};

const tabs: (VerticalTabItemProps | HorizontalTabItemProps)[] = [
  {
    name: "upcoming",
    href: "/bookings/upcoming",
  },
  {
    name: "unconfirmed",
    href: "/bookings/unconfirmed",
  },
  {
    name: "recurring",
    href: "/bookings/recurring",
  },
  {
    name: "past",
    href: "/bookings/past",
  },
  {
    name: "cancelled",
    href: "/bookings/cancelled",
  },
];
const validStatuses = ["upcoming", "recurring", "past", "cancelled", "unconfirmed"] as const;

// const descriptionByStatus: Record<NonNullable<BookingListingStatus>, string> = {
//   upcoming: "upcoming_bookings",
//   recurring: "recurring_bookings",
//   past: "past_bookings",
//   cancelled: "cancelled_bookings",
//   unconfirmed: "unconfirmed_bookings",
// };

const querySchema = z.object({
  status: z.enum(validStatuses),
});

const DnDCalendar = withDragAndDrop(Calendar);
const locales = {
  es: esEs,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function Bookings() {
  const params = useParamsWithFallback();
  const { data: filterQuery } = useFilterQuery();
  const { status } = params ? querySchema.parse(params) : { status: "upcoming" as const };
  const { t } = useLocale();
  const [today, setToday] = useState(new Date());
  const [views, setViews] = useState("week");
  const [typeView, setTypeView] = useState(true);

  const onView = useCallback((newView) => setViews(newView), [setViews]);

  const tabsViewsCalendar = [
    {
      id: "month",
      name: "Mes",
      onClick: () => setViews("month"),
    },
    {
      name: "Semana",
      id: "week",
      onClick: () => setViews("week"),
    },
    {
      name: "Día",
      id: "day",
      onClick: () => setViews("day"),
    },
  ];

  const query = trpc.viewer.bookings.get.useInfiniteQuery(
    {
      limit: 10,
      filters: {
        ...filterQuery,
        status: filterQuery.status ?? status,
      },
    },
    {
      // first render has status `undefined`
      enabled: true,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  // Animate page (tab) tranistions to look smoothing

  const buttonInView = useInViewObserver(() => {
    if (!query.isFetching && query.hasNextPage && query.status === "success") {
      query.fetchNextPage();
    }
  });

  const isEmpty = !query.data?.pages[0]?.bookings.length;

  const shownBookings: Record<string, BookingOutput[]> = {};
  const filterBookings = (booking: BookingOutput) => {
    if (status === "recurring" || status == "unconfirmed" || status === "cancelled") {
      if (!booking.recurringEventId) {
        return true;
      }
      if (
        shownBookings[booking.recurringEventId] !== undefined &&
        shownBookings[booking.recurringEventId].length > 0
      ) {
        shownBookings[booking.recurringEventId].push(booking);
        return false;
      }
      shownBookings[booking.recurringEventId] = [booking];
    } else if (status === "upcoming") {
      return new Date(booking.startTime).toDateString() !== new Date().toDateString();
    }
    return true;
  };

  let recurringInfoToday: RecurringInfo | undefined;

  const bookingsToday =
    query.data?.pages.map((page) =>
      page.bookings.filter((booking: BookingOutput) => {
        recurringInfoToday = page.recurringInfo.find(
          (info) => info.recurringEventId === booking.recurringEventId
        );
        return new Date(booking.startTime).toDateString() === new Date().toDateString();
      })
    )[0] || [];

  const [animationParentRef] = useAutoAnimate<HTMLDivElement>();

  const onClickPreviousWeek = () => {
    let currentToday = moment();
    if (views === "week") {
      currentToday = moment(today).add(-7, "days");
    } else if (views === "month") {
      currentToday = moment(today).add(-1, "month");
    } else {
      currentToday = moment(today).add(-1, "day");
    }

    setToday(currentToday);
  };

  const onClickNextWeek = () => {
    let currentToday = moment();
    if (views === "week") {
      currentToday = moment(today).add(7, "days");
    } else if (views === "month") {
      currentToday = moment(today).add(1, "month");
    } else {
      currentToday = moment(today).add(1, "day");
    }

    setToday(currentToday);
  };

  const onClickToDay = () => {
    setToday(new Date());
  };

  const appointments =
    query.data?.pages.map((page) => page.bookings.map((booking: BookingOutput) => booking))[0] || [];

  return (
    <ShellMain hideHeadingOnMobile heading={t("bookings")} subtitle={t("bookings_description")}>
      <div className="flex w-full flex-col">
        <div className="flex w-full items-center justify-between">
          <HorizontalTabs tabs={tabs} />
          <div className="flex h-9">
            <label className="text-emphasis mr-2 ms-2 align-text-top text-sm font-medium">Lista</label>
            <Switch checked={typeView} onClick={() => setTypeView(!typeView)} style={{ marginTop: -12 }} />
            <label className="text-emphasis ms-2 align-text-top text-sm font-medium">Calendario</label>
          </div>
        </div>
        <div className="flex flex-col flex-wrap lg:flex-row">
          {typeView ? (
            <header className="flex justify-between">
              <HorizontalTabs tabs={tabsViewsCalendar} isButton views={views} />
              <h1 className="ml-4 h-9 pt-2 text-base font-semibold leading-6 text-gray-900 md:w-[140px]">
                {views === "day"
                  ? moment(today).format("DD MMMM YYYY")
                  : moment(today).format("MMMM-YYYY").charAt(0).toUpperCase() +
                    moment(today).format("MMMM YYYY").slice(1)}
              </h1>
              <div className="relative flex items-center rounded-sm bg-neutral-100 bg-white md:items-stretch">
                <div className="pointer-events-none absolute inset-0 rounded-sm " aria-hidden="true" />
                <button
                  type="button"
                  className="flex h-9 items-center justify-center rounded-l-sm  py-1.5 pl-3 pr-4 text-gray-400 hover:text-gray-500 focus:relative md:w-9 md:px-2"
                  onClick={onClickPreviousWeek}>
                  <span className="sr-only">Previous period</span>
                  <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" color="#000" />
                </button>
                <button
                  type="button"
                  className="h-9 rounded-[4px] px-3.5 py-1.5 text-sm font-normal text-gray-900 ring-1 ring-inset ring-[#262626] hover:bg-gray-50 focus:relative md:py-0"
                  onClick={onClickToDay}>
                  Hoy
                </button>
                <span className="relative -mx-px h-5 w-px bg-gray-300 md:hidden" />
                <button
                  type="button"
                  className="flex h-9 items-center justify-center rounded-r-sm py-1.5 pl-4 pr-3 text-gray-400 hover:text-gray-500 focus:relative md:w-9 md:px-2"
                  onClick={onClickNextWeek}>
                  <span className="sr-only">Next period</span>
                  <ChevronRightIcon className="h-5 w-5" aria-hidden="true" color="#000" />
                </button>
              </div>
            </header>
          ) : (
            <div />
          )}
          <div className="max-w-full overflow-x-auto xl:ml-auto">
            <FiltersContainer />
          </div>
        </div>
        <main className="w-full">
          <div className="flex w-full flex-col" ref={animationParentRef}>
            {query.status === "error" && (
              <Alert severity="error" title={t("something_went_wrong")} message={query.error.message} />
            )}
            {(query.status === "loading" || query.isPaused) && <SkeletonLoader />}
            {query.status !== "loading" && typeView && (
              <div className="flex hidden h-[100vh] flex-col bg-white lg:block">
                <DnDCalendar
                  culture="es"
                  localizer={localizer}
                  defaultDate={new Date()}
                  date={today}
                  defaultView={views}
                  drilldownView={views}
                  onView={onView}
                  view={views}
                  toolbar={false}
                  events={appointments
                    .filter((ap) => ap.status !== "CANCELLED")
                    .map((ap) => ({
                      title: ap.attendees[0].name,
                      start: new Date(ap.startTime),
                      end: new Date(ap.endTime),
                    }))}
                  formats={{
                    timeGutterFormat: (date, culture, localizer) => localizer.format(date, "hh a", culture),
                    dayFormat: (date, culture, localizer) => localizer.format(date, "eeee d", culture),
                  }}
                  selectable
                  popup
                  resizable
                />
              </div>
            )}
            {!typeView && (
              <>
                {!!bookingsToday.length && status === "upcoming" && (
                  <div className="mb-6 pt-2 xl:pt-0">
                    <WipeMyCalActionButton bookingStatus={status} bookingsEmpty={isEmpty} />
                    <p className="text-subtle mb-2 text-xs font-medium uppercase leading-4">{t("today")}</p>
                    <div className="border-subtle overflow-hidden rounded-md border">
                      <table className="w-full max-w-full table-fixed">
                        <tbody className="bg-default divide-subtle divide-y" data-testid="today-bookings">
                          <Fragment>
                            {bookingsToday.map((booking: BookingOutput) => (
                              <BookingListItem
                                key={booking.id}
                                listingStatus={status}
                                recurringInfo={recurringInfoToday}
                                {...booking}
                              />
                            ))}
                          </Fragment>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <div className="pt-2 xl:pt-0">
                  <div className="border-subtle overflow-hidden rounded-md border">
                    <table className="w-full max-w-full table-fixed">
                      <tbody className="bg-default divide-subtle divide-y" data-testid="bookings">
                        {query?.data.pages.map((page, index) => (
                          <Fragment key={index}>
                            {page.bookings.filter(filterBookings).map((booking: BookingOutput) => {
                              const recurringInfo = page.recurringInfo.find(
                                (info) => info.recurringEventId === booking.recurringEventId
                              );
                              return (
                                <BookingListItem
                                  key={booking.id}
                                  listingStatus={status}
                                  recurringInfo={recurringInfo}
                                  {...booking}
                                />
                              );
                            })}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-default p-4 text-center" ref={buttonInView.ref}>
                    <Button
                      color="minimal"
                      loading={query.isFetchingNextPage}
                      disabled={!query.hasNextPage}
                      onClick={() => query.fetchNextPage()}>
                      {query.hasNextPage ? t("load_more_results") : t("no_more_results")}
                    </Button>
                  </div>
                </div>
              </>
            )}
            {/* {query.status === "success" && isEmpty && (
              <div className="flex items-center justify-center pt-2 xl:pt-0">
                <EmptyScreen
                  Icon={Calendar}
                  headline={t("no_status_bookings_yet", { status: t(status).toLowerCase() })}
                  description={t("no_status_bookings_yet_description", {
                    status: t(status).toLowerCase(),
                    description: t(descriptionByStatus[status]),
                  })}
                />
              </div>
            )} */}
          </div>
        </main>
      </div>
    </ShellMain>
  );
}

Bookings.PageWrapper = PageWrapper;
Bookings.getLayout = getLayout;

export const getStaticProps: GetStaticProps = async (ctx) => {
  const params = querySchema.safeParse(ctx.params);
  const ssg = await ssgInit(ctx);

  if (!params.success) return { notFound: true };

  return {
    props: {
      status: params.data.status,
      trpcState: ssg.dehydrate(),
    },
  };
};

export const getStaticPaths: GetStaticPaths = () => {
  return {
    paths: validStatuses.map((status) => ({
      params: { status },
      locale: "en",
    })),
    fallback: "blocking",
  };
};
