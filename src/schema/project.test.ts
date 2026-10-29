import { describe, expect, it } from "vitest";
import { ProjectSchema, defaultBody } from "./project";

describe("ProjectSchema", () => {
  it("accepts a valid empty project", () => {
    const project = { version: 1, body: defaultBody, layers: [] };
    expect(ProjectSchema.parse(project)).toEqual(project);
  });

  it("rejects body parameters outside 0..1", () => {
    const bad = { version: 1, body: { ...defaultBody, weight: 1.5 }, layers: [] };
    expect(ProjectSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an unknown version", () => {
    const bad = { version: 2, body: defaultBody, layers: [] };
    expect(ProjectSchema.safeParse(bad).success).toBe(false);
  });
});
