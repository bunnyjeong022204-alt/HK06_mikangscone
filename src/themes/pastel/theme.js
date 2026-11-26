/* 파스텔 테마 (진현주)
 * - 메모지: 마스킹 테이프로 붙인 종이 (둥근 사각 · 반듯한 사각 · 손으로 찢은 종이 · 찢은 줄노트 · 겹친 종이 · 모서리 테이프)
 * - 메모지 색 5가지: 하늘 · 라벤더 · 크림 · 벚꽃 · 민트
 * - AI 비서: 말랑 문어
 * - 글꼴: 메모먼트 꾹꾹체 (컴퓨터에 설치되어 있으면 사용, 없으면 Gaegu) */
(function (root) {
  'use strict';
  const C = root.Chars;
  if (C && !C.CHARS.octopus) {
    C.CHARS.octopus = {
      name: '문어비서', desc: '말랑말랑 분홍 문어', petId: 'pastel-octopus', color: '#f49aa3', ink: '#c94a55',
      className: 'character-octopus',
    };
    if (!C.ORDER.includes('octopus')) C.ORDER.push('octopus');
  }
  root.MemoThemes && root.MemoThemes.register({
    id: 'pastel',
    name: '파스텔',
    author: '진현주',
    preview: ['#d6e6f7', '#e3dbf4', '#f7f2e6', '#f8dfe4', '#d8eee4'],
    noteColors: [
      { id: 'sky', name: '하늘', bg: '#d6e6f7', tab: '#c4daf2', ink: '#33475e', tape: '#f4efe2' },
      { id: 'lavender', name: '라벤더', bg: '#e3dbf4', tab: '#d4c8ef', ink: '#463a63', tape: '#f6f1e6' },
      { id: 'cream', name: '크림', bg: '#f7f2e6', tab: '#efe6d2', ink: '#4f4637', tape: '#cfe0f2' },
      { id: 'blossom', name: '벚꽃', bg: '#f8dfe4', tab: '#f3ccd5', ink: '#5e3a44', tape: '#f6f1e6' },
      { id: 'mint', name: '민트', bg: '#d8eee4', tab: '#c5e5d6', ink: '#335245', tape: '#e3dbf4' },
    ],
    paperShapes: ['rounded', 'square', 'deckle', 'lined', 'layered', 'corner'],
    paperLabels: { rounded: '둥근 사각', square: '반듯한 사각', deckle: '찢은 종이', lined: '찢은 줄노트', layered: '겹친 종이', corner: '모서리 테이프' },
    character: 'octopus',
    petSpecies: 'pastel-octopus',
  });
})(typeof self !== 'undefined' ? self : this);
