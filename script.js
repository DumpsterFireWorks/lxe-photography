const config = window.LXE_CONFIG || {};

const menuButton = document.querySelector('.menu-button');
const siteNav = document.querySelector('.site-nav');
menuButton?.addEventListener('click', () => {
  const open = siteNav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});
siteNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  siteNav.classList.remove('open');
  menuButton?.setAttribute('aria-expanded', 'false');
}));

document.querySelectorAll('.filter').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    const category = button.dataset.filter;
    document.querySelectorAll('.portfolio-item').forEach(item => {
      item.hidden = category !== 'all' && item.dataset.category !== category;
    });
  });
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(item => observer.observe(item));

const email = config.email || 'hello@example.com';
const emailLink = document.querySelector('#contact-email');
if (emailLink) {
  emailLink.textContent = email;
  emailLink.href = `mailto:${email}`;
}
const locationText = document.querySelector('#contact-location');
if (locationText) locationText.textContent = config.location || 'Muskegon, Michigan';

const socialNames = { instagram: 'IG', facebook: 'FB', tiktok: 'TT', pinterest: 'PI' };
const socialContainer = document.querySelector('#social-links');
Object.entries(config.socials || {}).forEach(([name, url]) => {
  if (!url || !socialContainer) return;
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = socialNames[name] || name.slice(0, 2);
  link.setAttribute('aria-label', name);
  socialContainer.appendChild(link);
});
if (config.bookingUrl && socialContainer) {
  const bookingLink = document.createElement('a');
  bookingLink.href = config.bookingUrl;
  bookingLink.target = '_blank';
  bookingLink.rel = 'noopener noreferrer';
  bookingLink.textContent = 'BOOK';
  bookingLink.setAttribute('aria-label', 'Book a session');
  socialContainer.appendChild(bookingLink);
}

const contactForm = document.querySelector('#contact-form');
const formStatus = document.querySelector('.form-status');
contactForm?.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(contactForm);
  const subject = encodeURIComponent(`LXE Photography inquiry — ${data.get('session')}`);
  const body = encodeURIComponent(`Name: ${data.get('name')}\nEmail: ${data.get('email')}\nSession: ${data.get('session')}\n\n${data.get('message')}`);
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  if (formStatus) formStatus.textContent = 'Your email app should open with the inquiry ready to send.';
});

document.querySelector('#year').textContent = new Date().getFullYear();
