(function () {
  document.documentElement.style.colorScheme = 'light';
  const main = document.querySelector('main');
  if (main) {
    main.id ||= 'main-content';
    main.tabIndex = -1;
    const skip = document.createElement('a');
    skip.className = 'skip-link';
    skip.href = '#' + main.id;
    skip.textContent = 'Ana içeriğe geç';
    document.body.prepend(skip);
  }
  // Older pages have desktop-only navigation; provide the same mobile control.
  const header = document.querySelector('header');
  const desktopNav = header?.querySelector('nav');
  if (desktopNav && !document.getElementById('mobileMenuButton')) {
    const button = document.createElement('button');
    button.id = 'mobileMenuButton';
    button.type = 'button';
    button.className = 'hidden';
    button.textContent = '☰';
    button.setAttribute('aria-label', 'Gezinme menüsünü aç');
    button.setAttribute('aria-controls', 'mobileMenu');
    button.setAttribute('aria-expanded', 'false');
    desktopNav.parentElement.append(button);
    const mobileNav = document.createElement('nav');
    mobileNav.id = 'mobileMenu';
    mobileNav.className = 'hidden p-4 text-white';
    desktopNav.querySelectorAll('a').forEach(link => {
      const copy = link.cloneNode(true);
      copy.removeAttribute('id');
      copy.className = 'block py-2 px-4 rounded-md';
      mobileNav.append(copy);
    });
    header.after(mobileNav);
    button.addEventListener('click', () => mobileNav.classList.toggle('hidden'));
  }
  document.querySelectorAll('header nav a, #mobileMenu a').forEach(link => {
    if (link.pathname === location.pathname || (location.pathname === '/index.html' && link.pathname === '/')) link.setAttribute('aria-current', 'page');
  });
  const menu = document.getElementById('mobileMenu');
  const trigger = document.getElementById('mobileMenuButton');
  if (menu && trigger) {
    new MutationObserver(() => trigger.setAttribute('aria-expanded', String(!menu.classList.contains('hidden'))))
      .observe(menu, { attributes:true, attributeFilter:['class'] });
  }
  document.querySelectorAll('#messageContainer, #notification-container').forEach(node => {
    node.setAttribute('role', 'status'); node.setAttribute('aria-live', 'polite');
  });
  document.querySelectorAll('button').forEach(button => {
    if (button.textContent.trim() || button.hasAttribute('aria-label')) return;
    const icon = button.querySelector('i');
    if (icon?.classList.contains('fa-times')) button.setAttribute('aria-label', 'Pencereyi kapat');
  });
})();
