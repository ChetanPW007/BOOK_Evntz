// Save booking to local history
export function saveBookingToHistory(booking) {
  let existing = JSON.parse(localStorage.getItem("bookingHistory")) || [];
  existing.push(booking);
  localStorage.setItem("bookingHistory", JSON.stringify(existing));
}


// OPTIONAL — GOOGLE SHEET API
export async function saveBookingToGoogleSheet(booking) {
  try {
    await fetch("https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec", {
      method: "POST",
      body: JSON.stringify(booking),
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Google Sheet save failed", err);
  }
}
