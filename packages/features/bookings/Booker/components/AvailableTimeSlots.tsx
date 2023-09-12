import { useMemo, useRef, useEffect, useState } from "react";

import dayjs from "@calcom/dayjs";
import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { AvailableTimes, AvailableTimesSkeleton } from "@calcom/features/bookings";
import { useSlotsForMultipleDates } from "@calcom/features/schedules/lib/use-schedule/useSlotsForDate";
import { classNames } from "@calcom/lib";
import { get } from "@calcom/lib/fetch-wrapper";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";

import { useTimePreferences } from "../../lib";
import { useBookerStore } from "../store";
import { useEvent, useScheduleForEvent } from "../utils/event";

type AvailableTimeSlotsProps = {
  extraDays?: number;
  limitHeight?: boolean;
  seatsPerTimeSlot?: number | null;
  layout: string;
};

/**
 * Renders available time slots for a given date.
 * It will extract the date from the booker store.
 * Next to that you can also pass in the `extraDays` prop, this
 * will also fetch the next `extraDays` days and show multiple days
 * in columns next to each other.
 */
export const AvailableTimeSlots = ({
  extraDays,
  limitHeight,
  seatsPerTimeSlot,
  layout,
}: AvailableTimeSlotsProps) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const selectedDate = useBookerStore((state) => state.selectedDate);
  const setSelectedTimeslot = useBookerStore((state) => state.setSelectedTimeslot);
  const setSeatedEventData = useBookerStore((state) => state.setSeatedEventData);
  const timezone = useTimePreferences((state) => state.timezone);
  const username = useBookerStore((store) => store.username);
  const eventSlug = useBookerStore((store) => store.eventSlug);
  const isEmbed = useIsEmbed();
  const event = useEvent();
  const date = selectedDate || dayjs().format("YYYY-MM-DD");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const onTimeSelect = (
    time: string,
    attendees: number,
    seatsPerTimeSlot?: number | null,
    bookingUid?: string
  ) => {
    setSelectedTimeslot(time);

    if (seatsPerTimeSlot) {
      setSeatedEventData({
        seatsPerTimeSlot,
        attendees,
        bookingUid,
      });

      if (seatsPerTimeSlot && seatsPerTimeSlot - attendees > 1) {
        return;
      }
    }

    if (!event.data) return;
  };

  const schedule = useScheduleForEvent({
    prefetchNextMonth: !!extraDays && dayjs(date).month() !== dayjs(date).add(extraDays, "day").month(),
  });

  // Creates an array of dates to fetch slots for.
  // If `extraDays` is passed in, we will extend the array with the next `extraDays` days.
  const dates = useMemo(
    () =>
      !extraDays
        ? [date]
        : [
            // If NO date is selected yet, we show by default the upcomming `nextDays` days.
            date,
            ...Array.from({ length: extraDays }).map((_, index) =>
              dayjs(date)
                .add(index + 1, "day")
                .format("YYYY-MM-DD")
            ),
          ],
    [date, extraDays]
  );

  const isMultipleDates = dates.length > 1;
  const slotsPerDay = useSlotsForMultipleDates(dates, schedule?.data?.slots);

  useEffect(() => {
    (async () => {
      setLoadingSlots(true);
      const eventsCalendar = await get(
        `/api/book/calendar-events?username=${username}&eventSlug=${eventSlug}&date=${date}`
      );
      if (eventsCalendar.data) {
        for (let i = 0; i < slotsPerDay.length; i++) {
          let slotsFilter = slotsPerDay[i].slots;
          for (let k = 0; k < slotsPerDay[i].slots.length; k++) {
            for (let j = 0; j < eventsCalendar.data.length; j++) {
              const time = dayjs(slotsPerDay[i].slots[k].time).tz(timezone).format();

              const start = dayjs(eventsCalendar.data[j]?.start?.dateTime).subtract(1, "minute").format();
              const end = dayjs(eventsCalendar.data[j]?.end?.dateTime).add(1, "minute").format();

              if (dayjs(time).isBetween(start, end, "minute", "[]")) {
                slotsFilter = slotsFilter.filter((slt) => dayjs(slt.time).tz(timezone).format() !== time);
              }
            }
          }
          slotsPerDay[i].slots = slotsFilter;
        }
      }
      setLoadingSlots(false);
    })();
  }, [date, layout]);

  useEffect(() => {
    if (isEmbed) return;
    if (containerRef.current && !schedule.isLoading && isMobile) {
      containerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [containerRef, schedule.isLoading, isEmbed, isMobile]);

  return (
    <div
      ref={containerRef}
      className={classNames(
        limitHeight && "flex-grow md:h-[400px]",
        !limitHeight && "flex h-full w-full flex-row gap-4"
      )}>
      {schedule.isLoading || loadingSlots
        ? // Shows exact amount of days as skeleton.
          Array.from({ length: 1 + (extraDays ?? 0) }).map((_, i) => <AvailableTimesSkeleton key={i} />)
        : slotsPerDay.length > 0 &&
          slotsPerDay.map((slots) => (
            <AvailableTimes
              className="w-full"
              key={slots.date}
              date={dayjs(slots.date)}
              slots={slots.slots}
              onTimeSelect={onTimeSelect}
              seatsPerTimeSlot={seatsPerTimeSlot}
              showTimeFormatToggle={!isMultipleDates}
            />
          ))}
    </div>
  );
};
