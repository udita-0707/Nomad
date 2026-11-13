// A link to Booking.com search results for one traveller. Nothing is sent to our API
// and nothing is saved: the browser simply opens Booking.com in a new tab (D-019).
export function bookingSoloUrl({ city, checkIn, checkOut }: { city: string; checkIn: string; checkOut: string }) {
  const params = new URLSearchParams({ ss: city, checkin: checkIn, checkout: checkOut, group_adults: '1', no_rooms: '1' });
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}
