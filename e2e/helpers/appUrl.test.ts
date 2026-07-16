import { describe, expect, it } from "vitest";
import { appUrl } from "./appUrl";

describe("appUrl", () => {
  it("keeps paths relative to the Vite baseURL prefix", () => {
    expect(appUrl("/")).toBe("./");
    expect(appUrl("/planner")).toBe("./planner");
    expect(appUrl("/builds")).toBe("./builds");
    expect(appUrl("/planner?build=3.abc")).toBe("./planner?build=3.abc");
    expect(appUrl("/?build=3.abc")).toBe("./?build=3.abc");
    expect(appUrl("planner")).toBe("planner");
  });
});
