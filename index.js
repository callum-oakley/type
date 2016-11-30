class Event {
  constructor(type, ...args) {
    this.type = type,
    this.args = args
  }
}

class AccuracyTracker {
  constructor() {
    this.goodStrokes = 0;
    this.totalStrokes = 0;
  }

  update(good) {
    if (good) { this.goodStrokes++; }
    this.totalStrokes++;
  }

  get accuracy() {
    return Math.round(100 * this.goodStrokes / this.totalStrokes);
  }
}

class State {
  constructor(text) {
    this.resetOrInitialise(text);
  }

  resetOrInitialise(text) {
    this.cursor = 0;
    this.input = "";
    this.isComplete = false;
    this.text = text;
    this.timer = {
      running: false
    };
    this.accuracyTracker = new AccuracyTracker();
  }

  get wpm() {
    const elapsedMinutes = this.timer.elapsed / 60000;
    const standardWords = this.text.length / 5;
    return Math.round(standardWords / elapsedMinutes);
  }

  get hasErrors() {
    return !this.text.startsWith(this.input);
  }

  get isAtStart() {
    return this.cursor === 0;
  }

  get isAtEnd() {
    return this.cursor === this.text.length;
  }

  nextLine() {
    while (!this.isAtEnd && this.text[this.cursor] === " ") {
      this.input += this.text[this.cursor++];
    }
  }

  processInput(key) {
    var eventQueue = [];
    if (key.length === 1 && !this.isAtEnd) {
      this.input += key;
      this.accuracyTracker.update(key === this.text[this.cursor]);
      this.cursor++;
    } else if (key === "Enter" && !this.isAtEnd) {
      this.input += "\n";
      this.accuracyTracker.update("\n" === this.text[this.cursor]);
      this.cursor++;
      this.nextLine();
    } else if (key === "Backspace" && !this.isAtStart) {
      this.input = this.input.slice(0, -1);
      this.cursor--;
    }
    if (!this.timer.running && !this.isAtStart) {
      eventQueue.push(new Event("startTimer"));
    }
    if (this.isAtEnd) {
      eventQueue.push(new Event("end"));
    }
    return eventQueue;
  }

  processStartTimer() {
    this.timer.running = true;
    this.timer.start = Date.now();
    return [];
  }

  processEnd() {
    if (this.input === this.text) {
      this.isComplete = true;
      this.timer.running = false;
      this.timer.elapsed = Date.now() - this.timer.start;
    }
    return [];
  }

  processCommand(key) {
    var eventQueue = [];
    if (key === "r") {
      this.resetOrInitialise(this.text);
      eventQueue.push(new Event());
    } else if (key === "n") {
      this.resetOrInitialise("");
      eventQueue.push(new Event());
    }
    return eventQueue;
  }

  processSetText(text) {
    this.resetOrInitialise(text);
    return [];
  }

  process(event) {
    var eventQueue = [];
    if (event.type === "input") {
      eventQueue = eventQueue.concat(this.processInput(...event.args));
    } else if (event.type === "startTimer") {
      eventQueue = eventQueue.concat(this.processStartTimer());
    } else if (event.type === "end") {
      eventQueue = eventQueue.concat(this.processEnd());
    } else if (event.type === "command") {
      eventQueue = eventQueue.concat(this.processCommand(...event.args));
    } else if (event.type === "setText") {
      eventQueue = eventQueue.concat(this.processSetText(...event.args));
    }
    render(this);
    eventQueue.forEach(e => { this.process(e); });
  }
}

Element.prototype.addCharacterElement = function (content, className) {
  var element = document.createElement("span");
  if (content) { element.textContent = content; }
  if (className) { element.className = className; }
  this.appendChild(element);
};

function renderTypedElement(paper, inputCharacter, textCharacter) {
  if (inputCharacter === textCharacter) {
    paper.addCharacterElement(inputCharacter, "typed");
  } else if (inputCharacter === "\n") {
    paper.addCharacterElement("\u00ac", "error")
    paper.addCharacterElement(inputCharacter, "error");
  } else if (inputCharacter.trim() === "") {
    paper.addCharacterElement("\u00b7", "error");
  } else {
    paper.addCharacterElement(inputCharacter, "error");
  }
};

function renderPaper(state) {
  var paper = document.getElementById("paper");
  while (paper.hasChildNodes()) {
    paper.removeChild(paper.lastChild);
  }
  for (let i = 0; i < state.text.length; i++) {
    if (i < state.cursor) {
      renderTypedElement(paper, state.input[i], state.text[i]);
    } else if (i == state.cursor && state.text[i] === "\n") {
      paper.addCharacterElement(
        "\u00ac",
        state.hasErrors ? "cursor-error" : "cursor"
      );
      paper.addCharacterElement(state.text[i]);
    } else if (i == state.cursor) {
      paper.addCharacterElement(
        state.text[i],
        state.hasErrors ? "cursor-error" : "cursor"
      );
    } else {
      paper.addCharacterElement(state.text[i]);
    }
  }
  if (state.isAtEnd && state.hasErrors) {
    paper.addCharacterElement(" ", "cursor-error");
  }
}

function renderResults(state) {
  var results = document.getElementById("results");
  results.textContent = "";
  if (!state.isComplete) { return; }
  const accuracy = state.accuracyTracker.accuracy;
  const wpm = state.wpm;
  results.textContent = `Accuracy: ${accuracy}%\n   Speed: ${wpm}wpm\n\n[hit r to retry, or n for a new text]`;
}

function renderErrorFlash() {
  var paper = document.getElementById("paper");
  paper.className = "error";
  window.setTimeout(
    () => { paper.className = ""; },
    200
  );
}

function renderGetText() {
  var textInput = document.getElementById("text-input");
  textInput.value = "";
  document.getElementById("instructions").textContent =
    "[paste a text in to the box above]";
  window.setTimeout(() => { textInput.focus(); }, 100 );
}

function render(state) {
  if (state.text) {
    document.getElementById("main").className = "";
    document.getElementById("settings").className = "hidden";
    renderPaper(state);
    renderResults(state);
    if (state.isAtEnd && state.hasErrors) {
      renderErrorFlash();
    }
  } else {
    document.getElementById("main").className = "hidden";
    document.getElementById("settings").className = "";
    renderGetText();
  }
}

class App {
  constructor() {
    document.addEventListener("keydown", event => {
      if (this.state.isComplete) {
        this.state.process(new Event("command", event.key));
      } else {
        this.state.process(new Event("input", event.key));
      }
    });
    var textInput = document.getElementById("text-input");
    textInput.addEventListener("input", () => {
      this.state.process(new Event("setText", textInput.value));
    });
    this.state = new State("");
    render(this.state);
  }
}

var app = new App();
