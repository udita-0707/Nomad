// TODO: implement with bcrypt.
// import bcrypt from 'bcrypt';
// const ROUNDS = 10;

export async function hashPassword(_plain: string): Promise<string> {
  throw new Error('TODO: bcrypt.hash(plain, ROUNDS)');
}

export async function verifyPassword(_plain: string, _hash: string): Promise<boolean> {
  throw new Error('TODO: bcrypt.compare(plain, hash)');
}
