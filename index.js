function Event (type, ...args) {
  this.type = type,
  this.args = args
}

function State (text) {
  this.cursor = 0;
  this.input = "";
  this.isComplete = false;
  this.text = text;
}

State.prototype.hasErrors = function () {
  return !this.text.startsWith(this.input);
};

State.prototype.isAtStart = function () {
  return this.cursor === 0;
};

State.prototype.isAtEnd = function () {
  return this.cursor === this.text.length;
};

State.prototype.nextLine = function () {
  while (!this.isAtEnd() && this.text[this.cursor] === " ") {
    this.input += this.text[this.cursor++];
  }
};

State.prototype.processKeydown = function (key) {
  var eventQueue = [];
  if (key.length === 1 && !this.isAtEnd()) {
    this.input += key;
    this.cursor++;
  } else if (key === "Enter" && !this.isAtEnd()) {
    this.input += "\n";
    this.cursor++;
    this.nextLine();
  } else if (key === "Backspace" && !this.isAtStart()) {
    this.input = this.input.slice(0, -1);
    this.cursor--;
  }
  if (this.isAtEnd()) {
    eventQueue.push(new Event("end"));
  }
  return eventQueue;
};

State.prototype.processEnd = function () {
  if (this.input === this.text) {
    this.isComplete = true;
  }
  return [];
};

State.prototype.process = function (event) {
  var eventQueue = [];
  if (event.type === "keydown" && !this.isComplete) {
    eventQueue = eventQueue.concat(this.processKeydown(...event.args));
  } else if (event.type === "end") {
    eventQueue = eventQueue.concat(this.processEnd());
  }
  render(this);
  eventQueue.forEach(e => { this.process(e); });
};

Element.prototype.addCharacterElement = function (content, className) {
  var element = document.createElement("span");
  content && (element.textContent = content);
  className && (element.className = className);
  this.appendChild(element);
};

function renderTypedElement (paper, inputCharacter, textCharacter) {
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

function renderPaper (state) {
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
        state.hasErrors() ? "cursor-error" : "cursor"
      );
      paper.addCharacterElement(state.text[i]);
    } else if (i == state.cursor) {
      paper.addCharacterElement(
        state.text[i],
        state.hasErrors() ? "cursor-error" : "cursor"
      );
    } else {
      paper.addCharacterElement(state.text[i]);
    }
  }
  if (state.isAtEnd() && state.hasErrors()) {
    paper.addCharacterElement(" ", "cursor-error");
  }
}

function renderResults (state) {
  results = document.getElementById("results");
  results.textContent = "Complete!"
}

function render (state) {
  if (state.isComplete) {
    renderResults(state);
  } else {
    renderPaper(state);
    if (state.isAtEnd() && state.hasErrors()) {
      errorFlash();
    }
  }
}

function errorFlash () {
  var paper = document.getElementById("paper");
  paper.className = "error";
  window.setTimeout(
    () => { paper.className = ""; },
    200
  );
}

function App (initialState) {
  document.addEventListener("keydown", event => {
    this.state.process(new Event("keydown", event.key));
  });
  this.state = initialState;
  render(this.state);
}

var app = new App(new State(String.raw`function errorFlash () {
  var paper = document.getElementById("paper");
  paper.className = "error";
  window.setTimeout(
    () => { paper.className = ""; },
    200
  );
}`));
