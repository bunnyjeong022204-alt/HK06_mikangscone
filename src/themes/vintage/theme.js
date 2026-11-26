(function (root) {
  'use strict';
  root.Chars.CHARS.vintageBear = { name: '곰돌이', desc: '보송한 빈티지 곰', petId: 'vintage-teddy', color: '#9a704b', ink: '#493525', className: 'vintage-bear-avatar' };
  root.Chars.CHARS.vintageBear.voice = {
    noteSummary: ({ notes, sections }) => `주인님, 메모 ${notes}건을 섹션 ${sections}곳에 정리해 두었습니다.`,
    description: '정중한 집사 곰돌이. 주인님을 부르며 다음 일정을 차분히 챙깁니다.',
    greeting: ({ hour }) => hour < 11 ? '좋은 아침입니다, 주인님.' : hour < 17 ? '주인님, 무엇을 준비해 드릴까요?' : '오늘도 수고 많으셨습니다, 주인님. 편히 쉬십시오.',
    morning: ({ count, next, time }) => count ? `좋은 아침입니다, 주인님. 오늘 일정은 ${count}건입니다. 첫 일정은 ${time} ‘${next}’입니다.` : '좋은 아침입니다, 주인님. 오늘 남은 일정은 없습니다.',
    scheduleSoon: ({ title, minutes, deadline }) => `주인님, ${minutes}분 뒤 ‘${title}’${deadline ? ' 마감' : ''}입니다. 슬슬 준비하시지요.`,
    scheduleNow: ({ title, deadline }) => `주인님, ‘${title}’ ${deadline ? '마감' : '예정'} 시각입니다.`,
    outside: ({ temperature }) => ` 바깥 기온은 ${temperature}입니다.`,
    weather: (w) => root.Chars.weatherDetails(w) + (w.snow ? ' 눈길 조심하십시오, 주인님.' : w.rain ? ' 우산을 챙겨 가시지요, 주인님.' : ' 외출 준비에 참고하십시오, 주인님.'),
    lunch: ({ minutes }) => `다음 일정까지 ${minutes}분입니다. 배달로 간단히 드시는 건 어떻겠습니까?`,
    oldNote: ({ weeks }) => `이 메모를 ${weeks}주째 펼치지 않으셨습니다. 계속 간직할까요, 주인님?`,
    completed: ({ count }) => count ? `훌륭하십니다, 주인님. 남은 일은 ${count}건입니다.` : '오늘 할 일을 모두 마치셨습니다, 주인님.',
    organized: ({ keyword, alarm, reminders }) => alarm ? `정리를 마쳤습니다, 주인님. ${alarm}에 알람을 맞춰 두었습니다.${reminders ? ' '+reminders+' 전에도 알려 드리겠습니다.' : ''}` : `‘${keyword}’ 메모를 정리해 두었습니다, 주인님.`,
    notFound: () => '송구하오나, 관련된 메모를 찾지 못했습니다.',
    briefing: ({ count, list, next }) => (count ? `주인님, 오늘 일정은 ${count}건입니다. ${list}.` : '주인님, 오늘 남은 일정은 없습니다.') + (next ? ` 다음 알람은 ${next}입니다.` : ''),
    petBriefing: ({ count, next, time }) => count ? `주인님, 남은 일정은 ${count}건입니다.\n다음은 ${time} ‘${next}’입니다.` : '주인님, 오늘 남은 일정은 없습니다. 편히 쉬십시오.',
  };
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
