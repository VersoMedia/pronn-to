import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useMutation } from "@tanstack/react-query";
import format from "date-fns/format";
import getDay from "date-fns/getDay";
import esEs from "date-fns/locale/es";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import moment from "moment";
import type { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";
import { Fragment, useCallback, useState } from "react";
import React from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { getLayout } from "@calcom/features/MainLayout";
import { FiltersContainer } from "@calcom/features/bookings/components/FiltersContainer";
import { sendNotification } from "@calcom/features/bookings/lib";
import { createBooking } from "@calcom/features/bookings/lib";
//import type { filterQuerySchema } from "@calcom/features/bookings/lib/useFilterQuery";
import { useFilterQuery } from "@calcom/features/bookings/lib/useFilterQuery";
import { CreateBookingTypeDialog } from "@calcom/features/eventtypes/components";
import { ShellMain } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import {
  CreateButton,
  Dialog,
  DialogContent,
  Avatar,
  DialogFooter,
  DialogClose,
  showToast,
  DateTimePicker,
  Form,
  Label,
} from "@calcom/ui";
import { Button, HorizontalTabs, Switch } from "@calcom/ui";
import type { VerticalTabItemProps, HorizontalTabItemProps } from "@calcom/ui";
import { Alert } from "@calcom/ui";
import { AlertCircle } from "@calcom/ui/components/icon";

import { useInViewObserver } from "@lib/hooks/useInViewObserver";

import PageWrapper from "@components/PageWrapper";
import BookingListItem from "@components/booking/BookingListItem";
import SkeletonLoader from "@components/booking/SkeletonLoader";

import { ssgInit } from "@server/lib/ssg";

import { WipeMyCalActionButton } from "../../../../packages/app-store/wipemycalother/components";

type BookingOutput = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][0];
//type GetByViewerResponse = RouterOutputs["viewer"]["eventTypes"]["getByViewer"] | undefined;

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

const CTA = ({
  data,
  eventsTypes,
  refetch,
  selectedDay,
}: {
  data: GetByViewerRespons;
  eventsTypes: any;
  refetch: () => void;
  selectedDay: Date;
}) => {
  const { t } = useLocale();

  if (!data) return null;

  const profileOptions = data.profiles
    .filter((profile) => !profile.readOnly)
    .map((profile) => {
      return {
        teamId: profile.teamId,
        label: profile.name || profile.slug,
        image: profile.image,
        membershipRole: profile.membershipRole,
        slug: profile.slug,
      };
    });

  return (
    <CreateButton
      data-testid="new-event-type"
      buttonText="Crear cita"
      subtitle={t("create_event_on").toUpperCase()}
      options={profileOptions}
      createDialog={() => (
        <CreateBookingTypeDialog
          events={eventsTypes}
          selectedDay={selectedDay}
          profileOptions={profileOptions}
          refetch={refetch}
        />
      )}
    />
  );
};

const StatusColor = {
  ACCEPTED: "#169823",
  CANCELLED: "#E50B5A",
  PENDING: "#E3A200",
};

const StatusBg = {
  ACCEPTED: "#E8FFEA",
  CANCELLED: "#FFEAF1",
  PENDING: "#FFF6DE",
};

const CustomCardAppointment = ({ title, event }: { title: string; event: any }) => {
  const status = event.resource.status;
  return (
    <div
      className="flex h-full w-full flex-row items-center justify-between divide-x divide-gray-400 rounded-[4px] border px-1"
      style={{
        borderColor: StatusColor[status],
        backgroundColor: StatusBg[status],
      }}
      onClick={() => event.resource?.openModal({ title, event })}>
      <div className="flex flex-row items-center" style={{ maxWidth: "60%" }}>
        <div className="rounded-full">
          <Avatar size="sm" className="h-[70%] w-[70%]" />
        </div>
        <p
          className="!w-[80px] overflow-hidden truncate pl-2 font-semibold leading-[11px]"
          style={{ fontSize: 10, color: StatusColor[status] }}>
          {title}
        </p>
      </div>
      <p className="pl-1" style={{ fontSize: 10, color: StatusColor[status] }}>
        {dayjs(event?.start).format("hh:mm A")}
      </p>
    </div>
  );
};

