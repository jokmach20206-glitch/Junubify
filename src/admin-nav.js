import './admin-nav.css';

const addAdminReviewLink = () => {
  const nav = document.querySelector('.nav-tabs');
  if (!nav || nav.querySelector('[data-upload-verification-link]')) return;

  const link = document.createElement('a');
  link.href = '/admin.html';
  link.className = 'admin-verification-nav';
  link.dataset.uploadVerificationLink = 'true';
  link.setAttribute('aria-label', 'Upload verification');
  link.innerHTML = '<span aria-hidden="true">✓</span> Verify uploads';
  nav.append(link);
};

const observer = new MutationObserver(addAdminReviewLink);
observer.observe(document.documentElement, { childList: true, subtree: true });
addAdminReviewLink();
