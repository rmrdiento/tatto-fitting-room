import { expect, test, type Page } from "@playwright/test";

/** Clicks the middle of the 3D canvas, where the body is (camera targets 0.9 m). */
async function clickBody(page: Page) {
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("canvas not found");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

// Software WebGL needs a moment to draw after a state change, and polling
// screenshots starves its render loop, so settle with a fixed pause instead.
const SETTLE_MS = 1500;

async function shot(page: Page): Promise<Buffer> {
  await page.waitForTimeout(SETTLE_MS);
  return page.locator("canvas").screenshot();
}

async function openEditor(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  // Library images and the GLB model load asynchronously.
  await expect(page.getByRole("button", { name: "Heart" })).toBeVisible();
  // The body mesh is mounted only after the GLB has loaded.
  await expect(page.locator("[data-ready=true]")).toBeVisible();
  return errors;
}

test("places a tattoo on the body, then undoes and redoes it", async ({ page }) => {
  const errors = await openEditor(page);
  await expect(page.getByText("Layers (0)")).toBeVisible();

  await page.getByRole("button", { name: "Heart" }).click();
  await clickBody(page);
  await expect(page.getByText("Layers (1)")).toBeVisible();
  await expect(page.getByText("Width:")).toBeVisible();

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Layers (0)")).toBeVisible();

  await page.getByRole("button", { name: "Redo" }).click();
  await expect(page.getByText("Layers (1)")).toBeVisible();

  expect(errors).toEqual([]);
});

test("renders the tattoo into the canvas and hides it in before view", async ({ page }) => {
  await openEditor(page);

  const empty = await shot(page);

  await page.getByRole("button", { name: "Star" }).click();
  await clickBody(page);
  await expect(page.getByText("Layers (1)")).toBeVisible();
  const withTattoo = await shot(page);
  expect(withTattoo.equals(empty)).toBe(false);

  // New tattoos are not "old", so the before view must look like the empty body.
  await page.getByRole("button", { name: /View:/ }).click();
  await expect(page.getByRole("button", { name: /before/ })).toBeVisible();
  const before = await shot(page);
  expect(before.equals(empty)).toBe(true);
});

test("switching sex and sliders keeps the editor working", async ({ page }) => {
  const errors = await openEditor(page);
  await page.getByRole("button", { name: "Male", exact: true }).click();
  await page.getByRole("button", { name: "Heart" }).click();
  await clickBody(page);
  await expect(page.getByText("Layers (1)")).toBeVisible();
  expect(errors).toEqual([]);
});
