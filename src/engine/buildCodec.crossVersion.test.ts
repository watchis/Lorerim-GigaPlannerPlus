import { describe, expect, it } from "vitest";
import { decodeBuildPackage } from "@/engine/buildCodec";
import { getTestGameData } from "@/test/helpers";

const USER_BUILD_CODE =
  "2.H4sIABLeSWoAAz2RsU6EIRCEX8VQTy4ssMBeae8T_LlCY2NyZ4yeNsZ39-M_YzEZZnZYWPhOX-lYlC5Q8kM-1ENPSmekZ6V3SOljjzylY4Wu6biVKjspPbBs6rIlLggbsq4pywoNzMcV9qWtId-QIzSzpmlOzVBQygWErNKq0qLRvi2mk1NztDfZMEBmUBvUaGWBH3iBF6HC-aU14GCtB5iAGr2K4zu-4zu-4_ei2geYIFRHBQ3ghQE059RwsDxynNW4c7MCXK1kMNQa7M6sZ2bldSznk7auvmgyLhTyRbzKJLkZY-0pY86d-19gaPiJXlf-YVv5zIVvO-1_tYa6rfbtxJ9e-cz7z5fz811JP7_NaJMC4wEAAA";

describe("user shared build link", () => {
  const game = getTestGameData();

  it("imports across patch versions within the same major modpack", () => {
    const decoded = decodeBuildPackage(USER_BUILD_CODE, game);
    expect(decoded.shared?.name).toBe("Build 2");
    expect(decoded.build.playerLevel).toBe(50);
    expect(decoded.sourceModpackVersion).toBe("5.0.3.6");
    expect(decoded.build.selectedPerkIds.length).toBeGreaterThan(0);
  });
});
