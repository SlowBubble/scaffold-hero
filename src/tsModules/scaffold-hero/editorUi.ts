import { Director } from "./director";
import { Editor } from "./editor";
import { EditWindowUi } from "./editWindowUi";
import { initVoices } from "./voice";

const editorsNamespace = 'editors';

export class EditorUi extends HTMLElement {
  public root;
  constructor(
    public editor: Editor = new Editor,
    public editWindowUi: EditWindowUi = new EditWindowUi(editor),
    public director: Director = new Director,
  ) {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.director.canvas.style.border = 'solid 1px';
    this.director.canvas.width = 1280;
    this.director.canvas.height = 720;

    this.finishLoading();
  }

  render() {
    this.root.innerHTML = `<p>${this.editor.project.id}</p>`;
    this.root.appendChild(this.editWindowUi.panelDiv);
    this.root.appendChild(this.director.canvas);
  }
  save() {
    localStorage.setItem(`${editorsNamespace}/${this.editor.project.id}`, this.editor.serialize());
  }
  load(projectId: string) {
    const item = localStorage.getItem(`${editorsNamespace}/${projectId}`);
    if (item === null) {
      this.editor.project.id = projectId;
      return;
    }
    this.editor = Editor.deserialize(JSON.parse(item));
    this.editWindowUi.editor = this.editor;

    this.finishLoading();
  }

  finishLoading() {
    this.editor.onChange(() => this.editWindowUi.render());
    this.editWindowUi.render();
    // TODO see if this needs to happen via a user input instead of here.
    this.editor.loadPathToVideoHtml();

    this.director.onChange((timeMs: number) => {
      this.editor.setCursorTimeMs(timeMs);

    });
  }

  handleKeydown(evt: KeyboardEvent) {
    console.log(evt);
    initVoices();
      if (matchKey(evt, 'enter')) {
        this.editor.handleEnter();
      } else if (matchKey(evt, 'shift+enter')) {
        this.editor.handleShiftEnter();
      } else if (matchKey(evt, 'cmd+s')) {
        this.save();
      } else if (matchKey(evt, 'o')) {
          this.editor.handleOpenFile();
      } else if (matchKey(evt, 'left')) {
          this.editor.handleLeft();
      } else if (matchKey(evt, 'right')) {
          this.editor.handleRight();
      } else if (matchKey(evt, 'up')) {
        this.editor.handleUp();
      } else if (matchKey(evt, 'down')) {
        this.editor.handleDown();
      } else if (matchKey(evt, 'space')) {
        this.editor.pauseVideoHtmls();
        this.director.togglePlayPause(this.editor);
      } else if (matchKey(evt, 'backspace')) {
      } else {
        return;
      }
    evt.preventDefault();
  }
}

// TODO handle non-Mac: 
function isMac() {
  return true;
}

// E.g.: cmd+shift+enter or cmd+space
function matchKey(evt: KeyboardEvent, wantStr = '') {
  let evtKey = evt.key;
  // Special cases
  if (evtKey === ' ') {
    evtKey = 'space';
  } else if (evtKey === 'ArrowRight') {
    evtKey = 'right';
  } else if (evtKey === 'ArrowUp') {
    evtKey = 'up';
  } else if (evtKey === 'ArrowDown') {
    evtKey = 'down';
  } else if (evtKey === 'ArrowLeft') {
    evtKey = 'left';
  }
  evtKey = evtKey.toLowerCase();

  const wantProps = wantStr.split('+');
  if (wantProps.length === 0) {
    return false;
  }
  const wantKey = wantProps.pop()?.toLowerCase();
  if (evtKey !== wantKey) {
    return false;
  }

  const evtProps = new Set<string>();
  if (evt.metaKey) {
    evtProps.add(isMac() ? 'cmd' : 'ctrl');
  }
  if (evt.altKey) {
    evtProps.add('alt');
  }
  if (evt.shiftKey) {
    evtProps.add('shift');
  }
  if (evt.ctrlKey) {
    evtProps.add(isMac() ? 'ctrl' : 'cmd');
  }
  if (evtProps.size != wantProps.length) {
    return false;
  }
  if (wantProps.some(wantProp => !evtProps.has(wantProp))) {
    return false;
  }
  return true;
}

customElements.define('editor-ui', EditorUi);