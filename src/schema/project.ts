import { z } from "zod";

export const BodyParamsSchema = z.object({
  sex: z.enum(["female", "male"]),
  height: z.number().min(0).max(1),
  weight: z.number().min(0).max(1),
  muscle: z.number().min(0).max(1),
  age: z.number().min(0).max(1),
  skinTone: z.number().min(0).max(1),
});

export const LayerSchema = z.object({
  id: z.string().min(1),
  imageId: z.string().min(1),
  u: z.number().min(0).max(1),
  v: z.number().min(0).max(1),
  scale: z.number().positive(),
  rotation: z.number(),
  opacity: z.number().min(0).max(1),
  mirrored: z.boolean(),
  old: z.boolean(),
  visible: z.boolean(),
});

export const ProjectSchema = z.object({
  version: z.literal(1),
  body: BodyParamsSchema,
  layers: z.array(LayerSchema),
});

export type BodyParams = z.infer<typeof BodyParamsSchema>;
export type Layer = z.infer<typeof LayerSchema>;
export type Project = z.infer<typeof ProjectSchema>;

export const defaultBody: BodyParams = {
  sex: "female",
  height: 0.5,
  weight: 0.5,
  muscle: 0.5,
  age: 0.3,
  skinTone: 0.5,
};
