(function () {
    'use strict';

    class AudioSpeechNode {
        constructor(commonNodeAttr = new CommonNodeAttr(NodeType.AudioSpeech), text = '', voiceOpt = new VoiceOpt()) {
            this.commonNodeAttr = commonNodeAttr;
            this.text = text;
            this.voiceOpt = voiceOpt;
        }
        static deserialize(json) {
            return new AudioSpeechNode(CommonNodeAttr.deserialize(json.commonNodeAttr), json.text);
        }
        createUtterance() {
            const speechSynthesisUtterance = new SpeechSynthesisUtterance(this.text);
            // speechSynthesisUtterance.voice = voice;
            speechSynthesisUtterance.rate = this.voiceOpt.rate;
            return speechSynthesisUtterance;
        }
        async testAndUpdateDuration() {
            const speechSynthesisUtterance = this.createUtterance();
            let startMs = 0;
            speechSynthesisUtterance.onstart = () => {
                startMs = Date.now();
            };
            return new Promise(resolve => {
                speechSynthesisUtterance.onend = () => {
                    const durMs = Date.now() - startMs;
                    this.commonNodeAttr.endMs = this.commonNodeAttr.startMs + durMs;
                    // TODO handle error case.
                    resolve(null);
                };
                window.speechSynthesis.speak(speechSynthesisUtterance);
            });
        }
    }
    class VoiceOpt {
        constructor(rate = 0.7, voiceURI = '') {
            this.rate = rate;
            this.voiceURI = voiceURI;
        }
    }

    var NodeType;
    (function (NodeType) {
        NodeType["Container"] = "Container";
        NodeType["AudioSpeech"] = "AudioSpeech";
        NodeType["VisualText"] = "VisualText";
        NodeType["VideoFile"] = "VideoFile";
    })(NodeType || (NodeType = {}));
    function deserializeToNode(json) {
        switch (json.commonNodeAttr.nodeType) {
            case NodeType.Container:
                return ContainerNode.deserialize(json);
            case NodeType.AudioSpeech:
                return AudioSpeechNode.deserialize(json);
            case NodeType.VisualText:
                return VisualTextNode.deserialize(json);
            case NodeType.VideoFile:
                return VideoFileNode.deserialize(json);
        }
        throw 'Forgot to implement deserializeToNode case: ' + json.commonNodeAttr.nodeType;
    }
    class CommonNodeAttr {
        constructor(nodeType = NodeType.Container, idNum = 0, name = '', trackIdx = 0, startMs = 0, endMs = 2000) {
            this.nodeType = nodeType;
            this.idNum = idNum;
            this.name = name;
            this.trackIdx = trackIdx;
            this.startMs = startMs;
            this.endMs = endMs;
        }
        static deserialize(json) {
            return new CommonNodeAttr(json.nodeType, json.idNum, json.name, json.trackIdx, json.startMs, json.endMs);
        }
    }
    class ContainerNode {
        constructor(commonNodeAttr = new CommonNodeAttr(NodeType.Container), nodes = []) {
            this.commonNodeAttr = commonNodeAttr;
            this.nodes = nodes;
        }
        static deserialize(json) {
            return new ContainerNode(CommonNodeAttr.deserialize(json.commonNodeAttr), json.nodes.map((nodeJson) => deserializeToNode(nodeJson)));
        }
        addNode(node) {
            this.nodes.push(node);
            this.nodes.sort((node1, node2) => {
                // TODO see if we need to break ties.
                return node1.commonNodeAttr.startMs - node2.commonNodeAttr.startMs;
            });
        }
        getNestedNodes() {
            const res = [];
            this.traversePreorder(node => res.push(node));
            return res;
        }
        // root -> left -> right
        traversePreorder(func) {
            func(this);
            this.nodes.forEach((node) => {
                func(node);
                if (node instanceof ContainerNode) {
                    node.traversePreorder(func);
                }
            });
        }
        // left -> right -> root
        traversePostorder(func) {
            this.nodes.forEach((node) => {
                if (node instanceof ContainerNode) {
                    node.traversePostorder(func);
                }
                func(node);
            });
        }
        fixEndPoints() {
            // TODO notify siblings and parents to fixEndPoints also.
            this.nodes.forEach(node => {
                this.commonNodeAttr.endMs = Math.max(this.commonNodeAttr.endMs, node.commonNodeAttr.endMs);
            });
        }
    }
    class VisualTextNode {
        constructor(commonNodeAttr = new CommonNodeAttr(NodeType.VisualText), text = '') {
            this.commonNodeAttr = commonNodeAttr;
            this.text = text;
        }
        static deserialize(json) {
            return new VisualTextNode(CommonNodeAttr.deserialize(json.commonNodeAttr), json.text);
        }
    }
    class VideoFileNode {
        constructor(commonNodeAttr = new CommonNodeAttr(NodeType.VideoFile), filePath = 'data/matchplay.mov', startMs = 0, playbackRate = 1) {
            this.commonNodeAttr = commonNodeAttr;
            this.filePath = filePath;
            this.startMs = startMs;
            this.playbackRate = playbackRate;
        }
        static deserialize(json) {
            return new VideoFileNode(CommonNodeAttr.deserialize(json.commonNodeAttr), json.filePath, json.startMs, json.playbackRate);
        }
    }

    function computeOneTimeStartInfos(nodes) {
        const sorted = nodes.map(node => {
            return {
                startMs: node.commonNodeAttr.startMs,
                nodes: [node],
            };
        });
        sorted.sort((node1, node2) => node1.startMs - node2.startMs);
        return sorted;
    }
    function computeRecurringStartInfos(nodes) {
        const starts = new Set;
        nodes.forEach(node => {
            starts.add(node.commonNodeAttr.startMs);
            starts.add(node.commonNodeAttr.endMs);
        });
        const sorted = [...starts];
        sorted.sort((a, b) => a - b);
        const startInfos = sorted.map(start => {
            return {
                startMs: start,
                nodes: [],
            };
        });
        startInfos.forEach((startInfo) => {
            const timeMs = startInfo.startMs;
            startInfo.nodes = nodes.filter(node => {
                return node.commonNodeAttr.startMs <= timeMs && timeMs < node.commonNodeAttr.endMs;
            });
            startInfo.nodes.sort((node1, node2) => node1.commonNodeAttr.trackIdx - node2.commonNodeAttr.trackIdx);
        });
        return startInfos;
    }

    class Drawer {
        constructor(startInfos = [], startInfoIdx = -1) {
            this.startInfos = startInfos;
            this.startInfoIdx = startInfoIdx;
        }
        setup(container, startMs = 0) {
            this.startInfoIdx = -1;
            this.startInfos.forEach((startInfo, idx) => {
                if (startInfo.startMs < startMs) {
                    this.startInfoIdx = idx;
                }
            });
            const nodes = container.getNestedNodes();
            const drawableNodes = nodes.filter(node => {
                return (node instanceof VisualTextNode) || (node instanceof VideoFileNode);
            });
            this.startInfos = computeOneTimeStartInfos(drawableNodes);
        }
        draw(timeMs, ctx, pathToVideoHtml) {
            const nextStartInfo = this.startInfos[this.startInfoIdx + 1];
            const transitioning = nextStartInfo && nextStartInfo.startMs <= timeMs;
            if (transitioning) {
                this.startInfoIdx += 1;
                // Stop the relevant videoHtmls
                const prevStartInfo = this.startInfos[this.startInfoIdx - 1];
                if (prevStartInfo) {
                    prevStartInfo.nodes.forEach(node => {
                        if (node instanceof VideoFileNode) {
                            const videoHtml = pathToVideoHtml.get(node.filePath);
                            if (videoHtml && !videoHtml.paused) {
                                videoHtml.pause();
                            }
                        }
                    });
                }
            }
            const currStartInfo = this.startInfos[this.startInfoIdx];
            if (!currStartInfo) {
                return;
            }
            currStartInfo.nodes.forEach(node => {
                if (node instanceof VisualTextNode) {
                    ctx.font = '48px serif';
                    ctx.textBaseline = 'top';
                    ctx.fillText(node.text, 0, 0);
                }
                else if (node instanceof VideoFileNode) {
                    // 1. Start the relevant videoHtmls
                    const videoHtml = pathToVideoHtml.get(node.filePath);
                    if (!videoHtml) {
                        throw `Unable to find video html for file: ${node.filePath}`;
                    }
                    if (videoHtml.paused) {
                        const initialOffsetMs = timeMs - node.commonNodeAttr.startMs;
                        videoHtml.currentTime = (initialOffsetMs + node.startMs) / 1000;
                        videoHtml.play();
                    }
                    // 2. Extract the relevant images from the relevant videoHtmls into ctx.
                    const drawImageArgs = computeDrawImageArgs(videoHtml);
                    ctx.drawImage(videoHtml, ...drawImageArgs);
                }
            });
        }
    }
    function computeDrawImageArgs(videoHtml) {
        const destWidth = videoHtml.videoWidth;
        const destHeight = videoHtml.videoHeight;
        const srcWidth = videoHtml.videoWidth;
        const srcHeight = videoHtml.videoHeight;
        return [0, 0, srcWidth, srcHeight, 0, 0, destWidth, destHeight];
    }

    class Talker {
        constructor(startInfos = [], startInfoIdx = -1) {
            this.startInfos = startInfos;
            this.startInfoIdx = startInfoIdx;
        }
        setup(container, startMs = 0) {
            this.startInfoIdx = -1;
            this.startInfos.forEach((startInfo, idx) => {
                if (startInfo.startMs < startMs) {
                    this.startInfoIdx = idx;
                }
            });
            const nodes = container.getNestedNodes();
            const textNodes = nodes.filter(node => {
                return node instanceof AudioSpeechNode;
            });
            this.startInfos = computeRecurringStartInfos(textNodes);
        }
        talk(timeMs = 0) {
            const nextStartInfo = this.startInfos[this.startInfoIdx + 1];
            if (nextStartInfo && nextStartInfo.startMs <= timeMs) {
                this.startInfoIdx += 1;
            }
            else {
                return;
            }
            nextStartInfo.nodes.forEach(node => {
                window.speechSynthesis.speak(node.createUtterance());
            });
        }
    }

    class Director {
        constructor(canvas = document.createElement('canvas'), isPlaying = false, msPerFrame = 16, timeMs = 0, drawer = new Drawer(), talker = new Talker(), animateTimeoutId = 0, onChangeCallback = () => { }) {
            this.canvas = canvas;
            this.isPlaying = isPlaying;
            this.msPerFrame = msPerFrame;
            this.timeMs = timeMs;
            this.drawer = drawer;
            this.talker = talker;
            this.animateTimeoutId = animateTimeoutId;
            this.onChangeCallback = onChangeCallback;
        }
        togglePlayPause(editor) {
            if (this.isPlaying) {
                this.pause();
                return;
            }
            const container = editor.getOpenedContainer();
            let startMs = editor.cursor.timeMs;
            if (editor.cursor.timeMs + this.msPerFrame >= container.commonNodeAttr.endMs) {
                startMs = 0;
            }
            this.play(editor, startMs);
        }
        play(editor, startMs = 0) {
            if (this.isPlaying) {
                return;
            }
            this.isPlaying = true;
            this.timeMs = startMs;
            const container = editor.getOpenedContainer();
            this.drawer.setup(container, startMs);
            this.talker.setup(container, startMs);
            this.animateRecursively(editor.unpersisted.pathToVideoHtml, container.commonNodeAttr.endMs);
        }
        pause() {
            this.isPlaying = false;
            window.clearTimeout(this.animateTimeoutId);
            window.speechSynthesis.cancel();
            this.onChangeCallback(this.timeMs);
        }
        onChange(callback) {
            this.onChangeCallback = callback;
        }
        animateRecursively(pathToVideoHtml, endMs = 10000) {
            const ctx = this.get2dContext();
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.drawer.draw(this.timeMs, ctx, pathToVideoHtml);
            this.talker.talk(this.timeMs);
            // TODO see if we need to disable this avoid jank.
            this.onChangeCallback(this.timeMs);
            const nextTimeMs = this.timeMs + this.msPerFrame;
            if (nextTimeMs > endMs) {
                return;
            }
            this.animateTimeoutId = window.setTimeout(() => {
                this.timeMs = nextTimeMs;
                this.animateRecursively(pathToVideoHtml, endMs);
            }, this.msPerFrame);
        }
        get2dContext() {
            const ctx = this.canvas.getContext("2d");
            if (!ctx) {
                throw 'Failed to get 2D context from the canvas';
            }
            return ctx;
        }
    }

    class Cursor {
        constructor(timeMs = 0, trackIdx = 0) {
            this.timeMs = timeMs;
            this.trackIdx = trackIdx;
        }
        static deserialize(json) {
            return new Cursor(json.timeMs, json.trackIdx);
        }
    }

    // Design: for the final result, just pick 1 of assets and click record.
    // 
    class Project {
        constructor(id = `${(new Date()).toLocaleDateString()} ${(new Date()).toLocaleTimeString()}`, title = id, containers = [new ContainerNode()]) {
            this.id = id;
            this.title = title;
            this.containers = containers;
        }
        static deserialize(json) {
            return new Project(json.id, json.title, json.containers.map((nodeObj) => deserializeToNode(nodeObj)));
        }
    }

    class Unpersisted {
        constructor() {
            this.onChangeFunc = () => { };
            this.openedContainer = null;
            this.pathToVideoHtml = new Map();
        }
    }
    class Editor {
        constructor(project = new Project, 
        // TODO add a ContainerListCursor to move between top-level containers.
        cursor = new Cursor, openedContainerId = project.containers[0].commonNodeAttr.idNum) {
            this.project = project;
            this.cursor = cursor;
            this.openedContainerId = openedContainerId;
            this.unpersisted = new Unpersisted();
        }
        static deserialize(json) {
            const project = Project.deserialize(json.project);
            return new Editor(project, Cursor.deserialize(json.cursor), json.openedContainerId);
        }
        serialize() {
            const json = JSON.parse(JSON.stringify(this));
            delete json.unpersisted;
            const str = JSON.stringify(json, null, 2);
            console.log(str);
            return str;
        }
        onChange(onChangeFunc) {
            this.unpersisted.onChangeFunc = onChangeFunc;
        }
        notify() {
            this.getOpenedContainer().fixEndPoints();
            this.unpersisted.onChangeFunc();
        }
        loadPathToVideoHtml() {
            this.getOpenedContainer().getNestedNodes().forEach(node => {
                if (node instanceof VideoFileNode) {
                    if (!this.unpersisted.pathToVideoHtml.has(node.filePath)) {
                        this.loadVideoHtmlForNode(node);
                    }
                }
            });
        }
        pauseVideoHtmls() {
            this.unpersisted.pathToVideoHtml.forEach((videoHtml) => {
                videoHtml.pause();
            });
        }
        async handleEnter() {
            const res = prompt("Enter text for Audio Speech.");
            if (res === null) {
                return;
            }
            const node = new AudioSpeechNode();
            node.commonNodeAttr.idNum = this.genNextNodeId();
            node.commonNodeAttr.trackIdx = this.cursor.trackIdx;
            node.commonNodeAttr.startMs = this.cursor.timeMs;
            node.commonNodeAttr.endMs = this.cursor.timeMs + 2000;
            node.text = res;
            this.getOpenedContainer().addNode(node);
            this.notify();
            await node.testAndUpdateDuration();
            this.notify();
        }
        handleShiftEnter() {
            const res = prompt("Enter text for Visual Text.");
            if (res === null) {
                return;
            }
            const node = new VisualTextNode();
            node.commonNodeAttr.idNum = this.genNextNodeId();
            node.commonNodeAttr.trackIdx = this.cursor.trackIdx;
            node.commonNodeAttr.startMs = this.cursor.timeMs;
            node.commonNodeAttr.endMs = this.cursor.timeMs + 2000;
            node.text = res;
            this.getOpenedContainer().addNode(node);
            this.notify();
        }
        handleOpenFile() {
            const node = new VideoFileNode();
            node.commonNodeAttr.idNum = this.genNextNodeId();
            node.commonNodeAttr.trackIdx = this.cursor.trackIdx;
            node.commonNodeAttr.startMs = this.cursor.timeMs;
            node.commonNodeAttr.endMs = this.cursor.timeMs + 2000;
            this.getOpenedContainer().addNode(node);
            this.notify();
            this.loadVideoHtmlForNode(node);
        }
        loadVideoHtmlForNode(node) {
            // editWindowUi would be a better place to have this but
            // we need this loaded here to get the durMs.
            const videoHtml = document.createElement('video');
            videoHtml.id = `video-file-node-video-html-${node.commonNodeAttr.idNum}`;
            videoHtml.src = node.filePath;
            // videoHtml.style.display = 'none';
            document.body.appendChild(videoHtml);
            this.unpersisted.pathToVideoHtml.set(node.filePath, videoHtml);
            videoHtml.onloadedmetadata = () => {
                const durMs = Math.ceil(videoHtml.duration * 1000);
                node.commonNodeAttr.endMs = this.cursor.timeMs + durMs;
                this.notify();
            };
        }
        setCursorTimeMs(timeMs = 0) {
            this.cursor.timeMs = timeMs;
            this.notify();
        }
        handleRight() {
            this.cursor.trackIdx += 1;
            this.notify();
        }
        handleLeft() {
            if (this.cursor.trackIdx > 0) {
                this.cursor.trackIdx -= 1;
            }
            this.notify();
        }
        handleUp() {
            this.cursor.timeMs -= 1000;
            if (this.cursor.timeMs < 0) {
                this.cursor.timeMs = 0;
            }
            this.notify();
        }
        handleDown() {
            this.cursor.timeMs += 1000;
            this.notify();
        }
        getOpenedContainer() {
            if (this.unpersisted.openedContainer !== null && this.unpersisted.openedContainer.commonNodeAttr.idNum === this.openedContainerId) {
                return this.unpersisted.openedContainer;
            }
            for (let container of this.project.containers) {
                if (container.commonNodeAttr.idNum === this.openedContainerId) {
                    this.unpersisted.openedContainer = container;
                    return container;
                }
            }
            throw 'Unable to find container with ID: ' + this.openedContainerId;
        }
        genNextNodeId() {
            function getNodeIds(node) {
                const res = [node.commonNodeAttr.idNum];
                if (node instanceof ContainerNode) {
                    return res.concat(node.nodes.flatMap((node) => getNodeIds(node)));
                }
                return res;
            }
            return Math.max(...this.project.containers.flatMap(node => getNodeIds(node))) + 1;
        }
    }

    const w3 = "http://www.w3.org/2000/svg";
    function makeTopSvg(width = 500, height = 500) {
        return makeSvg('svg', {
            width: width.toString(),
            height: height.toString(),
        });
    }
    function makeSvg(tag = 'svg', attrs = {}) {
        const svg = document.createElementNS(w3, tag);
        for (const [key, value] of Object.entries(attrs)) {
            const valStr = typeof value === 'string' ? value : JSON.stringify(value);
            svg.setAttribute(key, valStr);
        }
        return svg;
    }

    class EditWindowUi {
        constructor(editor, panelDiv = document.createElement('div'), startMs = 0, windowSizeMs = 10000, width = 500, height = 500, trackSize = 80, padding = 10) {
            this.editor = editor;
            this.panelDiv = panelDiv;
            this.startMs = startMs;
            this.windowSizeMs = windowSizeMs;
            this.width = width;
            this.height = height;
            this.trackSize = trackSize;
            this.padding = padding;
        }
        zoom(factor = 0.75) {
            this.windowSizeMs = Math.ceil(factor * this.windowSizeMs);
            this.render();
        }
        render() {
            this.moveWindowToCursor();
            const svg = makeTopSvg(this.width, this.height);
            const openedContainer = this.editor.getOpenedContainer();
            openedContainer.nodes.forEach((node) => {
                let fill = 'white';
                if (node instanceof AudioSpeechNode) {
                    fill = '#bee';
                }
                else if (node instanceof VisualTextNode) {
                    fill = '#ccc';
                }
                else if (node instanceof VideoFileNode) {
                    fill = '#beb';
                }
                const rect = makeSvg('rect', {
                    x: node.commonNodeAttr.trackIdx * this.trackSize + this.padding,
                    y: this.timeMsToPos(node.commonNodeAttr.startMs),
                    width: this.trackSize - 2 * this.padding,
                    height: this.timeMsToPos(node.commonNodeAttr.endMs) - this.timeMsToPos(node.commonNodeAttr.startMs),
                    fill: fill,
                    stroke: 'black',
                });
                svg.appendChild(rect);
            });
            const rect = makeSvg('rect', {
                x: this.editor.cursor.trackIdx * this.trackSize,
                y: this.timeMsToPos(this.editor.cursor.timeMs),
                width: Math.ceil(this.trackSize),
                height: 3,
                fill: 'blue',
                stroke: 'blue',
            });
            svg.appendChild(rect);
            this.panelDiv.innerHTML = svg.outerHTML;
        }
        timeMsToPos(timeMs = 0) {
            return Math.ceil((timeMs - this.startMs) / this.windowSizeMs * this.height);
        }
        moveWindowToCursor() {
            const cursorMs = this.editor.cursor.timeMs;
            if (cursorMs <= this.startMs) {
                this.startMs = cursorMs - Math.ceil(this.windowSizeMs / 10);
            }
            if (cursorMs >= this.startMs + this.windowSizeMs) {
                this.startMs = cursorMs - this.windowSizeMs + Math.ceil(this.windowSizeMs / 10);
            }
        }
    }

    let voices = [];
    function initVoices() {
        if (voices.length > 0) {
            return;
        }
        voices = window.speechSynthesis.getVoices().filter(voice => voice.localService && voice.lang === 'en-AU');
    }

    const editorsNamespace = 'editors';
    class EditorUi extends HTMLElement {
        constructor(editor = new Editor, editWindowUi = new EditWindowUi(editor), director = new Director) {
            super();
            this.editor = editor;
            this.editWindowUi = editWindowUi;
            this.director = director;
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
        load(projectId) {
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
            this.director.onChange((timeMs) => {
                this.editor.setCursorTimeMs(timeMs);
            });
        }
        handleKeydown(evt) {
            console.log(evt);
            initVoices();
            if (matchKey(evt, 'enter')) {
                this.editor.handleEnter();
            }
            else if (matchKey(evt, 'shift+enter')) {
                this.editor.handleShiftEnter();
            }
            else if (matchKey(evt, 'cmd+s')) {
                this.save();
            }
            else if (matchKey(evt, 'o')) {
                this.editor.handleOpenFile();
            }
            else if (matchKey(evt, 'left')) {
                this.editor.handleLeft();
            }
            else if (matchKey(evt, 'right')) {
                this.editor.handleRight();
            }
            else if (matchKey(evt, 'up')) {
                this.editor.handleUp();
            }
            else if (matchKey(evt, 'down')) {
                this.editor.handleDown();
            }
            else if (matchKey(evt, 'space')) {
                this.editor.pauseVideoHtmls();
                this.director.togglePlayPause(this.editor);
            }
            else if (matchKey(evt, 'backspace')) ;
            else {
                return;
            }
            evt.preventDefault();
        }
    }
    // E.g.: cmd+shift+enter or cmd+space
    function matchKey(evt, wantStr = '') {
        let evtKey = evt.key;
        // Special cases
        if (evtKey === ' ') {
            evtKey = 'space';
        }
        else if (evtKey === 'ArrowRight') {
            evtKey = 'right';
        }
        else if (evtKey === 'ArrowUp') {
            evtKey = 'up';
        }
        else if (evtKey === 'ArrowDown') {
            evtKey = 'down';
        }
        else if (evtKey === 'ArrowLeft') {
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
        const evtProps = new Set();
        if (evt.metaKey) {
            evtProps.add('cmd' );
        }
        if (evt.altKey) {
            evtProps.add('alt');
        }
        if (evt.shiftKey) {
            evtProps.add('shift');
        }
        if (evt.ctrlKey) {
            evtProps.add('ctrl' );
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

    // NOTE: this library only works for source url that doesn't have any query param
    // i.e. ?a=b. Instead it should use #a=b
    // If you have to use ?, such as for local file, then?
    // Pure functions
    function toInternalUrl(externalUrlStr) {
        if (externalUrlStr.includes('?')) {
            // throw `URL should not contain ?: ${externalUrlStr}`;
            console.warn(`URL should not contain ?: ${externalUrlStr}`);
            externalUrlStr = externalUrlStr.replace('?', '');
        }
        return new URL(externalUrlStr.replace('#', '?'));
    }
    function getUrlParamsMapFromString(urlStr) {
        const keyVals = new Map();
        if (!urlStr) {
            return keyVals;
        }
        const url = toInternalUrl(urlStr);
        url.searchParams.forEach(function (value, key) {
            keyVals.set(key, value);
        });
        return keyVals;
    }
    function getUrlParamsMap() {
        return getUrlParamsMapFromString(document.URL);
    }

    function main(url) {
        const paramsMap = getUrlParamsMap();
        const projectId = paramsMap.get('project_id');
        if (!projectId) {
            return;
        }
        const mainDiv = document.getElementById('main');
        const editorUi = new EditorUi();
        editorUi.load(projectId);
        mainDiv.innerHTML = '';
        mainDiv.appendChild(editorUi);
        editorUi.render();
        document.body.addEventListener('keydown', evt => editorUi.handleKeydown(evt));
    }

    main();

})();
//# sourceMappingURL=webMain.js.map
