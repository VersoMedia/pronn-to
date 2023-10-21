import { useMutation } from "@tanstack/react-query";
import { isValidPhoneNumber } from "libphonenumber-js";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { createBooking } from "@calcom/features/bookings/lib";
import { sendNotification } from "@calcom/features/bookings/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { analytics, events_analytics } from "@calcom/lib/segment";
import { SchedulingType, MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  Form,
  TextField,
  showToast,
  DialogFooter,
  Select,
  Label,
  DateTimePicker,
  TimezoneSelect,
  PhoneInput,
} from "@calcom/ui";

// this describes the uniform data needed to create a new event type on Profile or Team
export interface EventTypeParent {
  teamId: number | null | undefined; // if undefined, then it's a profile
  membershipRole?: MembershipRole | null;
  name?: string | null;
  slug?: string | null;
  image?: string | null;
}

const locationFormSchema = z.array(
  z.object({
    locationType: z.string(),
    locationAddress: z.string().optional(),
    displayLocationPublicly: z.boolean().optional(),
    locationPhoneNumber: z
      .string()
      .refine((val) => isValidPhoneNumber(val))
      .optional(),
    locationLink: z.string().url().optional(), // URL validates as new URL() - which requires HTTPS:// In the input field
  })
);

const querySchema = z.object({
  eventPage: z.string().optional(),
  teamId: z.union([z.string().transform((val) => +val), z.number()]).optional(),
  title: z.string().optional(),
  slug: z.string().optional(),
  length: z.union([z.string().transform((val) => +val), z.number()]).optional(),
  description: z.string().optional(),
  schedulingType: z.nativeEnum(SchedulingType).optional(),
  locations: z
    .string()
    .transform((jsonString) => locationFormSchema.parse(JSON.parse(jsonString)))
    .optional(),
});

