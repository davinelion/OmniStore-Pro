import { z } from "zod";
export const EventSchema = z
  .object({
    event: z.enum([
      "app_view",
      "search",
      "download_click",
      "platform_filter",
      "category_view",
      "compare_add",
      "favorite_add",
      "favorite_remove",
      "follow",
      "unfollow",
      "share",
      "report_submit",
      "route_error",
    ]),
  })
  .strict();
export type ProductEvent = z.infer<typeof EventSchema>["event"];
