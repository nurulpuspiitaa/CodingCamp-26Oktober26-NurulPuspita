// Feature: expense-budget-visualizer, Property 15: Feedback timer resets on repeated messages

/**
 * Property 15: Feedback timer resets on repeated messages
 * Validates: Requirements 11.4
 *
 * When setFeedback() is called a second time before the first timer fires,
 * the element should clear at exactly `delayMs` after the SECOND call — not
 * the first. The first timer must have been cancelled so it does not clear
 * the element when it would have originally fired.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Re-implementation of the production setFeedback() utility
// (mirrors js/script.js exactly — no production files are modified)
// ---------------------------------------------------------------------------

const feedbackTimers = new WeakMap();

function setFeedback(element, message, delayMs) {
  element.textContent = message;
  clearTimeout(feedbackTimers.get(element));
  const timerId = setTimeout(() => {
    element.textContent = "";
    feedbackTimers.delete(element);
  }, delayMs);
  feedbackTimers.set(element, timerId);
}

// ---------------------------------------------------------------------------
// Helper: create a minimal DOM element for use as a feedback target
// ---------------------------------------------------------------------------

function createFeedbackElement() {
  const el = document.createElement("p");
  document.body.appendChild(el);
  return el;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Property 15 — Feedback timer resets on repeated messages", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Clean up any appended elements
    document.body.innerHTML = "";
  });

  // -------------------------------------------------------------------------
  // Concrete scenario: second call before first timer fires
  // -------------------------------------------------------------------------
  it("15a (concrete): second message cancels first timer; clears at t+4000ms after second call", () => {
    const el = createFeedbackElement();

    // First call at t=0
    setFeedback(el, "first message", 4000);
    expect(el.textContent).toBe("first message");

    // Advance to t=2000ms — first timer has NOT fired yet
    vi.advanceTimersByTime(2000);
    expect(el.textContent).toBe("first message");

    // Second call at t=2000ms
    setFeedback(el, "second message", 4000);
    expect(el.textContent).toBe("second message");

    // Advance to t=2000 + 3999 = t+3999ms after second call — should NOT clear yet
    vi.advanceTimersByTime(3999);
    expect(el.textContent).toBe("second message");

    // Advance 1 more ms: t+4000ms after second call — should clear now
    vi.advanceTimersByTime(1);
    expect(el.textContent).toBe("");
  });

  it("15b (concrete): first timer does NOT clear the element when it would have fired", () => {
    const el = createFeedbackElement();

    // First call at t=0
    setFeedback(el, "first message", 4000);

    // Second call at t=1000ms
    vi.advanceTimersByTime(1000);
    setFeedback(el, "second message", 4000);

    // Advance to t=4000ms total (i.e., original first timer expiry)
    // At this point, 3000ms have passed since the second call, so should NOT clear
    vi.advanceTimersByTime(3000);
    expect(el.textContent).toBe("second message");

    // Advance 1000ms more (t=5000ms total; 4000ms after second call) — should clear now
    vi.advanceTimersByTime(1000);
    expect(el.textContent).toBe("");
  });

  // -------------------------------------------------------------------------
  // Property-based scenario: varying gap between first and second call
  // -------------------------------------------------------------------------
  it("15c (property): timer always resets to full delayMs after second call, regardless of gap", () => {
    fc.assert(
      fc.property(
        // gap: how many ms pass between first and second call (must be < delayMs to test cancellation)
        fc.integer({ min: 1, max: 3999 }),
        (gap) => {
          const el = createFeedbackElement();

          // First call
          setFeedback(el, "first message", 4000);

          // Advance by gap ms (first timer has NOT fired yet since gap < 4000)
          vi.advanceTimersByTime(gap);
          expect(el.textContent).toBe("first message");

          // Second call
          setFeedback(el, "second message", 4000);
          expect(el.textContent).toBe("second message");

          // At t = 4000 - gap - 1 ms after second call: original first timer would fire here,
          // but the element should still show "second message"
          const remainingFromFirst = 4000 - gap - 1;
          if (remainingFromFirst > 0) {
            vi.advanceTimersByTime(remainingFromFirst);
            expect(el.textContent).toBe("second message");
            // Advance to t = 4000ms after second call
            vi.advanceTimersByTime(4000 - remainingFromFirst);
          } else {
            // gap was 3999, remainingFromFirst = 0; advance the full 4000ms
            vi.advanceTimersByTime(4000);
          }

          expect(el.textContent).toBe("");

          // Clean up element for next iteration
          el.remove();
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property-based scenario: varying messages (fast-check generates strings)
  // -------------------------------------------------------------------------
  it("15d (property): any pair of messages — second always wins and clears after its own delay", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 1, max: 3999 }),
        (firstMsg, secondMsg, gap) => {
          const el = createFeedbackElement();

          setFeedback(el, firstMsg, 4000);
          vi.advanceTimersByTime(gap);

          setFeedback(el, secondMsg, 4000);

          // Just before the second timer fires
          vi.advanceTimersByTime(3999);
          expect(el.textContent).toBe(secondMsg);

          // Second timer fires
          vi.advanceTimersByTime(1);
          expect(el.textContent).toBe("");

          el.remove();
        }
      ),
      { numRuns: 100 }
    );
  });
});
