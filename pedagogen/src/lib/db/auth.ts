import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';
import { getDb } from './index';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'pedagogen-dev-secret-key-change-in-production-2024'
);

const TOKEN_EXPIRY = '7d';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  matiere: string;
  etablissement: string;
  telephone: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

export function getUserFromDb(userId: string): AuthUser | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, email, full_name, matiere, etablissement, telephone, avatar_url, created_at, updated_at
    FROM users WHERE id = ?
  `).get(userId) as any;
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    matiere: row.matiere,
    etablissement: row.etablissement,
    telephone: row.telephone,
    avatar_url: row.avatar_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function createUser(email: string, password: string, fullName: string): AuthUser {
  const db = getDb();
  const id = crypto.randomUUID();
  const hash = bcrypt.hashSync(password, 10);

  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, matiere, etablissement, telephone)
    VALUES (?, ?, ?, ?, 'Informatique', '', '')
  `).run(id, email, hash, fullName);

  return getUserFromDb(id)!;
}

export function authenticateUser(email: string, password: string): AuthUser | null {
  const db = getDb();
  const row = db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(email) as any;
  if (!row) return null;

  const valid = bcrypt.compareSync(password, row.password_hash);
  if (!valid) return null;

  return getUserFromDb(row.id);
}

export function updateUserProfile(
  userId: string,
  data: { full_name?: string; matiere?: string; etablissement?: string; telephone?: string }
): void {
  const db = getDb();
  const sets: string[] = [];
  const values: any[] = [];

  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      sets.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (sets.length === 0) return;

  sets.push("updated_at = datetime('now')");
  values.push(userId);

  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}
