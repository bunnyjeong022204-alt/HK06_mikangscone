(function (root) {
  'use strict';
  root.Chars.CHARS['mono-cat'] = { name: '까망이', desc: '노란 눈의 검은 고양이', petId: 'mono-cat', color: '#2b2935', ink: '#1c1c1c', className: 'mono-cat-avatar' };
  root.Chars.CHARS['mono-cat'].voice = {
    noteSummary: ({ notes, sections }) => `메모 ${notes}개야. 섹션 ${sections}곳에 모아 놨어. 한번 봐.`,
    description: '귀찮은 척해도 챙길 건 챙기는 검정고양이. 짧은 반말을 써요.',
    greeting: ({ hour }) => hour < 11 ? '일어났냐.' : hour < 17 ? '뭐 봐. 챙길 거 있어?' : '수고했어. 집 가서 자. 나도 잘 거야.',
    morning: ({ count, next, time }) => count ? `일어났냐. 오늘 일정 ${count}개 있으니 정신 차려. ${time} ‘${next}’부터야.` : '일어났냐. 오늘은 일정 없어. 좀 더 자든가.',
    scheduleSoon: ({ minutes, title, deadline }) => `${minutes}분 뒤 ‘${title}’${deadline ? ' 마감' : ''}. 두 번 말 안 한다.`,
    scheduleNow: ({ title, deadline }) => `‘${title}’ ${deadline ? '마감이야' : '시간이야'}. 잊은 건 아니지?`,
    outside: ({ temperature }) => ` 밖은 ${temperature}야.`,
    weather: (w) => root.Chars.weatherDetails(w) + (w.snow ? ' 길 미끄럽대. 넘어지지 마.' : w.rain ? ' 우산 챙겨. 젖어서 오면 나한테 붙지 마.' : ' 나갈 거면 옷 챙겨.'),
    lunch: ({ minutes }) => `${minutes}분이면 배달 시켜야겠네. 시키는 김에 내 츄르도.`,
    oldNote: ({ weeks }) => `${weeks}주째 먼지 쌓였어. 치운다?`,
    completed: ({ count }) => count ? `오, 하나 했네. ${count}개 남았어.` : '오, 다 했네. 이제 좀 쉬어.',
    organized: ({ keyword, alarm, reminders }) => alarm ? `정리 끝. ${alarm}에 내가 부를게.${reminders ? ' '+reminders+' 전에도 알려 줄게.' : ''}` : `‘${keyword}’ 정리 끝. 잘 넣어 뒀어.`,
    notFound: () => '없어. 내 탓 아니다. 다른 말로 찾아봐.',
    briefing: ({ count, list, next }) => (count ? `오늘 일정 ${count}개야. ${list}.` : '오늘 남은 일정 없어.') + (next ? ` 다음 알람은 ${next}. 잊지 마.` : ''),
    petBriefing: ({ count, next, time }) => count ? `오늘 ${count}개 남았어.\n${time} ‘${next}’. 늦지 마.` : '오늘 건 끝났어. 나도 이제 쉰다.',
  };
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
