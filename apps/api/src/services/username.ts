// Username format: adjective-noun-NNNN, e.g. "sunny-otter-0427".
// TODO: expand the word lists.
const ADJECTIVES = ['sunny', 'brave', 'quiet', 'swift', 'lucky'];
const NOUNS = ['otter', 'falcon', 'river', 'comet', 'maple'];

export function randomUsername(): string {
  const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const num = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${num}`;
}

// TODO: insert the user with randomUsername(); on a unique violation of
// users.username (pg error code 23505), retry with a new name (e.g. up to 5 times).
export async function allocateUsername(): Promise<string> {
  throw new Error('TODO: allocate username with retry on unique conflict');
}
