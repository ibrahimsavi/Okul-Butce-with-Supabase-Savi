// Encode untrusted text only at HTML sinks; stored values remain unchanged.
(function (root) {
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }
  root.escapeHtml = escapeHtml;
  if (typeof module !== 'undefined') module.exports = { escapeHtml };
})(typeof window === 'undefined' ? globalThis : window);
