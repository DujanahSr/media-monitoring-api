// src/db/pool.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Membaca konfigurasi dari file .env
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL tidak ditemukan di file .env!');
}

// Membuat Pool koneksi PostgreSQL
const pool = new Pool({
  connectionString: connectionString,
});

pool.on('connect', () => {
  console.log('🔗 Terhubung ke database PostgreSQL');
});

export default pool;