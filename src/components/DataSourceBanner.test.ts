import { describe, expect, it } from "vitest";
import { sourceLabel } from "./DataSourceBanner";

describe("sourceLabel", () => {
  it("names each data source", () => {
    expect(sourceLabel("live")).toBe("Dados reais do Instagram");
    expect(sourceLabel("unofficial")).toBe("Fonte não oficial — pode falhar ou ficar desatualizada");
    expect(sourceLabel("mock")).toBe("Dados de exemplo");
  });
});
