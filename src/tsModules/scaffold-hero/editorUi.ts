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
    public pathToVideoHtml: Map<string, HTMLVideoElement> = new Map(),
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
    this.editor.unpersisted.pathToVideoHtml = this.pathToVideoHtml;
    this.editWindowUi.render();

    this.director.onChange((timeMs: number) => {
      this.editor.setCursorTimeMs(timeMs);

    });
  }

  handleKeydown(evt: KeyboardEvent) {
    console.log(evt);
    initVoices();
    switch (evt.key) {
      case "Enter":
        if (evt.shiftKey) {
          this.editor.handleShiftEnter();
        } else {
          this.editor.handleEnter();
        }
        break;
      case "s":
        if (isCmd(evt)) {
          this.save();
          break;
        }
      case "o":
        this.editor.handleOpenFile();
      case "ArrowLeft":
        this.editor.handleLeft();
        break;
      case "ArrowRight":
        this.editor.handleRight();
        break;
      case "ArrowUp":
        this.editor.handleUp();
        break;
      case "ArrowDown":
        this.editor.handleDown();
        break;
      case " ":
        this.director.togglePlayPause(this.editor);
      default:
        return;
    }
    evt.preventDefault();
  }
}

function isCmd(evt: KeyboardEvent) {
  // TODO handle non-Mac
  return evt.metaKey;
}

customElements.define('editor-ui', EditorUi);