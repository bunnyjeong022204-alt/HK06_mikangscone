/* Read drag data synchronously, before the browser clears DataTransfer. */
globalThis.MemoDrop = {
  accepts(transfer) {
    return !!transfer && Array.from(transfer.types).some((type) =>
      ['Files', 'text/plain', 'text/html', 'text/uri-list'].includes(type));
  },
  content(transfer) {
    const template = document.createElement('template');
    template.innerHTML = transfer.getData('text/html');
    const fragment = template.content;
    const text = transfer.getData('text/plain').trim();
    const uri = transfer.getData('text/uri-list').split(/\r?\n/).find((line) => line && !line.startsWith('#')) || '';
    const image = fragment.querySelector('img');
    const src = image?.getAttribute('src') || '';
    const imageUrl = /^(?:https?:\/\/|data:image\/)/i.test(src) ? src :
      /^(?:https?:\/\/.*\.(?:png|jpe?g|gif|webp|avif|bmp)(?:[?#]|$)|data:image\/)/i.test(uri) ? uri : '';
    return { imageUrl, text: (text || uri || fragment.textContent || '').trim().slice(0, 100000) };
  },
};
