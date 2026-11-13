import type { Match, MatchFilters } from '@nomad/shared';

export function applyMatchFilters(matches: Match[], filters: MatchFilters): Match[] {
  return matches.filter((match) => {
    const interestsMatch = filters.interests.every((interest) => match.sharedInterests.includes(interest));
    const genderMatch = filters.gender === 'ANY'
      || (filters.gender === 'ALL_FEMALE' && match.maleCount === 0)
      || (filters.gender === 'ALL_MALE' && match.femaleCount === 0)
      || (filters.gender === 'MIXED' && match.femaleCount > 0 && match.maleCount > 0);
    return interestsMatch && genderMatch;
  });
}
