

import { EditorUi } from "./tsModules/scaffold-hero/editorUi";
import { getUrlParamsMap } from "./tsModules/url-state/url";

export function main(url: string) {
  const paramsMap = getUrlParamsMap();
  const projectId = paramsMap.get('project_id');
  if (!projectId) {
    return;
  }
  
  const mainDiv = document.getElementById('main') as HTMLDivElement;
  const editorUi = new EditorUi();
  editorUi.load(projectId);
  mainDiv.innerHTML = '';
  mainDiv.appendChild(editorUi);
  editorUi.render();
  document.body.addEventListener(
    'keydown', evt => editorUi.handleKeydown(evt));

}
