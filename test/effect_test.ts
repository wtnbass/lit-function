import {
  mountFixture,
  unmountFixture,
  selectFixture,
  waitFor
} from "./helpers/fixture";
import { html, defineElement, useProperty, useEffect } from "../src";

describe("use-effect", () => {
  let updateCount = 0;
  let cleanupCount = 0;

  beforeAll(() => {
    defineElement("effect-test", () => {
      const value = useProperty("value");
      useEffect(() => {
        updateCount++;
        return () => {
          cleanupCount++;
        };
      }, [value]);
      return html`
        ${value}
      `;
    });
  });

  beforeEach(() => {
    updateCount = 0;
    cleanupCount = 0;
    mountFixture(`
      <effect-test></effect-test>
    `);
  });

  afterEach(() => {
    unmountFixture();
  });

  it("mount", async () => {
    await waitFor();
    expect(updateCount).toEqual(1);
  });

  it("unmount", async () => {
    await waitFor();
    unmountFixture();
    expect(cleanupCount).toEqual(1);
  });

  it("update", async () => {
    await waitFor();
    const target = selectFixture("effect-test");
    expect(updateCount).toEqual(1);

    target.setAttribute("value", "change");

    await waitFor();
    expect(cleanupCount).toEqual(1);
    expect(updateCount).toEqual(2);
  });
});
