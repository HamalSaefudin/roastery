import { execSync } from 'node:child_process'

/**
 * Manipulasi langsung ke backend/DB dev untuk setup skenario auth yang
 * tidak bisa dipicu lewat API publik (role staff, status suspended) —
 * pola sama dengan backend e2e (docs/_conventions.md §18: manipulasi DB
 * langsung utk state yang sulit dipicu). BUTUH backend nyala di :3000
 * DAN container `roastery-postgres` docker jalan.
 */
const API = 'http://localhost:3000/api'

export async function daftarUser(email: string, password: string) {
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    throw new Error(
      `Gagal daftar user test (${email}): ${res.status} ${await res.text()}`,
    )
  }
}

function psql(sql: string) {
  execSync(
    `docker exec roastery-postgres psql -U postgres -d roastery -c "${sql.replace(/"/g, '\\"')}"`,
    { stdio: 'pipe' },
  )
}

export function jadikanStaff(email: string) {
  psql(`UPDATE users SET role='staff' WHERE email='${email}'`)
}

export function jadikanSuspended(email: string) {
  psql(`UPDATE users SET status='suspended' WHERE email='${email}'`)
}

export function hapusUserTest(...emails: Array<string>) {
  const daftar = emails.map((e) => `'${e}'`).join(',')
  psql(`DELETE FROM users WHERE email IN (${daftar})`)
}
