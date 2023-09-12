import { useMemo, useEffect, useState } from "react";

import dayjs from "@calcom/dayjs";
import { Calendar } from "@calcom/features/calendars/weeklyview";
import type { CalendarAvailableTimeslots } from "@calcom/features/calendars/weeklyview/types/state";
import { get } from "@calcom/lib/fetch-wrapper";

import { useTimePreferences } from "../../lib";
import { useBookerStore } from "../store";
import { useEvent, useScheduleForEvent } from "../utils/event";

export const LargeCalendar = ({ extraDays }: { extraDays: number }) => {
  const selectedDate = useBookerStore((state) => state.selectedDate);
  const date = selectedDate || dayjs().format("YYYY-MM-DD");
  const setSelectedTimeslot = useBookerStore((state) => state.setSelectedTimeslot);
  const selectedEventDuration = useBookerStore((state) => state.selectedDuration);
  const schedule = useScheduleForEvent({
    prefetchNextMonth: !!extraDays && dayjs(date).month() !== dayjs(date).add(extraDays, "day").month(),
  });
  const timezone = useTimePreferences((state) => state.timezone);
  const username = useBookerStore((store) => store.username);
  const eventSlug = useBookerStore((store) => store.eventSlug);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const event = useEvent();
  const eventDuration = selectedEventDuration || event?.data?.length || 30;

  const [slotsFilterCalendar, setSlotsFilterCalendar] = useState([]);

  const availableSlots = useMemo(() => {
    const availableTimeslots: CalendarAvailableTimeslots = {};
    if (!schedule.data) return availableTimeslots;
    if (!schedule.data.slots) return availableTimeslots;

    for (const day in schedule.data.slots) {
      availableTimeslots[day] = schedule.data.slots[day].map((slot) => ({
        start: dayjs(slot.time).toDate(),
        end: dayjs(slot.time).add(eventDuration, "minutes").toDate(),
      }));
    }
    return availableTimeslots;
  }, [schedule, eventDuration]);

  useEffect(() => {
    (async () => {
      setLoadingSlots(true);
      const eventsCalendar = await get(
        `/api/book/calendar-events?username=${username}&eventSlug=${eventSlug}&date=${date}`
      );
      if (eventsCalendar.data) {
        const slotsFilters = availableSlots;
        for (let i = 0; i < Object.keys(availableSlots).length; i++) {
          const slotsWeek = availableSlots[Object.keys(availableSlots)[i]];
          let slotsFilter = availableSlots[Object.keys(availableSlots)[i]];

          for (let k = 0; k < slotsWeek.length; k++) {
            for (let j = 0; j < eventsCalendar.data.length; j++) {
              const time = dayjs(slotsWeek[k].start).tz(timezone).format();

              const start = dayjs(eventsCalendar.data[j]?.start?.dateTime).subtract(1, "minute").format();
              const end = dayjs(eventsCalendar.data[j]?.end?.dateTime).add(1, "minute").format();

              if (dayjs(time).isBetween(start, end, "minute", "[]")) {
                slotsFilter = slotsFilter.filter((slt) => dayjs(slt.start).tz(timezone).format() !== time);
              }
            }
          }
          slotsFilters[Object.keys(availableSlots)[i]] = slotsFilter;
        }

        setSlotsFilterCalendar(slotsFilters);
      }
      setLoadingSlots(false);
    })();
  }, [date]);

  const startDate = selectedDate ? dayjs(selectedDate).toDate() : dayjs().toDate();
  const endDate = dayjs(startDate)
    .add(extraDays - 1, "day")
    .toDate();

  return (
    <div className="h-full [--calendar-dates-sticky-offset:66px]">
      <Calendar
        isLoading={schedule.isLoading || loadingSlots}
        availableTimeslots={slotsFilterCalendar ?? availableSlots}
        startHour={0}
        endHour={23}
        events={[]}
        startDate={startDate}
        endDate={endDate}
        onEmptyCellClick={(date) => setSelectedTimeslot(date.toISOString())}
        gridCellsPerHour={60 / eventDuration}
        hoverEventDuration={eventDuration}
        hideHeader
      />
    </div>
  );
};
