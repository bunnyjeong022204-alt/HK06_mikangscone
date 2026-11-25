(() => {
  'use strict';

  const FORMATS = [
    ['bold', '굵게', 'B'], ['italic', '기울임', 'I'], ['underline', '밑줄', 'U'],
    ['strikeThrough', '취소선', 'ab'], ['insertUnorderedList', '목록', '≡'],
  ];
  const TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'UL', 'LI', 'BR', 'DIV', 'P']);

  function cleanHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    for (const element of [...template.content.querySelectorAll('*')].reverse()) {
      if (!TAGS.has(element.tagName)) {
        element.replaceWith(...element.childNodes);
        continue;
      }
      for (const attr of [...element.attributes]) element.removeAttribute(attr.name);
    }
    return template.innerHTML;
  }

  function editor(note, h, { onChange, onBlur, onImages }) {
    const sync = () => {
      note.text = el.innerText.trimEnd();
      note.basicHtml = cleanHtml(el.innerHTML);
      note.basicText = note.text;
      el.classList.toggle('is-empty', !note.text.trim());
      onChange();
    };
    const el = h('div', {
      class: 'body basic-editor',
      role: 'textbox',
      contenteditable: 'true',
      'aria-multiline': 'true',
      'aria-label': '메모 내용',
      'data-placeholder': '메모를 작성하세요…',
      oninput: sync,
      onblur: onBlur,
      onpaste: (e) => {
        const images = [...(e.clipboardData?.files ?? [])];
        e.preventDefault();
        if (!onImages(images)) document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
      },
    });
    if (note.basicText === note.text && typeof note.basicHtml === 'string') {
      el.innerHTML = cleanHtml(note.basicHtml);
    } else {
      el.textContent = note.text;
    }
    el.classList.toggle('is-empty', !note.text.trim());
    const toolbar = h('div', { class: 'basic-format', role: 'group', 'aria-label': '메모 서식' },
      FORMATS.map(([command, label, text]) => h('button', {
        type: 'button',
        class: 'basic-format-' + command,
        'aria-label': label,
        title: label,
        onmousedown: (e) => e.preventDefault(),
        onclick: () => {
          el.focus();
          document.execCommand(command);
          sync();
        },
      }, text)));
    return { el, toolbar };
  }

  window.BasicNote = { editor };
})();