export default function CreateBookingTypeDialog({
  profileOptions,
  events,
  refetch,
  selectedDay,
}: {
  profileOptions: {
    teamId: number | null | undefined;
    label: string | null;
    image: string | undefined;
    membershipRole: MembershipRole | null | undefined;
  }[];
  events: any;
  refetch: () => void;
  selectedDay: Date;
}) {
  const { t } = useLocale();
  const [addNewClient, setAddNewClient] = useState(false);
  const [options, setOptions] = useState(false);
  const router = useRouter();

  const {
    data: { teamId },
  } = useTypedQuery(querySchema);
  const teamProfile = profileOptions.find((profile) => profile.teamId === teamId);

  const form = useForm({
    defaultValues: {
      timeZone: dayjs.tz.guess(),
      startTime: selectedDay,
    },
  });

  const attendees = trpc.viewer.attendees.getByViewer.useQuery({});

  const { register, control } = form;

  const createBookingMutation = useMutation(createBooking, {
    onSuccess: async (responseData) => {
      analytics.track(events_analytics.CREATE_APPOINTMENT, {
        id: responseData.user?.id,
        email: responseData.user?.email,
        name: responseData.user?.name,
      });

      const types = ["GENERAL_BOOKING_MEMBER", "GENERAL_BOOKING_CUSTOMER"];

      for (let i = 0; i < types.length; i++) {
        const payload = {
          member_email: responseData.user?.email ? responseData.user?.email : "Sin correo",
          member_phone: responseData.user?.phone,
          member_name: responseData.user?.name,
          customer_name: responseData.responses?.name,
          customer_email: responseData.responses?.email ? responseData.responses?.email : "Sin correo",
          customer_phone: responseData.responses?.phone,
          service_name: responseData.title,
          type_: types[i],
          date: dayjs(responseData.startTime).format("DD-MM-YYYY"),
          hour: dayjs(responseData.startTime).format("hh:mm A"),
        };

        (async () => {
          await sendNotification(payload);
        })();

        refetch();
        attendees.refetch();
        await router.replace("/bookings/upcoming");
        showToast("Cita agregada con exito!", "success");
      }
    },
    onError: (err) => {
      const message = `${err.message}`;
      showToast(message, "error");

      //   errorRef && errorRef.current?.scrollIntoView({ behavior: "smooth" });
    },
  });

  const isAdmin =
    teamId !== undefined &&
    (teamProfile?.membershipRole === MembershipRole.OWNER ||
      teamProfile?.membershipRole === MembershipRole.ADMIN);

  const attendeesDecode =
    attendees?.data?.attendees && attendees?.data?.attendees.length > 0
      ? attendees?.data?.attendees.map((att) => ({
          value: att.id,
          label: att.name,
          email: att.email,
          phone: att.phone,
          name: att.name,
        }))
      : [];

  // const attendeesList = attendeesDecode.filter(
  //   (obj, index) =>
  //     attendeesDecode.findIndex((item) => item.email === obj.email || item.phone === obj.phone) === index
  // );

  const eventTypes =
    events?.eventTypeGroups.length > 0
      ? events?.eventTypeGroups[0].eventTypes.map((ev) => ({
          value: ev.id,
          label: ev.title,
          duration: ev.length,
          eventTypeSlug: ev.slug,
        }))
      : [];

  return (
    <Dialog
      name="new"
      clearQueryParamsOnClose={[
        "bookingPage",
        "teamId",
        "type",
        "description",
        "title",
        "length",
        "slug",
        "locations",
      ]}>
      <DialogContent
        type="creation"
        enableOverflow
        title={teamId ? t("add_new_team_booking_type") : t("add_new_booking_type")}
        description={t("new_booking_to_book_description")}>
        <Form
          form={form}
          handleSubmit={(values) => {
            const event = eventTypes.find((ev) => ev.value === values.event_type);
            let attendee = {};

            if (values?.attendee?.name) {
              attendee = {
                ...values?.attendee,
              };
            } else {
              attendee = attendeesDecode.find((att) => values.attendantId === att.value);
            }

            const payload = {
              responses: {
                ...attendee,
                guests: [],
              },
              user: events?.eventTypeGroups[0].profile?.slug,
              start: dayjs(values.startTime).tz(values.timeZone).format(),
              end: dayjs(values.startTime).tz(values.timeZone).add(event.duration, "minutes").format(),
              eventTypeId: event.value,
              eventTypeSlug: event.eventTypeSlug,
              timeZone: values.timeZone,
              language: "es",
              metadata: {},
              hasHashedBookingLink: false,
              internal: true,
            };

            createBookingMutation.mutate(payload);
          }}>
          <div className="mt-3 space-y-6 pb-11">
            <div>
              <Label className="mb-2">Selecciona un evento</Label>
              <Select
                isSearchable
                placeholder="Selecciona un evento"
                className="mt-0 w-full capitalize"
                options={eventTypes}
                {...register("event_type")}
                onChange={(e) => {
                  form.setValue("event_type", e?.value);
                }}
              />
            </div>

            <div>
              <Label>Selecciona una fecha y hora</Label>
              <Controller
                control={control}
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

            <div>
              {!addNewClient ? (
                <>
                  <Label className="mb-2">Selecciona un cliente</Label>
                  <Select
                    isSearchable
                    placeholder="Selecciona un cliente"
                    className="mt-0 w-full capitalize"
                    options={attendeesDecode}
                    {...register("attendantId")}
                    onChange={(e) => {
                      form.setValue("attendantId", e?.value);
                    }}
                  />
                </>
              ) : (
                <>
                  <Label className="mb-2">Completa los datos de tu cliente</Label>
                  <TextField
                    placeholder="Nombre"
                    value={form.getValues("attendee.name")}
                    onChange={(e) => {
                      form.setValue("attendee.name", e?.target.value);
                    }}
                  />

                  <TextField
                    placeholder="Correo electronico (optional)"
                    value={form.getValues("attendee.email")}
                    onChange={(e) => {
                      form.setValue("attendee.email", e?.target.value);
                    }}
                  />

                  {/* <TextField
                    placeholder="Teléfono"
                    value={form.getValues("attendee.phone")}
                    onChange={(e) => {
                      form.setValue("attendee.phone", e?.target.value);
                    }}
                  /> */}
                  <Controller
                    control={form.control}
                    name="attendee.phone"
                    render={({ field: { value, onChange } }) => (
                      <PhoneInput
                        className="rounded-md"
                        placeholder={t("enter_phone_number")}
                        id="phone"
                        required
                        value={value}
                        onChange={onChange}
                      />
                    )}
                  />
                </>
              )}
              <div className="flex flex-row justify-end">
                <div
                  className="text-muted my-1 cursor-pointer text-sm"
                  onClick={() => setAddNewClient(!addNewClient)}>
                  <span>{addNewClient ? "Seleccionar cliente existente" : "Añadir cliente"}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-row">
              <div
                className="text-muted my-1 flex cursor-pointer text-sm"
                onClick={() => setOptions(!options)}>
                <span>{!options ? "Opciones avanzadas" : "Esconder opciones avanzadas"}</span>
                {!options ? <ChevronDown /> : <ChevronUp />}
              </div>
            </div>

            {options && (
              <div>
                <Label className="mb-2">Selecciona una zona horaria para tu cliente</Label>
                <Controller
                  control={control}
                  name="timeZone"
                  render={({ field }) => (
                    <TimezoneSelect
                      value={field.value}
                      onChange={({ value }) => field.onChange(value)}
                      className="mt-2 w-full rounded-md text-sm"
                    />
                  )}
                />
              </div>
            )}

            {/* {teamId && (
              <TextField
                type="hidden"
                labelProps={{ style: { display: "none" } }}
                {...register("teamId", { valueAsNumber: true })}
                value={teamId}
              />
            )}
            <TextField
              label={t("title")}
              placeholder={t("quick_chat")}
              {...register("title")}
              onChange={(e) => {
                form.setValue("title", e?.target.value);
                if (form.formState.touchedFields["slug"] === undefined) {
                  form.setValue("slug", slugify(e?.target.value));
                }
              }}
            />

            {urlPrefix && urlPrefix.length >= 21 ? (
              <div>
                <TextField
                  label={`${t("url")}: ${urlPrefix}`}
                  required
                  addOnLeading={<>/{!isManagedEventType ? pageSlug : t("username_placeholder")}/</>}
                  {...register("slug")}
                  onChange={(e) => {
                    form.setValue("slug", slugify(e?.target.value), { shouldTouch: true });
                  }}
                />

                {isManagedEventType && (
                  <p className="mt-2 text-sm text-gray-600">{t("managed_event_url_clarification")}</p>
                )}
              </div>
            ) : (
              <div>
                <TextField
                  label={t("url")}
                  required
                  addOnLeading={
                    <>
                      {urlPrefix}/{!isManagedEventType ? pageSlug : t("username_placeholder")}/
                    </>
                  }
                  {...register("slug")}
                />
                {isManagedEventType && (
                  <p className="mt-2 text-sm text-gray-600">{t("managed_event_url_clarification")}</p>
                )}
              </div>
            )}
            {!teamId && (
              <>
                <Editor
                  getText={() => md.render(form.getValues("description") || "")}
                  setText={(value: string) => form.setValue("description", turndown(value))}
                  excludedToolbarItems={["blockType", "link"]}
                  placeholder={t("quick_video_meeting")}
                  firstRender={firstRender}
                  setFirstRender={setFirstRender}
                />

                <div className="relative">
                  <TextField
                    type="number"
                    required
                    min="10"
                    placeholder="15"
                    label={t("duration")}
                    className="pr-4"
                    {...register("length", { valueAsNumber: true })}
                    addOnSuffix={t("minutes")}
                  />
                </div>
              </>
            )}

            {teamId && (
              <div className="mb-4">
                <label htmlFor="schedulingType" className="text-default block text-sm font-bold">
                  {t("assignment")}
                </label>
                {form.formState.errors.schedulingType && (
                  <Alert
                    className="mt-1"
                    severity="error"
                    message={form.formState.errors.schedulingType.message}
                  />
                )}
                <RadioArea.Group
                  onValueChange={(val: SchedulingType) => {
                    form.setValue("schedulingType", val);
                  }}
                  className={classNames(
                    "mt-1 flex gap-4",
                    isAdmin && flags["managed-event-types"] && "flex-col"
                  )}>
                  <RadioArea.Item
                    {...register("schedulingType")}
                    value={SchedulingType.COLLECTIVE}
                    className={classNames("w-full text-sm", !isAdmin && "w-1/2")}
                    classNames={{ container: classNames(isAdmin && "w-full") }}>
                    <strong className="mb-1 block">{t("collective")}</strong>
                    <p>{t("collective_description")}</p>
                  </RadioArea.Item>
                  <RadioArea.Item
                    {...register("schedulingType")}
                    value={SchedulingType.ROUND_ROBIN}
                    className={classNames("text-sm", !isAdmin && "w-1/2")}
                    classNames={{ container: classNames(isAdmin && "w-full") }}>
                    <strong className="mb-1 block">{t("round_robin")}</strong>
                    <p>{t("round_robin_description")}</p>
                  </RadioArea.Item>
                  <>
                    {isAdmin && flags["managed-event-types"] && (
                      <RadioArea.Item
                        {...register("schedulingType")}
                        value={SchedulingType.MANAGED}
                        className={classNames("text-sm", !isAdmin && "w-1/2")}
                        classNames={{ container: classNames(isAdmin && "w-full") }}>
                        <strong className="mb-1 block">{t("managed_event")}</strong>
                        <p>{t("managed_event_description")}</p>
                      </RadioArea.Item>
                    )}
                  </>
                </RadioArea.Group>
              </div>
            )} */}
          </div>
          <DialogFooter showDivider>
            <DialogClose />
            <Button type="submit" loading={createBookingMutation.isLoading}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
