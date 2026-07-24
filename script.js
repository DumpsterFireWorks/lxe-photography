const mobileHeroStyles = document.createElement('link');
mobileHeroStyles.rel = 'stylesheet';
mobileHeroStyles.href = 'mobile-hero.css';
document.head.appendChild(mobileHeroStyles);

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

const availabilityGrid = document.querySelector('#availability-grid');
const availabilityEmpty = document.querySelector('#availability-empty');
const preferredDate = document.querySelector('#preferred-date');
const preferredTime = document.querySelector('#preferred-time');
const availability = Array.isArray(config.availability) ? config.availability : [];

if (availabilityGrid && availability.length) {
  availability.forEach(day => {
    const card = document.createElement('article');
    card.className = 'availability-card reveal';

    const heading = document.createElement('h3');
    heading.textContent = day.date;
    card.appendChild(heading);

    const times = document.createElement('div');
    times.className = 'time-grid';

    (day.times || []).forEach(time => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'time-button';
      button.textContent = time;
      button.addEventListener('click', () => {
        if (preferredDate) preferredDate.value = day.date;
        if (preferredTime) preferredTime.value = time;
        document.querySelectorAll('.time-button').forEach(item => item.classList.remove('selected'));
        button.classList.add('selected');
        document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' });
        window.setTimeout(() => preferredDate?.focus(), 550);
      });
      times.appendChild(button);
    });

    card.appendChild(times);
    availabilityGrid.appendChild(card);
    observer.observe(card);
  });
} else if (availabilityEmpty) {
  availabilityEmpty.hidden = false;
}

const contactForm = document.querySelector('#contact-form');
const formStatus = document.querySelector('.form-status');
contactForm?.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(contactForm);
  const subject = encodeURIComponent(`LXE Photography booking request — ${data.get('session')}`);
  const body = encodeURIComponent(
    `Name: ${data.get('name')}\n` +
    `Email: ${data.get('email')}\n` +
    `Phone: ${data.get('phone') || 'Not provided'}\n` +
    `Session: ${data.get('session')}\n` +
    `Preferred date: ${data.get('date') || 'Flexible'}\n` +
    `Preferred time: ${data.get('time') || 'Flexible'}\n\n` +
    `${data.get('message')}`
  );
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  if (formStatus) formStatus.textContent = 'Your email app should open with the booking request ready to send. The spot is held only after Lexus confirms it.';
});

document.querySelector('#year').textContent = new Date().getFullYear();
