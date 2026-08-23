import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ADMIN_COLLECTIONS,
  FieldError,
  coerceBody,
  coerceField,
  isCollectionName,
  type CollectionSpec,
} from "./adminCollections";

/**
 * The admin API writes whatever this validator returns straight into a content table, so the
 * cases that matter are the ones where a bad request would otherwise reach the database: a
 * column that is not editable, a required field cleared, a number sent as a word.
 */
const places = ADMIN_COLLECTIONS.places as CollectionSpec;

describe("coerceField", () => {
  it("trims strings and treats an empty one as clearing the field", () => {
    assert.equal(coerceField("name", "string", "  Trishna  "), "Trishna");
    assert.equal(coerceField("phone", "string", ""), null);
    assert.equal(coerceField("phone", "string", null), null);
  });

  it("leaves an absent field absent, which is different from clearing it", () => {
    assert.equal(coerceField("phone", "string", undefined), undefined);
  });

  it("accepts numbers as strings, because a form sends strings", () => {
    assert.equal(coerceField("lat", "float", "19.076"), 19.076);
    assert.equal(coerceField("reviewCount", "int", "1200"), 1200);
  });

  it("rejects a number that is not one", () => {
    assert.throws(() => coerceField("lat", "float", "north"), FieldError);
    assert.throws(() => coerceField("reviewCount", "int", "12.5"), FieldError);
  });

  it("accepts booleans in both forms a client might send", () => {
    assert.equal(coerceField("isFree", "boolean", true), true);
    assert.equal(coerceField("isFree", "boolean", "false"), false);
    assert.throws(() => coerceField("isFree", "boolean", "yes"), FieldError);
  });

  it("cleans a string array and rejects a non-array", () => {
    assert.deepEqual(coerceField("tags", "stringArray", [" food ", "", "colaba"]), ["food", "colaba"]);
    assert.throws(() => coerceField("tags", "stringArray", "food"), FieldError);
    assert.throws(() => coerceField("tags", "stringArray", [1, 2]), FieldError);
  });

  it("parses dates and rejects nonsense", () => {
    assert.equal(
      (coerceField("startDate", "date", "2026-03-01T10:00:00.000Z") as Date).toISOString(),
      "2026-03-01T10:00:00.000Z",
    );
    assert.throws(() => coerceField("startDate", "date", "someday"), FieldError);
  });
});

describe("coerceBody", () => {
  it("ignores keys that are not editable columns", () => {
    const values = coerceBody(places, { name: "Trishna", id: 99, searchText: "hacked", city: "Mumbai", category: "food", address: "Fort", lat: 1, lng: 2 }, { partial: false });

    assert.equal("id" in values, false);
    assert.equal("searchText" in values, false);
    assert.equal(values.name, "Trishna");
  });

  it("enforces required fields on a create", () => {
    assert.throws(
      () => coerceBody(places, { name: "Trishna" }, { partial: false }),
      (error: unknown) => error instanceof FieldError && /category is required/.test(error.message),
    );
  });

  it("allows a partial update that touches one field", () => {
    assert.deepEqual(coerceBody(places, { phone: "+91-22-2270-3213" }, { partial: true }), {
      phone: "+91-22-2270-3213",
    });
  });

  it("refuses to clear a required field through a partial update", () => {
    assert.throws(
      () => coerceBody(places, { name: "" }, { partial: true }),
      (error: unknown) => error instanceof FieldError && /name cannot be cleared/.test(error.message),
    );
  });

  it("rejects a body with nothing editable in it", () => {
    assert.throws(() => coerceBody(places, { id: 4 }, { partial: true }), FieldError);
  });
});

describe("the collection registry", () => {
  it("recognises only the declared collections", () => {
    assert.equal(isCollectionName("places"), true);
    assert.equal(isCollectionName("users"), false);
    assert.equal(isCollectionName("toString"), false);
  });

  it("never exposes a derived or generated column as editable", () => {
    for (const [name, raw] of Object.entries(ADMIN_COLLECTIONS)) {
      const spec = raw as CollectionSpec;
      for (const forbidden of ["id", "searchText", "openingHoursJson", "createdAt", "updatedAt"]) {
        assert.equal(forbidden in spec.fields, false, `${name} exposes ${forbidden}`);
      }
    }
  });

  it("never lets a moderated table's status be written as an ordinary field", () => {
    // Publishing and takedown go through the moderation route, which records who did it and
    // why. A `status` reachable from generic CRUD would be a takedown with no trail behind it.
    // `movies.status` is exempt because it is the release status — now showing or coming soon —
    // on a table that carries no moderation state at all.
    for (const [name, raw] of Object.entries(ADMIN_COLLECTIONS)) {
      const spec = raw as CollectionSpec;
      if (!spec.statusColumn) continue;
      assert.equal("status" in spec.fields, false, `${name} exposes its moderation status`);
    }
  });

  it("declares every required field as an editable one", () => {
    for (const [name, raw] of Object.entries(ADMIN_COLLECTIONS)) {
      const spec = raw as CollectionSpec;
      for (const field of spec.required) {
        assert.ok(field in spec.fields, `${name} requires ${field} but does not accept it`);
      }
    }
  });

  it("declares what points at a place, so a delete cannot empty a saved list", () => {
    const places = ADMIN_COLLECTIONS.places as CollectionSpec;
    const labels = (places.blockingReferences ?? []).map((reference) => reference.label);

    assert.deepEqual(labels.sort(), ["a collection", "a deal", "an itinerary", "a saved list"].sort());
  });

  it("only declares blocking references where a foreign key actually exists", () => {
    // The columns are all named `place_id`; checking them for an event would compare an
    // event's id against a place's and refuse the delete for entirely the wrong reason.
    for (const [name, raw] of Object.entries(ADMIN_COLLECTIONS)) {
      if (name === "places") continue;
      const spec = raw as CollectionSpec;
      assert.equal(spec.blockingReferences, undefined, `${name} declares references it does not have`);
    }
  });
});
