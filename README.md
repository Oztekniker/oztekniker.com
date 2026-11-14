# Oztekniker — Portfolio v2

Chrome chain portfolio. Vite 8 + React 19 + Tailwind v4, with React Three Fiber, GSAP, Lenis and EmailJS ready for the next steps.

## Çalıştırma

```
npm install
npm run dev
```

Terminalde çıkan `http://localhost:5173` adresini tarayıcıda aç. Kodu kaydettikçe sayfa kendini yeniler.

Yayına almak için `npm run build` → oluşan `dist` klasörünün içini hosting'deki `public_html`'e yükle.

## Klasörler

- `src/App.jsx` — bölümlerin sırası ve yumuşak scroll (Lenis)
- `src/components/` — her bölüm ayrı dosya: Hero, Statement, Work, About, Contact
- `src/components/ChainColumn.jsx`, `ChromeSphere.jsx` — geçici CSS zincir/küre, 3D versiyonlarıyla değişecek
- `src/data/projects.js` — proje kartları ve stack listesi
- `src/index.css` — renkler, fontlar ve krom efektleri

## Sıradakiler

1. Intro animasyonu (maks 2 sn)
2. 3D krom zincir, scroll ile kayan
3. Scroll'la arka plan renk geçişleri
4. Küçük detaylar: başlık animasyonları, kartlarda tilt ve krom parlama
5. Contact formunu EmailJS'e bağlamak
6. Ask NOXIS (en son)
