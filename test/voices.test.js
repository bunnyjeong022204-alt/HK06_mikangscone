const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const src = path.join(__dirname, '..', 'src');
const page = vm.createContext({});
for (const file of ['characters.js', 'themes/themes.js', ...['blocks', 'pastel', 'vintage', 'mono-sketch'].map((id) => 'themes/' + id + '/theme.js')]) {
  vm.runInContext(fs.readFileSync(path.join(src, file), 'utf8'), page);
}
for (const character of Object.values(page.Chars.CHARS)) {
  test(character.name + ' 일정 브리핑과 반응 대사', () => {
    const { voice, petId } = character;
    const next = '팀 회의';
    for (const mode of ['morning', 'petBriefing']) {
      const text = voice[mode]({ count: 3, next, time: '오후 2시' });
      for (const fact of ['3', next, '오후 2시']) assert.ok(text.includes(fact));
      assert.doesNotMatch(voice[mode]({ count: 0 }), /undefined|null/);
    }
    assert.match(voice.scheduleSoon({ minutes: 10, title: next }), /10/);
    assert.match(voice.weather({ place: '서울', forecast: '눈', tomorrow: true, range: '0~2°C', snow: true }), /눈/);
    const dialogue = JSON.parse(fs.readFileSync(path.join(src, '../pet/assets/species', petId, 'dialogue.json'), 'utf8'));
    for (const kind of ['grab', 'bump', 'landing', 'playful']) assert.ok(dialogue.reactions[kind].length);
  });
}
