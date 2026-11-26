(function (root) {
  'use strict';
  root.Chars.CHARS['mono-cat'] = { name: '까망이', desc: '노란 눈의 검은 고양이', petId: 'mono-cat', color: '#2b2935', ink: '#1c1c1c', className: 'mono-cat-avatar' };
  root.Chars.ORDER.unshift('mono-cat');

  const shared = {
    author: 'mikangscone',
    character: 'mono-cat',
    petSpecies: 'mono-cat',
    paperShapes: ['tape-curl', 'binder-clip', 'washi-tilt', 'black-clip-stack', 'paperclip-stack', 'stripe-tag'],
    paperLabels: {
      'tape-curl': '마스킹 테이프', 'binder-clip': '바인더 클립', 'washi-tilt': '찢은 테이프',
      'black-clip-stack': '검은 클립 묶음', 'paperclip-stack': '종이집게', 'stripe-tag': '줄무늬 태그',
    },
    stickers: ['mono-fish', 'mono-paw', 'mono-yarn', 'mono-star', 'mono-heart'],
  };
  for (const theme of [
    { id: 'mono-sketch', name: '모노 스케치', paper: '#fff', ink: '#1c1c1c', accent: '#f3e58a', line: '#d6d4cc' },
    { id: 'mono-sketch-dark', name: '모노 스케치 (다크)', paper: '#232323', ink: '#f2f1ec', accent: '#7a6c1f', line: '#3a3936' },
  ]) {
    const { id, name, paper, ink, accent, line } = theme;
    root.MemoThemes.register({
      ...shared, id, name, preview: [paper, line, ink, accent],
      noteColors: [{ id: 'mono', name: '모노', bg: paper, tab: paper, ink, tape: line }],
    });
  }
})(typeof self !== 'undefined' ? self : this);
