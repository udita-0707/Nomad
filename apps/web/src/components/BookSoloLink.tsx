import { bookingSoloUrl } from '../lib/bookingHandoff';

// Shown when there is no group to share with yet: on an empty matches page,
// and on a group page where the owner is still the only member.
export function BookSoloLink({ city, checkIn, checkOut, className = 'button button-small' }: { city: string; checkIn: string; checkOut: string; className?: string }) {
  return (
    <a className={className} href={bookingSoloUrl({ city, checkIn, checkOut })} target="_blank" rel="noopener noreferrer">
      Book solo on Booking.com <span>↗</span>
    </a>
  );
}
