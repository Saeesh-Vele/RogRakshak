import { describe, it, expect, vi, beforeEach } from "vitest";
import { investigationsApi } from "@/lib/api-client";
import { getProvider } from "@/lib/data-provider";
import { useAppStore } from "@/lib/store";

// Mock the API client
vi.mock("@/lib/api-client", () => ({
  investigationsApi: {
    list: vi.fn(),
    get: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

describe("DataProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the mock provider when in mock mode", async () => {
    // Set mock mode
    useAppStore.setState({ mode: "mock" });

    const provider = getProvider();
    const result = await provider.list();

    expect(result.total_cases).toBeGreaterThan(0);
    expect(result.cases[0].case_id).toBe("CASE-2026-001");
    expect(investigationsApi.list).not.toHaveBeenCalled();
  });

  it("should return the live provider when in live mode", async () => {
    // Set live mode
    useAppStore.setState({ mode: "live" });

    // Setup mock response
    const mockResponse = { total_cases: 0, cases: [] };
    vi.mocked(investigationsApi.list).mockResolvedValue(mockResponse);

    const provider = getProvider();
    const result = await provider.list();

    expect(result).toEqual(mockResponse);
    expect(investigationsApi.list).toHaveBeenCalledOnce();
  });
});
