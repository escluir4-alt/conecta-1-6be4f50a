import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PontosMilhasModule from "./PontosMilhasModule";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  list: vi.fn(),
  insert: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getUser: mocks.getUser } },
}));
vi.mock("@/lib/travel-loyalty", () => ({
  listTravelLoyaltyPrograms: mocks.list,
  insertTravelLoyaltyProgram: mocks.insert,
  deleteTravelLoyaltyProgram: mocks.remove,
}));

const userRow = {
  id: "72ad4f7a-f9ba-48a5-b141-37cdf2df5ed1",
  user_id: "user-1",
  program_name: "Livelo",
  program_type: "pontos" as const,
  balance: 5000,
  expiration_date: null,
  value_per_point: 0.012,
  notes: "",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

afterEach(() => cleanup());
beforeEach(() => {
  localStorage.clear();
  mocks.getUser.mockReset().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  mocks.list.mockReset().mockResolvedValue({ data: [], error: null });
  mocks.insert.mockReset().mockImplementation(async (row) => ({ data: { ...row, id: row.id ?? userRow.id, created_at: userRow.created_at, updated_at: userRow.updated_at }, error: null }));
  mocks.remove.mockReset().mockResolvedValue({ error: null });
});

describe("PontosMilhasModule", () => {
  it("renders the empty wallet and sync status", async () => {
    render(<PontosMilhasModule userEmail="person@example.com" />);
    expect(await screen.findByText("Nenhum programa cadastrado ainda.")).toBeInTheDocument();
    expect(screen.getByText("Sincronizado com a nuvem")).toBeInTheDocument();
  });

  it("loads user programs from Supabase", async () => {
    mocks.list.mockResolvedValueOnce({ data: [userRow], error: null });
    render(<PontosMilhasModule userEmail="person@example.com" />);
    expect(await screen.findAllByText("5.000")).toHaveLength(2);
    expect(screen.getByText(/Livelo/)).toBeInTheDocument();
    expect(mocks.list).toHaveBeenCalledWith("user-1");
  });

  it("adds a program and persists it", async () => {
    render(<PontosMilhasModule />);
    fireEvent.change(screen.getByLabelText("Saldo"), { target: { value: "5000" } });
    fireEvent.change(screen.getByLabelText("Valor estimado por ponto (R$)"), { target: { value: "0,012" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar programa" }));
    expect(await screen.findAllByText("5.000")).toHaveLength(2);
    expect(JSON.parse(localStorage.getItem("axion:viagens:pontos-milhas:guest") ?? "[]")).toHaveLength(1);
  });

  it("compares cash and award values including taxes", async () => {
    render(<PontosMilhasModule />);
    fireEvent.change(screen.getByLabelText("Tarifa em dinheiro (R$)"), { target: { value: "1.500,00" } });
    fireEvent.change(screen.getByLabelText("Milhas necessárias"), { target: { value: "25000" } });
    fireEvent.change(screen.getByLabelText("Taxas da emissão (R$)"), { target: { value: "50,00" } });
    fireEvent.change(screen.getByLabelText("Valor estimado por milha (R$)"), { target: { value: "0,015" } });
    expect(screen.getByText("Usar milhas")).toBeInTheDocument();
    expect(screen.getByText("R$ 425,00")).toBeInTheDocument();
  });

  it("uses local storage when Supabase is unavailable", async () => {
    mocks.getUser.mockRejectedValueOnce(new Error("offline"));
    localStorage.setItem("axion:viagens:pontos-milhas:person@example.com", JSON.stringify([{
      id: "local-id", program: "Smiles", type: "milhas", balance: 1200,
      expiration: "", valuePerPoint: 0.015, notes: "local",
    }]));
    render(<PontosMilhasModule userEmail="person@example.com" />);
    expect(await screen.findByText("Modo local / offline")).toBeInTheDocument();
    expect(await screen.findAllByText("1.200")).toHaveLength(2);
  });

  it("removes a cloud program", async () => {
    mocks.list.mockResolvedValueOnce({ data: [userRow], error: null });
    render(<PontosMilhasModule userEmail="person@example.com" />);
    expect(await screen.findAllByText("5.000")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Excluir Livelo" }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith(userRow.id, "user-1"));
    expect(await screen.findByText("Nenhum programa cadastrado ainda.")).toBeInTheDocument();
  });
});
