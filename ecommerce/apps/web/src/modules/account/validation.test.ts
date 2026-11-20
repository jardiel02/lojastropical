import { describe, expect, it } from "vitest";
import { addressError, formatCep, formatCpf, formatPhone, isFullName, isValidCpf, normalizeName, translateAuthError } from "./validation";

describe("cadastro de clientes", () => {
  it("valida CPF pelos dígitos verificadores", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("529.982.247-24")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
  });

  it("formata CPF, celular e CEP enquanto digita", () => {
    expect(formatCpf("52998224725")).toBe("529.982.247-25");
    expect(formatPhone("99981771035")).toBe("(99) 98177-1035");
    expect(formatPhone("9934211234")).toBe("(99) 3421-1234");
    expect(formatCep("65400000")).toBe("65400-000");
  });

  it("exige nome completo", () => {
    expect(isFullName(normalizeName("  Maria   Silva "))).toBe(true);
    expect(isFullName("Maria")).toBe(false);
  });

  it("confere o endereço", () => {
    const ok = { cep: "65400000", rua: "Rua A", numero: "10", complemento: null, bairro: "Centro", cidade: "Codó" };
    expect(addressError(ok)).toBe("");
    expect(addressError({ ...ok, cep: "654" })).toBe("CEP inválido.");
    expect(addressError({ ...ok, cidade: "" })).toBe("Escolha a cidade.");
  });

  it("traduz os erros do login", () => {
    expect(translateAuthError("Invalid login credentials")).toBe("E-mail ou senha incorretos.");
    expect(translateAuthError("User already registered")).toMatch(/já tem conta/);
  });
});
