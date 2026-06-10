// PIN page logic. The original (blocked) URL is carried in the location fragment
// by the DNR redirect rule. On a correct PIN the background worker installs a
// temporary ALLOW rule, then we navigate back to the original URL.

const originalUrl = (() => {
  const raw = location.hash.slice(1);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw; // malformed %-sequence — use as-is
  }
})();

const siteEl = document.getElementById('site');
const form = document.getElementById('form');
const pinEl = document.getElementById('pin');
const submitEl = document.getElementById('submit');
const errorEl = document.getElementById('error');

siteEl.textContent = (() => {
  try {
    return new URL(originalUrl).hostname;
  } catch {
    return originalUrl || 'unknown site';
  }
})();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.textContent = '';
  submitEl.disabled = true;
  try {
    const res = await chrome.runtime.sendMessage({
      type: 'unlock',
      url: originalUrl,
      pin: pinEl.value,
    });
    if (res?.ok) {
      // Allow rule is live (the worker awaited it) — go to the real page.
      location.replace(originalUrl);
      return;
    }
    errorEl.textContent = res?.error || 'Could not unlock.';
  } catch (err) {
    errorEl.textContent = 'Extension error: ' + (err?.message || err);
  } finally {
    submitEl.disabled = false;
    pinEl.select();
  }
});
