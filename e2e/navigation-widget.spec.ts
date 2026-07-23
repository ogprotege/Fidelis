/** Widget/embed navigation and the motion/focus behaviors that require a real
 * browser. Pure URL/history policy is covered by scripts/test-data.ts. */
import { expect, test } from "@playwright/test";

test("the standalone web widget is transparent, Garamond, and chrome-free", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "fidelis:settings",
      JSON.stringify({ theme: "night", scriptureFont: "sans" })
    );
  });
  await page.goto("/#/widget/votd?theme=day");
  await expect(page.locator(".widget-votd .votd-text")).toContainText(/\w/, { timeout: 15_000 });

  const shell = await page.evaluate(() => ({
    widget: document.documentElement.hasAttribute("data-widget"),
    font: document.documentElement.dataset.font,
    computedFont: getComputedStyle(document.querySelector(".widget-votd")!).fontFamily,
    htmlBackground: getComputedStyle(document.documentElement).backgroundColor,
    bodyBackground: getComputedStyle(document.body).backgroundColor
  }));
  expect(shell.widget).toBe(true);
  expect(shell.font).toBe("garamond");
  expect(shell.computedFont).toContain("EB Garamond");
  expect(shell.htmlBackground).toBe("rgba(0, 0, 0, 0)");
  expect(shell.bodyBackground).toBe("rgba(0, 0, 0, 0)");
  await expect(page.locator(".app")).toHaveCount(0);
});

test("About keeps the widget inline and accepts resize only from its iframe", async ({ page }) => {
  await page.goto("/#/about");
  const frameElement = page.locator(".embed-preview");
  const widget = page.frameLocator(".embed-preview").locator(".widget-votd");
  await expect(widget.locator(".votd-text")).toContainText(/\w/, { timeout: 15_000 });

  await expect.poll(async () => frameElement.evaluate((frame) => frame.clientHeight)).toBeGreaterThan(120);
  const dimensions = await frameElement.evaluate((frame) => {
    const iframe = frame as HTMLIFrameElement;
    return {
      viewport: iframe.clientHeight,
      content: iframe.contentDocument?.documentElement.scrollHeight ?? Number.POSITIVE_INFINITY
    };
  });
  expect(dimensions.viewport).toBeGreaterThanOrEqual(dimensions.content - 1);

  // A genuinely long passage changes the observed document geometry after
  // initial paint. The versioned message must grow the host iframe rather than
  // clipping it or relying on the old fixed-height assumption.
  const shortHeight = await frameElement.evaluate((frame) => frame.clientHeight);
  await widget.locator(".votd-text").evaluate((element) => {
    element.textContent = `${"In the beginning was the Word, and the Word was with God. ".repeat(24)}`;
  });
  await expect
    .poll(async () => frameElement.evaluate((frame) => frame.clientHeight))
    .toBeGreaterThan(shortHeight);
  const longDimensions = await frameElement.evaluate((frame) => {
    const iframe = frame as HTMLIFrameElement;
    return {
      viewport: iframe.clientHeight,
      content: iframe.contentDocument?.documentElement.scrollHeight ?? Number.POSITIVE_INFINITY
    };
  });
  expect(longDimensions.viewport).toBeGreaterThanOrEqual(longDimensions.content - 1);

  // A valid message from the owned frame is accepted but bounded. The host
  // clamps geometry rather than trusting an embed to claim an unbounded area.
  await widget.evaluate(() => {
    window.parent.postMessage(
      { type: "fidelis:widget-resize", version: 1, height: 5_000 },
      window.location.origin
    );
  });
  await expect.poll(async () => frameElement.evaluate((frame) => frame.clientHeight)).toBe(1600);

  const before = await frameElement.evaluate((frame) => frame.clientHeight);
  await page.evaluate(() => {
    window.postMessage(
      { type: "fidelis:widget-resize", version: 1, height: 800 },
      window.location.origin
    );
  });
  await expect.poll(async () => frameElement.evaluate((frame) => frame.clientHeight)).toBe(before);
  await expect(page).toHaveURL(/#\/about$/);
});

test("cross-page anchors focus the requested Today card", async ({ page }) => {
  await page.goto("/#/#votd");
  await expect(page.locator("#votd")).toBeFocused({ timeout: 15_000 });
  await expect(page.locator("#votd")).toBeInViewport();

  await page.goto("/#/#qotd");
  await expect(page.locator("#qotd")).toBeFocused({ timeout: 15_000 });
  await expect(page.locator("#qotd")).toBeInViewport();
});

test("persistent primary navigation moves focus into the routed page", async ({ page }) => {
  await page.goto("#/about");
  const massTab = page.getByRole("link", { name: "Mass", exact: true });
  await massTab.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/readings$/);
  await expect(page.locator("#main")).toBeFocused();
});

test("ScrollManager survives a widget route and restores About on Back", async ({ page }) => {
  await page.goto("/#/about");
  await page.locator("#embed").scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  expect(before).toBeGreaterThan(0);
  // ScrollManager deliberately coalesces scroll recording to one animation
  // frame. Let that frame commit before creating the next history entry.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

  await page.locator(".embed-standalone-link").click();
  await expect(page.locator(".widget-votd")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "About Fidelis" })).toBeVisible();
  await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeGreaterThan(before * 0.7);
});

