// Username format: adjective-noun-NNNN, e.g. "sunny-otter-0427".
const ADJECTIVES = [
  'sunny',
  'brave',
  'quiet',
  'swift',
  'lucky',
  'bold',
  'calm',
  'eager',
  'gentle',
  'happy',
  'jolly',
  'kind',
  'lively',
  'merry',
  'noble',
  'proud',
  'silly',
  'witty',
  'wild',
  'zesty',
];
const NOUNS = [
  'otter',
  'falcon',
  'river',
  'comet',
  'maple',
  'tiger',
  'panda',
  'koala',
  'eagle',
  'harbor',
  'island',
  'canyon',
  'meadow',
  'summit',
  'lagoon',
  'glacier',
  'nomad',
  'voyager',
  'compass',
  'lantern',
];

export function randomUsername(): string {
  const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const num = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${num}`;
}
