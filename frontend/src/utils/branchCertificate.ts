import html2canvas from 'html2canvas';
import { formatCalendarDate } from './date';

export const downloadAsPng = (html: string, filename: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, {
      position: 'fixed',
      left: '-99999px',
      top: '-99999px',
      width: '1200px',
      height: '900px',
      border: 'none',
      visibility: 'hidden',
      pointerEvents: 'none',
    });
    document.body.appendChild(iframe);

    const cleanup = () => {
      try { document.body.removeChild(iframe); } catch { /* ignore */ }
    };

    iframe.addEventListener('load', async () => {
      try {
        const doc = iframe.contentDocument;
        const pageEl = doc?.querySelector('.page') as HTMLElement | null;
        if (!pageEl) throw new Error('Certificate element not found');

        if (doc?.fonts) {
          try {
            await doc.fonts.load('700 36px "Cinzel"');
            await doc.fonts.load('400 19px "Montserrat"');
            await doc.fonts.load('500 19px "Montserrat"');
            await doc.fonts.load('600 15px "Montserrat"');
            await doc.fonts.load('400 15px "Montserrat"');
            await doc.fonts.load('700 62px "Playfair Display"');
            await doc.fonts.load('700 28px "Playfair Display"');
            await doc.fonts.load('400 62px "Playfair Display"');
          } catch (e) {
            console.warn('Font loading error:', e);
          }
          await doc.fonts.ready;
        }
        await new Promise(r => setTimeout(r, 2400));

        const imgs = Array.from(pageEl.querySelectorAll('img'));
        await Promise.all(
          imgs.map(img =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res(); })
          )
        );
        await new Promise(r => setTimeout(r, 300));

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: null,
          width: pageEl.scrollWidth,
          height: pageEl.scrollHeight,
        });

        canvas.toBlob(blob => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }
          resolve();
        }, 'image/png');
      } catch (e) {
        reject(e);
      } finally {
        cleanup();
      }
    });

    iframe.srcdoc = html;
  });
};

export const branchCertificateHtml = (branch: any): string => {
  const o = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, '');
  const validUpto = branch.validUpto
    ? formatCalendarDate(branch.validUpto, { month: 'short', year: 'numeric' }, 'en-US')
    : 'N/A';
  const branchLocation = branch.location || branch.branchName || branch.name || 'Hadapsar';
  const atpNo = branch.atpNo || (branch.branchCode ? `DYAN/ATP/${branch.branchCode}` : 'DYAN/ATP/—');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Montserrat:wght@300;400;500;600&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #222; }
.page { width: 1122px; height: 794px; position: relative; overflow: hidden; background: #1A6B7A; font-family: 'Montserrat', sans-serif; }
.bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1; }
.ornaments { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 2; pointer-events: none; }
.main-title { position: absolute; top: 95px; width: 100%; text-align: center; font-family: 'Cinzel', serif; font-size: 36px; line-height: 1.3; font-weight: 700; text-transform: uppercase; color: #F7F7F7; z-index: 3; }
.affil { position: absolute; top: 195px; width: 100%; text-align: center; font-size: 19px; line-height: 1.45; font-weight: 400; color: rgba(255,255,255,0.92); z-index: 3; }
.cert-title { position: absolute; top: 278px; width: 100%; height: 90px; text-align: center; z-index: 3; }
.branch { position: absolute; top: 385px; width: 100%; text-align: center; font-size: 19px; font-weight: 500; color: #FFFFFF; z-index: 3; }
.logos { position: absolute; top: 445px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 38px; z-index: 3; }
.logo-iso { height: 81px; }
.logo-msme { height: 70px; filter: brightness(0) invert(1); }
.logo-startup { height: 32px; }
.bottom-left { position: absolute; left: 90px; bottom: 114px; z-index: 3; }
.brand-logo { width: 185px; display: block; margin-bottom: 14px; }
.address { font-size: 15px; line-height: 1.4; color: #FFFFFF; font-weight: 400; }
.reg-row { margin-top: 14px; display: flex; gap: 28px; font-size: 15px; color: #FFFFFF; font-weight: 600; }
.bottom-right { position: absolute; right: 92px; bottom: 114px; text-align: center; z-index: 3; }
.sign-title { font-size: 15px; line-height: 1.4; color: #FFFFFF; font-weight: 400; }
.sign-org { font-size: 15px; line-height: 1.4; color: #FFFFFF; font-weight: 600; }
</style>
</head>
<body>
<div class="page">
  <img class="bg" src="${o}/certificate-assets/branch/bg.png" alt="">
  <img class="ornaments" src="${o}/certificate-assets/branch/ornaments.svg" alt="">
  <div class="main-title">DNYANSETU EDUCATION &amp; IT<br>INSTITUTE INDIA</div>
  <div class="affil">(Affiliated by Ministry of Corporate Affairs Government of India<br>CIN.U85490PN2026PTC252150)</div>
  <div class="cert-title">
    <img src="${o}/certificate-assets/branch/authority-certificate.svg" alt="Authority Certificate" style="width:690px;height:auto;display:block;margin:0 auto;" />
  </div>
  <div class="branch">Authorised Training Provider DNYANSETU INSTITUTE ,${branchLocation.toUpperCase()}</div>
  <div class="logos">
    <img class="logo-iso" src="${o}/certificate-assets/branch/iso.svg" alt="ISO">
    <img class="logo-msme" src="${o}/certificate-assets/branch/msme.svg" alt="MSME">
    <img class="logo-startup" src="${o}/certificate-assets/branch/startup-india.svg" alt="Startup India">
  </div>
  <div class="bottom-left">
    <img class="brand-logo" src="${o}/certificate-assets/branch/logo.svg" alt="DnyanSetu">
    <div class="address">DnyanSetu Institute, 2nd floor, Kapare Heights, near hadapsar<br>bhaji mandai, Hadapsar, Pune - 28</div>
    <div class="reg-row">
      <div>ATP Reg. No: ${atpNo}</div>
      <div>Valid Up to: ${validUpto}</div>
    </div>
  </div>
  <div class="bottom-right">
    <div style="width:118px;height:84px;display:block;margin:0 auto 6px;"></div>
    <div class="sign-title">Chairman &amp; Managing Director</div>
    <div class="sign-org">DNYANSETU INSTITUTE INDIA</div>
  </div>
</div>
</body>
</html>`;
};
