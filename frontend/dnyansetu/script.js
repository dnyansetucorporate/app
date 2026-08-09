document.addEventListener("DOMContentLoaded", () => {

 /* Add to your JS file */
const hamBtn = document.getElementById('hamBtn');
const mobMenu = document.getElementById('mobMenu');

hamBtn.addEventListener('click', () => {
  const open = mobMenu.classList.toggle('open');
  hamBtn.setAttribute('aria-expanded', open);
});

window.addEventListener('scroll', () => {
  document.getElementById('siteHeader')
    .classList.toggle('scrolled', window.scrollY > 10);
});

  // ── Load GSAP + ScrollTrigger ──────────────────────────────────────────
  const gsapScript = document.createElement("script");
  gsapScript.src = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js";
  document.head.appendChild(gsapScript);

  gsapScript.onload = () => {
    const stScript = document.createElement("script");
    stScript.src = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js";
    document.head.appendChild(stScript);

    stScript.onload = () => {
      gsap.registerPlugin(ScrollTrigger);
      initAnimations();
    };
  };

});

// ── All animations ─────────────────────────────────────────────────────────
function initAnimations() {
  gsap.set(".reveal", { opacity: 1, y: 0 });

  gsap.from(".hero-copy", { opacity: 0, x: -60, duration: 1, ease: "power3.out" });
  gsap.from(".hero-visual", { opacity: 0, x: 60, duration: 1, ease: "power3.out", delay: 0.2 });
  gsap.from(".hero-features div", { opacity: 0, y: 30, duration: 0.7, stagger: 0.15, ease: "power2.out", delay: 0.5 });
  gsap.from(".floating-card", { opacity: 0, scale: 0.8, duration: 0.8, stagger: 0.2, ease: "back.out(1.5)", delay: 0.8 });

  gsap.from(".trust-intro", { scrollTrigger: { trigger: ".trust-strip", start: "top 85%" }, opacity: 0, x: -40, duration: 0.8, ease: "power2.out" });
  gsap.from(".trust-item", { scrollTrigger: { trigger: ".trust-strip", start: "top 85%" }, opacity: 0, y: 30, scale: 0.92, duration: 0.6, stagger: 0.12, ease: "back.out(1.4)" });

  gsap.from(".about-image", { scrollTrigger: { trigger: ".about-home", start: "top 80%" }, opacity: 0, x: -50, duration: 1, ease: "power3.out" });
  gsap.from(".about-home .content-block", { scrollTrigger: { trigger: ".about-home", start: "top 80%" }, opacity: 0, x: 50, duration: 1, ease: "power3.out", delay: 0.15 });
  gsap.from(".about-badge", { scrollTrigger: { trigger: ".about-home", start: "top 70%" }, opacity: 0, y: 20, scale: 0.9, duration: 0.7, ease: "back.out(1.5)", delay: 0.4 });

  gsap.from(".why-card", { scrollTrigger: { trigger: ".why-us", start: "top 80%" }, opacity: 0, y: 50, scale: 0.94, duration: 0.65, stagger: { amount: 0.5, from: "start" }, ease: "power3.out" });
  document.querySelectorAll(".why-card").forEach((card) => {
    card.addEventListener("mouseenter", () => gsap.to(card, { y: -8, scale: 1.02, duration: 0.3, ease: "power2.out" }));
    card.addEventListener("mouseleave", () => gsap.to(card, { y: 0, scale: 1, duration: 0.3, ease: "power2.out" }));
  });

  document.querySelectorAll(".section-heading, .section-head-row, .section-tag").forEach((el) => {
    gsap.from(el, { scrollTrigger: { trigger: el, start: "top 88%" }, opacity: 0, y: 24, duration: 0.7, ease: "power2.out" });
  });

  gsap.from(".course-card", { scrollTrigger: { trigger: ".courses-home", start: "top 80%" }, opacity: 0, y: 60, rotation: 1.5, duration: 0.7, stagger: { amount: 0.6, from: "start" }, ease: "power3.out" });
  document.querySelectorAll(".course-card").forEach((card) => {
    card.addEventListener("mouseenter", () => gsap.to(card, { y: -10, scale: 1.03, duration: 0.3, ease: "power2.out" }));
    card.addEventListener("mouseleave", () => gsap.to(card, { y: 0, scale: 1, rotation: 0, duration: 0.3, ease: "power2.out" }));
  });

  gsap.from(".process-home .content-block", { scrollTrigger: { trigger: ".process-home", start: "top 80%" }, opacity: 0, x: -50, duration: 1, ease: "power3.out" });
  gsap.from(".process-item", { scrollTrigger: { trigger: ".process-list", start: "top 85%" }, opacity: 0, x: -30, duration: 0.55, stagger: 0.1, ease: "power2.out" });
  gsap.from(".process-visual", { scrollTrigger: { trigger: ".process-home", start: "top 80%" }, opacity: 0, x: 50, duration: 1, ease: "power3.out", delay: 0.2 });

  gsap.from(".benefit-card", { scrollTrigger: { trigger: ".benefits-home", start: "top 82%" }, opacity: 0, y: 40, scale: 0.9, duration: 0.6, stagger: 0.1, ease: "back.out(1.6)" });
  document.querySelectorAll(".benefit-card").forEach((card) => {
    card.addEventListener("mouseenter", () => gsap.to(card, { scale: 1.06, duration: 0.25, ease: "power1.out" }));
    card.addEventListener("mouseleave", () => gsap.to(card, { scale: 1, duration: 0.25, ease: "power1.out" }));
  });

  gsap.from(".cta-box", { scrollTrigger: { trigger: ".cta-home", start: "top 85%" }, opacity: 0, y: 40, scale: 0.97, duration: 0.9, ease: "power3.out" });

  gsap.from(".footer-grid > div", { scrollTrigger: { trigger: ".site-footer", start: "top 90%" }, opacity: 0, y: 30, duration: 0.6, stagger: 0.12, ease: "power2.out" });
}


