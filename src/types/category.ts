import { Category } from "@prisma/client";

export type CategoryWithChildren = Category & {
  children?: CategoryWithChildren[];
};
