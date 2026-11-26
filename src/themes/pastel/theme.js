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
      name: '문어', desc: '말랑말랑 분홍 문어', petId: 'pastel-octopus', color: '#f49aa3', ink: '#c94a55',
      className: 'character-octopus',
    };
    C.CHARS.octopus.voice = {
      noteSummary: ({ notes, sections }) => `메모 ${notes}개를 섹션 ${sections}곳에 모아 뒀어요!`,
      description: '말랑한 문어비서. 짧고 다정한 존댓말로 일정을 챙겨요.',
      greeting: ({ hour }) => hour < 11 ? '좋은 아침이에요!' : hour < 17 ? '잠깐 같이 살펴볼까요?' : '오늘 하루도 수고 많으셨어요.',
      morning: ({ count, next, time }) => count ? `좋은 아침이에요! 오늘 일정은 ${count}개예요. 첫 일정은 ${time} ‘${next}’예요.` : '좋은 아침이에요! 오늘은 남은 일정이 없어요.',
      scheduleSoon: ({ minutes, title, deadline }) => `${minutes}분 뒤 ‘${title}’${deadline ? ' 마감이에요' : ' 일정이 있어요'}. 준비됐어요?`,
      scheduleNow: ({ title, deadline }) => `이제 ‘${title}’ ${deadline ? '마감' : '시작'} 시간이에요.`,
      outside: ({ temperature }) => ` 바깥은 ${temperature}예요.`,
      weather: (w) => C.weatherDetails(w) + (w.snow ? ' 눈이 온대요. 길이 미끄러우니 조심하세요.' : w.rain ? ' 비 소식이 있어요. 우산 챙기세요!' : ' 외출할 때 참고하세요.'),
      lunch: ({ minutes }) => `다음 일정까지 ${minutes}분 남았어요. 점심은 배달로 가볍게 먹을까요?`,
      oldNote: ({ weeks }) => `${weeks}주 동안 안 열었어요. 아직 필요하세요?`,
      completed: ({ count }) => count ? `잘하셨어요! 남은 일은 ${count}개예요.` : '잘하셨어요! 오늘 할 일을 다 마쳤어요.',
      organized: ({ keyword, alarm, reminders }) => alarm ? `정리했어요. ${alarm}에 알람을 맞췄어요.${reminders ? ' '+reminders+' 전에도 알려 드릴게요.' : ''}` : `‘${keyword}’ 메모를 정리했어요.`,
      notFound: () => '관련된 메모를 찾지 못했어요. 다른 단어로 찾아볼까요?',
      briefing: ({ count, list, next }) => (count ? `오늘 일정은 ${count}개예요. ${list}.` : '오늘은 남은 일정이 없어요.') + (next ? ` 다음 알람은 ${next}예요.` : ''),
      petBriefing: ({ count, next, time }) => count ? `남은 일정은 ${count}개예요.\n다음은 ${time} ‘${next}’예요.` : '오늘 남은 일정은 없어요. 잠깐 쉬어요!',
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
