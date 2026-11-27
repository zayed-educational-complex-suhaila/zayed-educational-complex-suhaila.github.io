// Picture compression for exam questions. Pictures are stored inside each exam, and every student downloads them
// when they open the exam, so keeping them small keeps the website fast and inside the free download allowance.
// compress(): resizes to at most MAX px and re-encodes as WebP (keeps transparency). If the result is not smaller,
// or the browser can't make WebP, the original is kept. SVG and GIF pictures are left as they are.
(function () {
  const MAX = 1100, QUALITY = 0.82;
  const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  async function compress(dataUrl) {
    if (typeof dataUrl !== 'string' || !/^data:image\/(png|jpe?g|webp|bmp)/i.test(dataUrl)) return dataUrl;
    try {
      const img = await load(dataUrl);
      const k = Math.min(1, MAX / img.width, MAX / img.height);
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const out = c.toDataURL('image/webp', QUALITY);
      return out.startsWith('data:image/webp') && out.length < dataUrl.length ? out : dataUrl;
    } catch (_) { return dataUrl; }
  }
  // compress every picture of an exam's questions; returns { questions, before, after, changed }
  async function compressQuestions(questions, onPic) {
    let before = 0, after = 0, changed = 0;
    const out = [];
    for (const q of questions || []) {
      const n = { ...q };
      if (n.image_url) { const o = n.image_url, v = await compress(o); before += o.length; after += v.length; if (v !== o) { changed++; n.image_url = v; } onPic && onPic(); }
      if (Array.isArray(n.option_images)) {
        n.option_images = await Promise.all(n.option_images.map(async o => { if (!o) return o; const v = await compress(o); before += o.length; after += v.length; if (v !== o) changed++; onPic && onPic(); return v; }));
      }
      out.push(n);
    }
    return { questions: out, before, after, changed };
  }
  window.Pictures = { compress, compressQuestions };
})();
