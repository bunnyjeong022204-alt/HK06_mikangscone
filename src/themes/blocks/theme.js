(function (root) {
  'use strict';
  root.Chars.CHARS['block-dino'] = {
    name: '블록 공룡',
    desc: '초록 블록 공룡',
    petId: 'block-dino',
    color: '#51bd15',
    ink: '#203614',
    className: 'c-dino',
  };
  root.Chars.ORDER.push('block-dino');
  root.MemoThemes.register({
    id: 'blocks',
    name: '블록 장난감',
    character: 'block-dino',
    petSpecies: 'block-dino',
    preview: ['#a3dc57', '#ffd247', '#f9a3db', '#81cff8'],
  });
})(typeof self !== 'undefined' ? self : this);
