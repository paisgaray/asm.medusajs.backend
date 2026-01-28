import { createFindParams, createSelectParams } from '@medusajs/medusa/api/utils/validators';
import { z } from 'zod';

export const selectParams = createSelectParams();
export const findParams = createFindParams();

export const ZipCodeListQuerySchema = createFindParams().merge(
  z.object({
    region_id: z.string().optional(),
  }),
);

export const CreateZipCodeSchema = z.object({
  zipcode: z.string().nonempty(),
  region_id: z.string().nonempty(),
});

export const GetZipCodeQuerySchema = z.object({
  id: z.string().nonempty(),
});

export const GetRegionZipcodeItemQuerySchema = z.object({
  id: z.string().nonempty(),
});

export const UpdateRegionZipcodeItemQuerySchema = z.object({
  id: z.string().nonempty(),
});

export const UpdateRegionZipcodeItemSchema = z.object({
  zipcode: z.string().optional(),
  region_id: z.string().optional(),
});

export const DeleteRegionZipcodeItemQuerySchema = z.object({
  id: z.string().nonempty(),
});

export type ZipCodeListQuerySchema = z.infer<typeof ZipCodeListQuerySchema>;

export type CreateZipCodeSchema = z.infer<typeof CreateZipCodeSchema>;
export type GetZipCodeQuerySchema = z.infer<typeof GetZipCodeQuerySchema>;

export type GetRegionZipcodeItemQuerySchema = z.infer<typeof GetRegionZipcodeItemQuerySchema>;

export type UpdateRegionZipcodeItemQuerySchema = z.infer<typeof UpdateRegionZipcodeItemQuerySchema>;
export type UpdateRegionZipcodeItemSchema = z.infer<typeof UpdateRegionZipcodeItemSchema>;

export type DeleteRegionZipcodeItemQuerySchema = z.infer<typeof DeleteRegionZipcodeItemQuerySchema>;
