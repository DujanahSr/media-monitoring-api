// tests/normalize.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeMention } from '../src/services/normalize';
import { RawMention } from '../src/types/mention';

describe('Logika Normalisasi Data (Riskiest Logic)', () => {
  
  it('harus merapikan nama sumber menjadi huruf kapital di awal', () => {
    const raw: RawMention = {
      source: '  thestar   ', // Banyak spasi dan huruf kecil
      content: 'test',
      url: 'http://test.com'
    };
    const result = normalizeMention(raw);
    expect(result.source).toBe('Thestar'); 
  });

  it('harus menghapus tag HTML berbahaya dari konten (Mencegah XSS)', () => {
    const raw: RawMention = {
      source: 'News',
      content: '<p>Banjir di <b>Jakarta</b></p> <script>alert("Hacked!")</script>',
      url: 'http://test.com'
    };
    const result = normalizeMention(raw);
    expect(result.content).toBe('Banjir di Jakarta alert("Hacked!")');
  });

  it('harus mengubah angka engagement ber-koma menjadi Integer murni', () => {
    const raw: RawMention = {
      source: 'News',
      content: 'test',
      url: 'http://test.com',
      engagement: '1,204'
    };
    const result = normalizeMention(raw);
    expect(result.engagement).toBe(1204);
  });

  it('harus mem-parsing Unix Timestamp menjadi format objek Date yang benar', () => {
    const raw: RawMention = {
      source: 'News',
      content: 'test',
      url: 'http://test.com',
      published_at: 1786435200 // Angka ini mewakili 11 Agustus 2026
    };
    const result = normalizeMention(raw);
    // Pastikan hasil Date mengandung tulisan tahun dan bulan tersebut
    expect(result.published_at?.toISOString()).toContain('2026-08-11');
  });

});