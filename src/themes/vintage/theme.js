(function (root) {
  'use strict';
  root.Chars.CHARS.vintageBear = { name: '테디 비서', desc: '보송한 빈티지 곰', color: '#9a704b', ink: '#493525', className: 'vintage-bear-avatar' };
  root.Chars.ORDER.push('vintageBear');
  root.MemoThemes.register({
    id: 'vintage',
    name: '빈티지 크래프트',
    character: 'vintageBear',
    petSpecies: 'vintage-teddy',
    preview: ['#f5ecd8', '#dbe0c7', '#9a9775', '#6e563d'],
    noteColors: [{ id: 'craft', name: '크래프트 종이', bg: '#f5ecd8', tab: '#d5c1a1', ink: '#493d2e', tape: '#bba581' }],
    paperShapes: ['craft'],
  });
})(typeof self !== 'undefined' ? self : this);
