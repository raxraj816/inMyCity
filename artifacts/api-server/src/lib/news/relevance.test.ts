import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { mentionsCity } from "./relevance";

/**
 * The filter that decides whether a story reaches the moderation queue at all.
 *
 * Both directions cost something. Too strict and real local news is silently dropped; too
 * loose and the queue fills with national wire copy until nobody opens it. The cases below are
 * taken from an actual fetch of a Mumbai publisher's general feed.
 */
describe("mentionsCity", () => {
  it("keeps a story that names the city", () => {
    assert.equal(mentionsCity("Mumbai", "GRP Records Statement In Mumbai Local Train Death Case"), true);
  });

  it("keeps a story that names only a neighbourhood", () => {
    assert.equal(mentionsCity("Mumbai", "Bandra Football Ground Row Revives A Memory"), true);
    assert.equal(mentionsCity("Mumbai", "Traders at Crawford Market oppose the new parking rules"), true);
  });

  it("keeps a story where the city is only in the summary", () => {
    assert.equal(
      mentionsCity("Mumbai", "Ambassador praises the Aqua Line", "The visitor toured Mumbai this week."),
      true,
    );
  });

  it("drops national and other-city copy", () => {
    assert.equal(mentionsCity("Mumbai", "Bayern Munich Lift The Supercup After A 2-1 Win"), false);
    assert.equal(mentionsCity("Mumbai", "Pune: Hinjawadi Residents To Protest Over Traffic"), false);
    assert.equal(mentionsCity("Mumbai", "Meerut Road Accident: Devotee Dies, Five Injured"), false);
  });

  it("does not match a place name buried inside another word", () => {
    // "Fort" and "Khar" are real localities and short enough to appear inside unrelated words.
    assert.equal(mentionsCity("Mumbai", "A story about great comfort and considerable effort"), false);
    assert.equal(mentionsCity("Mumbai", "Khartoum sees renewed fighting"), false);
  });

  it("does not treat a category word as evidence of place", () => {
    // These are in the search vocabulary on purpose, and are useless as relevance signals: a
    // Delhi store opening was filed as Mumbai news because the headline said "museum".
    assert.equal(mentionsCity("Mumbai", "Designer turns his New Delhi store into a living museum"), false);
    assert.equal(mentionsCity("Mumbai", "Singer recalls discovering Shakespeare on the train"), false);
  });

  it("matches Devanagari, where word boundaries do not apply", () => {
    assert.equal(mentionsCity("Mumbai", "मुंबईत पाऊस सुरू"), true);
  });

  it("is case-insensitive and unbothered by punctuation", () => {
    assert.equal(mentionsCity("Mumbai", "'MUMBAI METRO 3 IS PHENOMENAL': ambassador says"), true);
  });

  it("keeps everything for a city with no curated vocabulary, rather than dropping it all", () => {
    assert.equal(mentionsCity("Jaipur", "Anything at all"), true);
  });

  it("drops empty text rather than treating it as a match", () => {
    assert.equal(mentionsCity("Mumbai", null, undefined, "  "), false);
  });
});
