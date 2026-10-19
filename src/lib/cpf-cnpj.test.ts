import { describe, expect, it } from "vitest";
import { normalizeCpfCnpj } from "./cpf-cnpj";

describe("normalizeCpfCnpj", () => {
  it("returns the digits of a valid CPF", () => {
    expect(normalizeCpfCnpj("529.982.247-25")).toBe("52998224725");
  });

  it("returns the digits of a valid CNPJ", () => {
    expect(normalizeCpfCnpj("11.444.777/0001-61")).toBe("11444777000161");
  });

  it("rejects repeated digits", () => {
    expect(normalizeCpfCnpj("111.111.111-11")).toBeNull();
    expect(normalizeCpfCnpj("00000000000000")).toBeNull();
  });

  it("rejects a wrong check digit", () => {
    expect(normalizeCpfCnpj("529.982.247-24")).toBeNull();
    expect(normalizeCpfCnpj("11.444.777/0001-62")).toBeNull();
  });

  it("rejects other lengths and stray characters", () => {
    expect(normalizeCpfCnpj("5299822472")).toBeNull();
    expect(normalizeCpfCnpj("")).toBeNull();
    expect(normalizeCpfCnpj("529x98224725")).toBeNull();
  });
});