export default function Bookings() {
  const router = useRouter();
  const params = useParamsWithFallback();
  const { data: filterQuery } = useFilterQuery();
  const { status } = params ? querySchema.parse(params) : { status: "upcoming" as const };
  const { t } = useLocale();
  const [today, setToday] = useState(new Date());
  const [views, setViews] = useState("week");
  const [typeView, setTypeView] = useState(true);
  const [visible, setVisible] = useState(false);
  const [deleteAppModal, setDeleteAppModal] = useState(false);
  const [recheduleModal, setRecheduleModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [currentAppointment, setCurrentAppointment] = useState(null);
  const onView = useCallback((newView) => setViews(newView), [setViews]);
  const [viewSlots, setViewSlots] = useState(null);

  const form = useForm({
    defaultValues: {
      startTime: selectedDay,
    },
  });
  const isMobile = useMediaQuery("(max-width: 768px)");

  const tabsViewsCalendar = [
    {
      id: "month",
      name: "Mes",
      href: "",
      onClick: () => setViews("month"),
    },
    {
      name: "Semana",
      id: "week",
      href: "",
      onClick: () => setViews("week"),
    },
    {
      name: "Día",
      id: "day",
      href: "",
      onClick: () => setViews("day"),
    },
  ];

  const query = trpc.viewer.bookings.get.useInfiniteQuery(
    {
      limit: 100,
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

    setToday(new Date(currentToday));
  };

  const onClickNextWeek = (date = "") => {
    let currentToday = moment();
    if (views === "week") {
      currentToday = moment(today).add(7, "days");

      if (date !== "") {
        currentToday = moment(date);
      }
    } else if (views === "month") {
      currentToday = moment(today).add(1, "month");
    } else {
      currentToday = moment(today).add(1, "day");
    }

    setToday(new Date(currentToday));
  };

  const onClickToDay = () => {
    setToday(new Date());
  };

  const eventsTypes = trpc.viewer.eventTypes.getByViewer.useQuery(
    {},
    {
      refetchOnWindowFocus: false,
    }
  );

  const appointments =
    query.data?.pages.map((page) => page.bookings.map((booking: BookingOutput) => booking))[0] || [];

  const handleOpenModalEvent = (event) => {
    setCurrentAppointment(event);
    setVisible(true);
  };

  const updateBookingMutation = useMutation(createBooking, {
    onSuccess: (responsedata) => {
      const data = currentAppointment?.event?.resource;
      const types = ["MEMBER_BOOKING_RESCHEDULE_MEMBER", "MEMBER_BOOKING_RESCHEDULE_CUSTOMER"];
      for (let i = 0; i < types.length; i++) {
        const payload = {
          member_email: data?.user?.email ?? "Sin correo",
          member_phone: data?.user?.phone,
          member_name: data?.user?.name,
          customer_name: data?.responses?.name,
          customer_email: data?.responses?.email ? data?.responses?.email : "Sin correo",
          customer_phone: data?.responses?.phone,
          service_name: data?.title,
          type_: types[i],
          old_date: dayjs(currentAppointment?.event?.start).format("DD-MM-YYYY"),
          old_hour: dayjs(currentAppointment?.event?.start).format("hh:mm A"),
          date: dayjs(responsedata.startTime).format("DD-MM-YYYY"),
          hour: dayjs(responsedata.startTime).format("hh:mm A"),
        };

        (async () => {
          await sendNotification(payload);
        })();
      }
      query.refetch();
      if (recheduleModal) {
        showToast(t("event_has_been_rescheduled"), "success");
        setRecheduleModal(false);
        return;
      }

      showToast(t("availability_updated_successfully", { scheduleName: "" }), "success");
    },
    onError: () => {
      showToast(t("unexpected_error_try_again"), "error");
      console.log("Server internal error");
      //errorRef && errorRef.current?.scrollIntoView({ behavior: "smooth" });
    },
  });

  const moveEvent = useCallback(async ({ event, start, end }) => {
    const payload = {
      responses: event?.resource?.responses,
      rescheduleUid: event?.resource?.uid || undefined,
      user: event?.resource?.user?.username,
      start: dayjs(start).format(),
      end: dayjs(end).format(),
      eventTypeId: event?.resource?.eventType?.id,
      eventTypeSlug: event?.resource?.eventType?.slug,
      timeZone: event?.resource?.user?.timeZone,
      language: "es",
      metadata: {},
      hasHashedBookingLink: false,
      internal: true,
    };

    const data = event?.resource;

    const types = ["MEMBER_BOOKING_RESCHEDULE_MEMBER", "MEMBER_BOOKING_RESCHEDULE_CUSTOMER"];
    for (let i = 0; i < types.length; i++) {
      const payloadNotification = {
        member_email: data.user?.email ?? "Sin correo",
        member_phone: data.user?.phone,
        member_name: data.user?.name,
        customer_name: data.responses?.name,
        customer_email: data.responses?.email ? data.responses?.email : "Sin correo",
        customer_phone: data.responses?.phone,
        service_name: data.title,
        type_: types[i],
        old_date: dayjs(event?.start).format("DD-MM-YYYY"),
        old_hour: dayjs(event?.start).format("hh:mm A"),
        date: dayjs(start).format("DD-MM-YYYY"),
        hour: dayjs(start).format("hh:mm A"),
      };

      if (types[i] === "MEMBER_BOOKING_RESCHEDULE_CUSTOMER") {
        payloadNotification.old_date = dayjs(event?.start)
          .tz(event?.resource?.attendeesMany[0]?.attendee?.timeZone ?? "America/Mexico_city")
          .format("DD-MM-YYYY");
        payloadNotification.old_hour = dayjs(event?.start)
          .tz(event?.resource?.attendeesMany[0]?.attendee?.timeZone ?? "America/Mexico_city")
          .format("hh:mm A");

        payloadNotification.date = dayjs(start)
          .tz(event?.resource?.attendeesMany[0]?.attendee?.timeZone ?? "America/Mexico_city")
          .format("DD-MM-YYYY");
        payloadNotification.hour = dayjs(start)
          .tz(event?.resource?.attendeesMany[0]?.attendee?.timeZone ?? "America/Mexico_city")
          .format("hh:mm A");
      }

      (async () => {
        await sendNotification(payloadNotification);
      })();
    }

    showToast(t("loading"), "success");
    updateBookingMutation.mutate(payload);
  }, []);

  const resizeEvent = useCallback(({ event, start, end }) => {
    const payload = {
      responses: event?.resource?.responses,
      rescheduleUid: event?.resource?.uid || undefined,
      user: event?.resource?.user?.username,
      start: dayjs(start).format(),
      end: dayjs(end).format(),
      eventTypeId: event?.resource?.eventType?.id,
      eventTypeSlug: event?.resource?.eventType?.slug,
      timeZone: event?.resource?.user?.timeZone,
      language: "es",
      metadata: {},
      hasHashedBookingLink: false,
      internal: true,
    };

    showToast(t("loading"), "success");
    updateBookingMutation.mutate(payload);
  }, []);

  const getWeek = (date) => {
    const curr = date;
    const first = curr.getDate() - curr.getDay();
    const dates = Array.from({ length: 6 }).map((_, i) => first + (i + 1));
    return [
      new Date(curr.setDate(first)).toUTCString(),
      ...dates.map((d) => new Date(curr.setDate(d)).toUTCString()),
    ];
  };

  return (
    <ShellMain
      hideHeadingOnMobile
      heading={t("bookings")}
      subtitle={t("bookings_description")}
      CTA={
        <CTA
          data={eventsTypes.data}
          eventsTypes={eventsTypes.data}
          selectedDay={selectedDay}
          refetch={() => query.refetch()}
        />
      }>
      <div className="flex w-full flex-col">
        <div className="flex w-full flex-col lg:flex-row lg:items-center lg:justify-between">
          <HorizontalTabs tabs={tabs} />
          <div className="block">
            <div className="flex h-9">
              <label className="text-emphasis mr-2 ms-2 align-text-top text-sm font-medium">Lista</label>
              <Switch checked={typeView} onClick={() => setTypeView(!typeView)} style={{ marginTop: -12 }} />
              <label className="text-emphasis ms-2 align-text-top text-sm font-medium">Calendario</label>
            </div>
          </div>
        </div>
        <div className="">
          <div className="flex flex-col flex-wrap lg:flex-row">
            {typeView ? (
              <header className="flex w-full flex-col justify-between md:my-0 lg:flex-row">
                <div className="lg-mb-0 mb-3 flex flex-col justify-between lg:flex-row">
                  <HorizontalTabs
                    tabs={tabsViewsCalendar.filter((tb) => (tb.id !== "day" && isMobile) || !isMobile)}
                    isButton
                    views={views}
                  />
                  <div className="relative flex items-center rounded-sm bg-neutral-100 bg-white md:items-stretch">
                    <h1 className="h-9 pt-2 text-base font-semibold leading-6 text-gray-900 lg:ml-4">
                      {views === "day"
                        ? moment(today).format("DD MMMM YYYY")
                        : moment(today).format("MMMM-YYYY").charAt(0).toUpperCase() +
                          moment(today).format("MMMM YYYY").slice(1)}
                    </h1>
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
                    <button
                      type="button"
                      className="flex h-9 items-center justify-center rounded-r-sm py-1.5 pl-4 pr-3 text-gray-400 hover:text-gray-500 focus:relative md:w-9 md:px-2"
                      onClick={() => onClickNextWeek("")}>
                      <span className="sr-only">Next period</span>
                      <ChevronRightIcon className="h-5 w-5" aria-hidden="true" color="#000" />
                    </button>
                  </div>
                </div>
                <div className="hidden lg:block">
                  <div className="flex max-w-full overflow-x-auto xl:ml-auto">
                    <FiltersContainer />
                  </div>
                </div>
              </header>
            ) : (
              <div />
            )}
          </div>
        </div>
        <main className="w-full">
          <div className="flex w-full flex-col" ref={animationParentRef}>
            {query.status === "error" && (
              <Alert severity="error" title={t("something_went_wrong")} message={query.error.message} />
            )}
            {(query.status === "loading" || query.isPaused) && <SkeletonLoader />}
            {query.status !== "loading" && typeView && (
              <div className={`flex flex-col bg-white ${isMobile ? "h-[50vh]" : "h-[100vh]"}`}>
                {isMobile && views === "week" && (
                  <div
                    className="flex h-[60px] w-full border border-x-0 border-t-0 border-[#ddd] pl-[56px]"
                    style={{ boxShadow: "0px 15px 10px -15px #ddd" }}>
                    {getWeek(new Date(today.toISOString())).map((date) => (
                      <div
                        key={date}
                        onClick={() => onClickNextWeek(date)}
                        className="flex flex-col items-center justify-center border border-y-0 border-l-0 border-[#ddd] py-1"
                        style={{ width: "14.28%" }}>
                        <p>{dayjs(date).format("ddd")}</p>
                        <p>{dayjs(date).format("DD")}</p>
                        {dayjs(date).isSame(today, "day") && (
                          <div className="h-1 w-1 rounded-sm bg-indigo-700" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <DnDCalendar
                  culture="es"
                  localizer={localizer}
                  defaultDate={new Date()}
                  date={today}
                  defaultView={isMobile && views === "week" ? "day" : views}
                  drilldownView={isMobile && views === "week" ? "day" : views}
                  onView={onView}
                  view={isMobile && views === "week" ? "day" : views}
                  toolbar={false}
                  events={appointments.map((ap) => ({
                    title: ap.attendees[0]?.name || "Invitado",
                    start: new Date(dayjs(ap.startTime).tz(ap.user?.timeZone).format()),
                    end: new Date(dayjs(ap.endTime).tz(ap.user?.timeZone).format()),
                    resource: { ...ap, openModal: (data) => handleOpenModalEvent(data) },
                  }))}
                  formats={{
                    timeGutterFormat: (date, culture, localizer) => localizer.format(date, "hh a", culture),
                    dayFormat: (date, culture, localizer) =>
                      localizer.format(date, isMobile ? "eee d" : "eeee d", culture),
                    monthHeaderFormat: (date, culture, localizer) =>
                      localizer.format(date, isMobile ? "eee d" : "eeee d", culture),
                  }}
                  onSelectSlot={(slot) => {
                    if (isMobile) {
                      setViewSlots(dayjs(slot).format());
                      return;
                    }
                    const start = moment(slot.start);
                    setSelectedDay(new Date(start.toISOString()));
                    if (window.location.href)
                      router.push(
                        window.location.href?.split("?")[0] +
                          `?status=upcoming&dialog=new&eventPage=${eventsTypes.data?.profiles[0]?.slug}`
                      );
                  }}
                  components={{
                    event: ({ event, title }) =>
                      isMobile && views === "month" ? (
                        <div
                          className="h-[10px] w-[10px] rounded-md bg-indigo-300"
                          style={{ touchAction: "none" }}
                        />
                      ) : (
                        <CustomCardAppointment event={event} title={title} />
                      ),
                  }}
                  startAccessor="start"
                  endAccessor="end"
                  onEventDrop={moveEvent}
                  onEventResize={resizeEvent}
                  selectable
                  popup
                  resizable={!isMobile}
                />
              </div>
            )}
            {(!typeView || (viewSlots && isMobile)) && (
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
                        {query.data?.pages?.map((page, index) => (
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
          </div>
        </main>
      </div>
      <Dialog open={visible} onOpenChange={setVisible}>
        <DialogContent title={t("event_details_title")}>
          <div className="flex min-h-[200px] flex-col">
            <div className="mb-4 w-full">
              <div className="flex w-full flex-wrap rounded-sm py-3 text-sm">
                <Avatar size="lg" />
                <div className="flex-1 px-2">
                  <p className="text-[16px]">{currentAppointment?.title}</p>
                  <p className="mt-1 text-[12px]">
                    {dayjs(currentAppointment?.event?.start).format("dddd MMM DD, YYYY")}
                  </p>
                  <p className="text-[12px]">
                    {dayjs(currentAppointment?.event?.start).format("hh:mm A") +
                      " - " +
                      dayjs(currentAppointment?.event?.end).format("hh:mm A")}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-subtle flex flex-wrap rounded-sm p-3 text-sm">
              <div className="flex-1 px-2">
                <p className="text-[16px]">Service</p>
                <p className="text-subtle mt-1">Title: {currentAppointment?.event?.resource?.title}</p>
                <p className="text-subtle">Event: {currentAppointment?.event?.resource?.eventType?.slug}</p>
                {currentAppointment?.event?.resource?.location && (
                  <p className="text-subtle">Location: {currentAppointment?.event?.resource?.location}</p>
                )}
                <p className="mt-2 text-[16px]">Attendees</p>
                {currentAppointment?.event?.resource?.responses && (
                  <>
                    <p className="text-subtle mt-1">{currentAppointment?.event?.resource?.responses?.name}</p>
                    <p className="text-subtle">{currentAppointment?.event?.resource?.responses?.email}</p>
                    <p className="text-subtle">{currentAppointment?.event?.resource?.responses?.phone}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="!relative mt-4">
            <div className="flex w-full flex-col space-y-2 pb-8 pt-4 rtl:space-x-reverse lg:w-auto lg:flex-row lg:justify-end lg:space-x-2 lg:space-y-0">
              <Button
                data-testid="rechedule-booking"
                className="w-full text-center"
                onClick={() => {
                  setVisible(false);
                  setRecheduleModal(true);
                }}>
                {t("reschedule")}
              </Button>
              <Button
                data-testid="cancel-booking"
                className="w-full text-center"
                onClick={() => {
                  setVisible(false);
                  setDeleteAppModal(true);
                }}>
                {t("cancel")}
              </Button>
              <DialogClose color="secondary" className="w-full text-center" />
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteAppModal} onOpenChange={setDeleteAppModal}>
        <DialogContent
          title={t("cancel_booking")}
          description={t("are_you_sure_you_want_to_remove_this_booking")}
          type="confirmation"
          Icon={AlertCircle}>
          <DialogFooter>
            <Button
              color="primary"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                const res = await fetch("/api/cancel", {
                  body: JSON.stringify({
                    uid: currentAppointment?.event?.resource?.uid,
                    allRemainingBookings: false,
                    seatReferenceUid: undefined,
                  }),
                  headers: {
                    "Content-Type": "application/json",
                  },
                  method: "POST",
                });

                const booking = currentAppointment?.event?.resource;
                if (res.status >= 200 && res.status < 300) {
                  const types = [
                    "MEMBER_BOOKING_CANCELLATION_CUSTOMER",
                    "CUSTOMER_BOOKING_CANCELLATION_MEMBER",
                  ];
                  for (let i = 0; i < types.length; i++) {
                    const payload = {
                      member_email: booking?.user?.email ?? "Sin correo",
                      member_phone: booking?.user?.phone,
                      member_name: booking?.user?.name,
                      customer_name: booking?.responses?.name,
                      customer_email: booking?.responses?.email ? booking?.responses?.email : "Sin correo",
                      customer_phone: booking?.responses?.phone,
                      type_: types[i],
                    };

                    (async () => {
                      await sendNotification(payload);
                    })();
                  }
                  query.refetch();
                  setDeleteAppModal(false);
                } else {
                  showToast(
                    `${t("error_with_status_code_occured", { status: res.status })} ${t("please_try_again")}`,
                    "error"
                  );
                }
                setLoading(false);
              }}>
              {t("yes_cancel_booking")}
            </Button>
            <DialogClose />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={recheduleModal} onOpenChange={setRecheduleModal}>
        <DialogContent title={t("reschedule_booking")}>
          <Form
            form={form}
            handleSubmit={(values) => {
              const diff = dayjs(currentAppointment?.event?.resource?.endTime).diff(
                dayjs(currentAppointment?.event?.resource?.startTime),
                "minutes"
              );
              const payload = {
                responses: currentAppointment?.event?.resource?.responses,
                rescheduleUid: currentAppointment?.event?.resource?.uid || undefined,
                user: currentAppointment?.event?.resource?.user?.username,
                start: dayjs(values.startTime).format(),
                end: dayjs(values.startTime).add(diff, "minutes").format(),
                eventTypeId: currentAppointment?.event?.resource?.eventType?.id,
                eventTypeSlug: currentAppointment?.event?.resource?.eventType?.slug,
                timeZone: currentAppointment?.event?.resource?.user?.timeZone,
                language: "es",
                metadata: {},
                hasHashedBookingLink: false,
                internal: true,
              };

              updateBookingMutation.mutate(payload);
            }}>
            <div className="mt-3 space-y-6 pb-11">
              <div>
                <Label>Selecciona una fecha y hora</Label>
                <Controller
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <DateTimePicker
                      value={field.value}
                      onDatesChange={(newDate) => {
                        field.onChange(newDate);
                      }}
                    />
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" loading={updateBookingMutation.isLoading}>
                {t("confirm")}
              </Button>
              <DialogClose />
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
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
