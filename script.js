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

const portfolioStyles = document.createElement('link');
portfolioStyles.rel = 'stylesheet';
portfolioStyles.href = 'portfolio-gallery.css?v=20260726-1';
document.head.appendChild(portfolioStyles);

const currentPortfolio = document.querySelector('#portfolio');
if (currentPortfolio) {
  currentPortfolio.outerHTML = `
    <section id="portfolio" class="client-portfolio section-anchor section-pad">
      <div class="portfolio-heading reveal">
        <p class="eyebrow">Selected work</p>
        <h2>Connection, movement,<br /><em>and the moments between.</em></h2>
        <p>A first look at the families and couples Lexus is photographing as LXE Photography grows across West Michigan.</p>
      </div>

      <div class="client-portfolio-grid" aria-label="LXE Photography portfolio">
        <figure class="reveal"><img src="/public/images/portfolio/family-beach-lift.jpg" alt="Family laughing together at the Lake Michigan shoreline" loading="lazy" decoding="async" /><figcaption><span>Family</span><span>Lake Michigan</span></figcaption></figure>
        <figure class="reveal"><img src="/public/images/portfolio/couples-beach-hands-detail.jpg" alt="Couple holding hands by the water with a ring visible" loading="lazy" decoding="async" /><figcaption><span>Details</span><span>Beach session</span></figcaption></figure>
        <figure class="reveal"><img src="/public/images/portfolio/couples-beach-seated.jpg" alt="Couple seated together among beach grass and sand dunes" loading="lazy" decoding="async" /><figcaption><span>Couples</span><span>Dunes</span></figcaption></figure>
        <figure class="reveal"><img src="/public/images/portfolio/couples-beach-kiss.jpg" alt="Playful couple sharing a quiet moment in the beach grass" loading="lazy" decoding="async" /><figcaption><span>Connection</span><span>Natural direction</span></figcaption></figure>
        <figure class="reveal"><img src="/public/images/portfolio/family-beach-candid.jpg" alt="Family relaxing and laughing together in the sand dunes" loading="lazy" decoding="async" /><figcaption><span>Family story</span><span>Candid</span></figcaption></figure>
        <figure class="reveal"><img src="/public/images/portfolio/couples-beach-shore-kiss.jpg" alt="Couple kissing beside the Lake Michigan shoreline" loading="lazy" decoding="async" /><figcaption><span>Couples</span><span>Shoreline</span></figcaption></figure>
        <figure class="reveal"><img src="/public/images/portfolio/couples-beach-embrace-close.jpg" alt="Close portrait of a couple embracing outdoors" loading="lazy" decoding="async" /><figcaption><span>Portrait</span><span>Close connection</span></figcaption></figure>
        <figure class="reveal"><img src="/public/images/portfolio/couples-beach-embrace-detail.jpg" alt="Close detail of a couple embracing with hands and ring visible" loading="lazy" decoding="async" /><figcaption><span>Details</span><span>Storytelling</span></figcaption></figure>
        <figure class="reveal"><img src="/public/images/portfolio/couples-field-embrace.jpg" alt="Couple smiling together in a grassy field" loading="lazy" decoding="async" /><figcaption><span>Couples</span><span>Field portrait</span></figcaption></figure>
      </div>

      <div class="portfolio-closing reveal">
        <p>Every session is guided gently, with room for real expressions, movement, and the pieces of your story that cannot be forced.</p>
        <a class="button button-dark" href="#contact">Inquire about a session</a>
      </div>
    </section>`;
}

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

const socialPlatforms = [
  {
    name: 'instagram',
    label: 'Instagram',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.4" cy="6.7" r="1.15" fill="currentColor"/></svg>'
  },
  {
    name: 'tiktok',
    label: 'TikTok',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.59 6.69a4.79 4.79 0 0 1-3.77-4.25h-3.11v12.45a2.9 2.9 0 1 1-2.9-2.9c.23 0 .45.03.67.08V8.9a6.03 6.03 0 1 0 5.37 6V8.59a7.9 7.9 0 0 0 3.74.95V6.69Z"/></svg>'
  },
  {
    name: 'facebook',
    label: 'Facebook',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.8 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5H17V3.9c-.7-.1-1.5-.2-2.3-.2-2.3 0-3.9 1.4-3.9 4V10H8.2v3h2.6v8h3Z"/></svg>'
  }
];

const socialContainer = document.querySelector('#social-links');
if (socialContainer) {
  const heading = document.createElement('p');
  heading.className = 'social-heading';
  heading.textContent = 'Follow LXE Photography';
  socialContainer.before(heading);

  socialPlatforms.forEach(({ name, label, icon }) => {
    const url = config.socials?.[name];
    const element = document.createElement(url ? 'a' : 'span');
    element.className = `social-icon${url ? '' : ' social-placeholder'}`;
    element.innerHTML = icon;
    element.setAttribute('aria-label', url ? label : `${label} coming soon`);
    element.title = url ? label : `${label} link coming soon`;

    if (url) {
      element.href = url;
      element.target = '_blank';
      element.rel = 'noopener noreferrer';
    } else {
      element.setAttribute('aria-disabled', 'true');
    }

    socialContainer.appendChild(element);
  });
}

if (config.bookingUrl && socialContainer) {
  const bookingLink = document.createElement('a');
  bookingLink.href = config.bookingUrl;
  bookingLink.target = '_blank';
  bookingLink.rel = 'noopener noreferrer';
  bookingLink.className = 'social-booking-link';
  bookingLink.textContent = 'Book';
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