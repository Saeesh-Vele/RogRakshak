import { describe, expect, it } from "vitest";
import { initialsFor } from "@/lib/auth";

describe("initialsFor", () => {
  it("uses first and last name, skipping the honorific", () => {
    expect(initialsFor("Dr. S. Kulkarni", "s.kulkarni@hospital.org")).toBe("SK");
    expect(initialsFor("Anita Sharma", "a@b.c")).toBe("AS");
  });

  it("handles a single-word name", () => {
    expect(initialsFor("Kulkarni", "k@hospital.org")).toBe("KU");
  });

  it("falls back to the email when no name was collected", () => {
    expect(initialsFor("", "s.kulkarni@hospital.org")).toBe("S.");
  });

  it("never returns an empty monogram", () => {
    expect(initialsFor("", "")).toBe("?");
    expect(initialsFor("   ", "")).toBe("?");
  });
});
