import { z } from "zod";

export const businessIdParamSchema = z.object({
  id: z.string().uuid(),
});