test("SectionNav reads reduced motion at activation time and treats keyboard as instant", async ({
  page
}) => {
  await page.goto("/#/about");
  await page.evaluate(() => {
    const state = window as typeof window & { sectionBehavior?: ScrollBehavior };
    Element.prototype.scrollIntoView = function (options?: boolean | ScrollIntoViewOptions) {
      state.sectionBehavior = typeof options === "object" ? options.behavior : undefined;
    };
  });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Canon" }).click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { sectionBehavior?: string }).sectionBehavior)).toBe("auto");

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Texts" }).click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { sectionBehavior?: string }).sectionBehavior)).toBe("smooth");

  await page.getByRole("button", { name: "Privacy" }).focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => (window as typeof window & { sectionBehavior?: string }).sectionBehavior)).toBe("auto");
  await expect(page.locator("#privacy")).toBeFocused();
});

test("the web Widgets page gives an honest native-only state", async ({ page }) => {
  await page.goto("/#/widgets");
  await expect(page.getByRole("heading", { name: "Home Screen Widgets" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Verse of the Day" })).toBeVisible();
  await expect(page.getByText("Native Home Screen widgets are available")).toBeVisible();
  await expect(page.getByRole("button", { name: /Ask Android/ })).toHaveCount(0);
});

test("every routed page stays inside a 320px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  const routes = [
    "/#/",
    "/#/read",
    "/#/read/drc/genesis/1",
    "/#/plans",
    "/#/plans/new",
    "/#/readings",
    "/#/search",
    "/#/library",
    "/#/widgets",
    "/#/translations",
    "/#/settings",
    "/#/about",
    "/#/saint/07-14",
    "/#/history/07-14"
  ];

  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator("#main")).toBeVisible();
    await expect(page.locator(".route-fallback")).toHaveCount(0);
    await expect(page.locator("#main h1").first()).toBeVisible();
    await page.evaluate(async () => document.fonts.ready);
    await page.waitForTimeout(200);
    const geometry = await page.evaluate(() => {
      const clientWidth = document.documentElement.clientWidth;
      return {
        clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        offenders: [...document.querySelectorAll<HTMLElement>("body *")]
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.right > clientWidth + 1 || rect.left < -1;
          })
          .slice(0, 8)
          .map((element) => ({
            tag: element.tagName,
            className: element.className,
            right: Math.round(element.getBoundingClientRect().right),
            scrollWidth: element.scrollWidth
          }))
      };
    });
    expect(
      geometry.scrollWidth,
      `${route} overflows horizontally: ${JSON.stringify(geometry.offenders)}`
    ).toBeLessThanOrEqual(
      geometry.clientWidth + 1
    );
  }
});

test("Calendar settings and Mass date controls keep mobile touch geometry", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/#/settings");
  await expect(page.locator("#calendar")).toBeVisible();

  const calendarGeometry = await page.locator("#calendar").evaluate((calendar) => {
    const viewportWidth = document.documentElement.clientWidth;
    const controls = [...calendar.querySelectorAll<HTMLElement>("select, input")];
    return {
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth,
      controls: controls.map((control) => {
        const rect = control.getBoundingClientRect();
        return { left: rect.left, right: rect.right, height: rect.height };
      })
    };
  });
  expect(calendarGeometry.pageWidth).toBeLessThanOrEqual(calendarGeometry.viewportWidth + 1);
  for (const control of calendarGeometry.controls) {
    expect(control.left).toBeGreaterThanOrEqual(-1);
    expect(control.right).toBeLessThanOrEqual(calendarGeometry.viewportWidth + 1);
    expect(control.height).toBeGreaterThanOrEqual(44);
  }

  await page.goto("/#/readings?date=2024-01-01");
  await expect(page.getByRole("button", { name: "Today" })).toBeVisible();
  const readingsGeometry = await page.locator(".readings-toolbar").evaluate((toolbar) => {
    const date = toolbar.querySelector<HTMLElement>(".date-pick")!.getBoundingClientRect();
    const controls = [
      toolbar.querySelector<HTMLElement>('[aria-label="Previous day"]')!,
      toolbar.querySelector<HTMLElement>('[aria-label="Next day"]')!,
      toolbar.querySelector<HTMLElement>('[aria-label="Reading translation"]')!
    ].map((control) => control.getBoundingClientRect());
    return {
      clientWidth: toolbar.clientWidth,
      scrollWidth: toolbar.scrollWidth,
      date: { width: date.width, height: date.height },
      controls: controls.map((rect) => ({ width: rect.width, height: rect.height })),
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth
    };
  });
  expect(readingsGeometry.pageWidth).toBeLessThanOrEqual(readingsGeometry.viewportWidth + 1);
  expect(readingsGeometry.scrollWidth).toBeLessThanOrEqual(readingsGeometry.clientWidth + 1);
  expect(readingsGeometry.date.width).toBeGreaterThanOrEqual(44);
  expect(readingsGeometry.date.height).toBeGreaterThanOrEqual(44);
  for (const control of readingsGeometry.controls) {
    expect(control.width).toBeGreaterThanOrEqual(44);
    expect(control.height).toBeGreaterThanOrEqual(44);
  }
});
