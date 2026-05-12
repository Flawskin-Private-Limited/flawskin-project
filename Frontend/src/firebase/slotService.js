import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "./config";

const SLOTS_COL = "slots";

// Get available slots for a date (one-time)
export async function getSlotsByDate(dateString) {
  const snap = await getDoc(doc(db, SLOTS_COL, dateString));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// Real-time slots listener for a date
export function onSlotsChange(dateString, callback) {
  return onSnapshot(doc(db, SLOTS_COL, dateString), (snap) => {
    if (snap.exists()) {
      callback({
        id: snap.id,
        bookedRanges: snap.data().bookedRanges || [],
      });
    } else {
      callback({ id: dateString, bookedRanges: [] });
    }
  });
}

// Mark a slot as booked for a given date
import { runTransaction } from "firebase/firestore";

export async function bookSlot(dateString, range) {
  const ref = doc(db, SLOTS_COL, dateString);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);

    const data = snap.exists() ? snap.data() : {};
    const bookedRanges = data.bookedRanges || [];

    const isOverlapping = bookedRanges.some((b) => {
       if (b.bookingId === range.bookingId) return false;
      return (
        new Date(range.startTime) < new Date(b.endTime) &&
        new Date(b.startTime) < new Date(range.endTime)
      );
    });
    console.log("EXISTING RANGES 👉", bookedRanges);
    console.log("NEW RANGE 👉", range);
    if (isOverlapping) {
      throw new Error("Slot already booked (overlap detected)");
    }

    // ✅ IMPORTANT: attach bookingId
    const newRange = {
      ...range,
      bookingId: range.bookingId, // 👈 REQUIRED
    };

    transaction.set(
      ref,
      {
        bookedRanges: [...bookedRanges, newRange],
      },
      { merge: true },
    );
  });
}

// Release a previously booked slot
export async function unbookSlot(dateString, range) {
  const ref = doc(db, "slots", dateString);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const data = snap.data();
  const bookedRanges = data.bookedRanges || [];

  const updated = bookedRanges.filter((b) => b.bookingId !== range.bookingId);

  await updateDoc(ref, {
    bookedRanges: updated,
  });
}
