import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { attendeesRouter } from "@calcom/trpc/server/routers/viewer/attendees/_router";

export default createNextApiHandler(attendeesRouter);
