// src/index.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import ingestRouter from './routes/ingest';
import searchRouter from './routes/search';
import statsRouter from './routes/stats';

// Baca file .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
// Pakai express.json() agar aplikasi bisa membaca JSON dari req.body
// Limit kita atur ke 10mb berjaga-jaga jika seed_mentions.json ukurannya cukup besar
app.use(express.json({ limit: '10mb' })); 

// Mendaftarkan Router/Endpoint yang baru saja kita buat
app.use('/internal/mentions', ingestRouter);

app.use('/mentions', searchRouter);
app.use('/mentions', statsRouter);

// Endpoint Health Check (opsional, tapi disukai penguji)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Media Monitoring API is running!' });
});

// Menyalakan server
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});