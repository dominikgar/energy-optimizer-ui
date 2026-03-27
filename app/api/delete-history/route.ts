import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
// @ts-ignore
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function DELETE(req: Request) {
  try {
    // 1. Sprawdzamy autoryzację za pomocą Clerka
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
    }

    // 2. Bezpiecznie usuwamy TYLKO dane przypisane do zalogowanego użytkownika
    const result = await pool.query('DELETE FROM energy_consumption WHERE user_id = $1', [userId]);

    return NextResponse.json({ 
      success: true, 
      message: "Dane zostały trwale usunięte.",
      deletedRows: result.rowCount 
    }, { status: 200 });

  } catch (err: any) {
    console.error("Błąd podczas usuwania danych (RODO):", err);
    return NextResponse.json({ error: "Wewnętrzny błąd serwera podczas usuwania danych." }, { status: 500 });
  }
}