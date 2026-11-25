/* AI 비서 캐릭터. 모두 이 앱용으로 새로 그린 SVG이다.
 * 각 캐릭터는 같은 얼굴 부품(.c-eyes, .c-mouth, .c-blush)을 써서 CSS로 깜빡임·말하기·듣기 표정을 바꾼다. */
(function (root) {
  'use strict';
  const face = (cx, cy, ink = '#3a2e28', blush = '#f49b8b', gap = 13) => `
    <g class="c-eyes" style="transform-origin:${cx}px ${cy}px">
      <ellipse cx="${cx - gap}" cy="${cy}" rx="3.6" ry="4.6" fill="${ink}"/>
      <ellipse cx="${cx + gap}" cy="${cy}" rx="3.6" ry="4.6" fill="${ink}"/>
      <circle cx="${cx - gap + 1.3}" cy="${cy - 1.6}" r="1.3" fill="#fff"/>
      <circle cx="${cx + gap + 1.3}" cy="${cy - 1.6}" r="1.3" fill="#fff"/>
    </g>
    <g class="c-blush"><ellipse cx="${cx - gap - 7}" cy="${cy + 8}" rx="5.5" ry="3.2" fill="${blush}" opacity=".7"/><ellipse cx="${cx + gap + 7}" cy="${cy + 8}" rx="5.5" ry="3.2" fill="${blush}" opacity=".7"/></g>
    <g class="c-mouth" style="transform-origin:${cx}px ${cy + 9}px">
      <path class="c-smile" d="M${cx - 5} ${cy + 7} Q${cx - 2.5} ${cy + 11} ${cx} ${cy + 8} Q${cx + 2.5} ${cy + 11} ${cx + 5} ${cy + 7}" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/>
      <ellipse class="c-open" cx="${cx}" cy="${cy + 9.5}" rx="3.6" ry="3.2" fill="${ink}"/>
    </g>`;

  const CHARS = {
    mikang: {
      name: '귤비서', desc: '새콤달콤 귤', petId: 'mikkang',
      color: '#f59a3c', ink: '#6b3a12',
      svg: () => `
        <ellipse cx="50" cy="93" rx="26" ry="4" fill="#000" opacity=".12"/>
        <g class="c-body">
          <path d="M50 22c22 0 38 15 38 36S72 92 50 92 12 79 12 58s16-36 38-36z" fill="#f7a23f"/>
          <path d="M50 22c22 0 38 15 38 36S72 92 50 92 12 79 12 58s16-36 38-36z" fill="url(#mk-g)"/>
          <circle cx="30" cy="44" r="1.4" fill="#e58a2a"/><circle cx="70" cy="70" r="1.4" fill="#e58a2a"/><circle cx="66" cy="38" r="1.2" fill="#e58a2a"/><circle cx="34" cy="76" r="1.2" fill="#e58a2a"/>
          <path d="M28 40c4-7 12-11 18-11" stroke="#fff" stroke-opacity=".55" stroke-width="4" fill="none" stroke-linecap="round"/>
          <g class="c-leaf" style="transform-origin:50px 24px"><path d="M50 24c-1-6 1-10 4-12" stroke="#6d8a3a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M54 16c6-8 18-8 22-4-5 7-15 9-22 4z" fill="#86b04a"/><path d="M56 15c6-3 12-4 17-3" stroke="#5f8a2c" stroke-width="1.2" fill="none"/></g>
          ${face(50, 58, '#5a2e0e', '#ef6f5c')}
        </g>
        <defs><radialGradient id="mk-g" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffc56b" stop-opacity=".8"/><stop offset="1" stop-color="#ef8a2b" stop-opacity=".1"/></radialGradient></defs>`,
    },
  };
  const ORDER = ['mikang'];

  /** 캐릭터 SVG(또는 사용자가 올린 이미지) HTML. */
  function charHTML(id, customSrc) {
    if (id === 'custom' && customSrc && /^data:image\//.test(customSrc)) {
      return `<div class="c-custom"><img src="${customSrc}" alt="" draggable="false"><span class="c-custom-shadow"></span></div>`;
    }
    const c = CHARS[id] || CHARS.mikang;
    if (c.className) return `<span class="character-image ${c.className}" aria-hidden="true"></span>`;
    return `<svg class="c-svg" viewBox="0 0 100 100" aria-hidden="true">${c.svg()}</svg>`;
  }
  const charName = (S) => (S.settings.petName || '').trim() || (CHARS[S.settings.character] || CHARS.mikang).name;
  root.Chars = { CHARS, ORDER, charHTML, charName };
})(typeof self !== 'undefined' ? self : this);
