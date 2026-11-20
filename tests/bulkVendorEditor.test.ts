import { describe, expect, it } from "vitest";
import { parseVendorCsv } from "../client/src/components/BulkVendorEditor";

describe("bulk vendor editor", () => {
  it("parses a simple import file into editable vendor rows", () => {
    const rows = parseVendorCsv("slug,name,category,active\nviva-cafe,VIVRA CAFE,Coffee & Bakery,true");
    expect(rows).toEqual([{ slug: "viva-cafe", name: "VIVRA CAFE", category: "Coffee & Bakery", active: "true" }]);
  });

  it("returns no rows for an empty import", () => {
    expect(parseVendorCsv("")).toEqual([]);
  });
});
