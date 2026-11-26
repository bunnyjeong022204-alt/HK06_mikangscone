(function (root) {
  'use strict';
  root.Chars.CHARS['block-dino'] = {
    name: '공룡',
    desc: '초록 블록 공룡',
    petId: 'block-dino',
    color: '#51bd15',
    ink: '#203614',
    className: 'c-dino',
    voice: {
      noteSummary: ({ notes, sections }) => `메모는 ${notes}개, 분류는 ${sections}개일세. 한 묶음씩 살펴보게.`,
      description: '쥐라기에서 온 잔소리꾼. “자네”, “~구먼”, “~하게”가 말버릇이에요. 툴툴대도 일정과 끼니는 꼭 챙겨요.',
      morning: ({ count, next, time }) => count
        ? `거, 일어났나. 오늘 일정은 ${count}개일세. ${time} ‘${next}’부터 챙기게.`
        : '거, 일어났나. 오늘 남은 일정은 없다네. 천천히 시작하게.',
      scheduleSoon: ({ minutes, title, deadline }) =>
        `‘${title}’${deadline ? ' 마감' : ''}까지 ${minutes}분 남았네. 슬슬 준비하게.`,
      scheduleNow: ({ title, deadline }) => `‘${title}’ ${deadline ? '마감일세. 마무리하게.' : '시간일세. 잊지 말게.'}`,
      outside: ({ temperature }) => ` 바깥은 ${temperature}라네.`,
      weather: ({ place, tomorrow, temperature, current, forecast, range, probability, rain, snow, cold, hot }) => {
        const summary = tomorrow
          ? `${place} 내일은 ${forecast}, ${range}라네.`
          : `${place} 지금 ${temperature}, ${current}일세. 오늘 기온은 ${range}라네.`;
        const chance = probability == null ? '' : ` 비 올 확률은 ${probability}%일세.`;
        const advice = snow ? ' 눈길엔 꼬리도 미끄러진다네. 발밑 조심하게.'
          : rain ? ' 빗속에서 허세 부리지 말고 우산 챙기게.'
          : cold ? ' 추우니 단단히 입고 나가게.'
          : hot ? ' 이 더위엔 공룡도 물을 찾는다네. 물 챙기게.' : '';
        return summary + chance + advice;
      },
      lunch: ({ minutes }) => `다음 일정까지 ${minutes}분이구먼. 점심은 거르지 말고 간단히 배달해 먹게.`,
      oldNote: ({ weeks }) => `이 메모, ${weeks}주 만이구먼. 화석 되기 전에 필요한 것만 챙기게.`,
      completed: ({ count }) => count
        ? `허, 해냈구먼! 오늘 남은 일은 ${count}개일세.`
        : '허, 해냈구먼! 오늘 할 일은 다 끝났네.',
      organized: ({ keyword, alarm, reminders, count }) => alarm
        ? `정리해 뒀네. ${alarm} 알람 맞췄으니 잊지 말게.${count > 1 ? ` 새 일정은 ${count}개일세.` : ''}${reminders ? ` ${reminders} 전에도 한 번 더 일러주겠네.` : ''}`
        : `‘${keyword}’로 정리해 뒀네. 다음에 찾기 쉬울 걸세.`,
      notFound: () => '뒤져 봤네만 관련 메모가 없구먼. 다른 말로 찾아보게.',
      greeting: ({ hour }) => hour < 11 ? '거, 일어났나.' : hour < 17 ? '그래, 자네 뭘 챙겨줄까?' : '오늘 고생했네. 이만 꼬리 좀 쉬게 두게.',
      briefing: ({ count, list, next }) => {
        const today = count ? `오늘 일정은 ${count}개일세. ${list}.` : '오늘 남은 일정은 없다네.';
        return next ? `${today} 다음 알람은 ${next}일세.` : today;
      },
      petBriefing: ({ count, next, time }) => count
        ? `남은 일정은 ${count}개일세.\n다음은 ${time} ‘${next}’라네.`
        : '오늘 남은 일정은 없다네.',
    },
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
