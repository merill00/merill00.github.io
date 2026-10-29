(() => {
  "use strict";

  const byId = id => document.getElementById(id);
  const ui = {
    image:byId("pageImage"), heading:byId("pageHeading"), text:byId("storyText"),
    eyebrow:byId("pageEyebrow"), subtitle:byId("storySubtitle"), count:byId("pageCount"),
    next:byId("nextBtn"), previous:byId("prevBtn"), listen:byId("listenBtn"),
    stop:byId("stopBtn"), activity:byId("activity"), activityToggle:byId("activityToggle"), progress:byId("progressBar"),
    print:byId("printBookBtn"), printRoot:byId("printBook")
  };
  const state = { story:null, index:-1, utterance:null, wordSpans:[], pendingInstall:null }; // -1 front cover, 0..n-1 story, n rear cover
  // A malformed/older story JSON may still contain a stale optional cover path.
  // Hide the image if it cannot load; current publishing also clears missing local paths.
  ui.image.addEventListener("error", () => {
    ui.image.removeAttribute("src");
    ui.image.hidden = true;
  });

  async function loadStory() {
    const response = await fetch("story.json", {cache:"no-store"});
    if (!response.ok) throw new Error("Could not load story.json");
    state.story = await response.json();
    if (!state.story || !Array.isArray(state.story.pages) || !state.story.pages.length) {
      throw new Error("This published story has no pages.");
    }
    document.title = state.story.title || "Storybook Reader";
    byId("brandTitle").textContent = "Apps For Christ";
    renderPage();
  }

  function currentPage() {
    if (state.index < 0) return state.story.frontCover || {heading:state.story.title,title:state.story.title,text:state.story.coverText || state.story.subtitle || "",image:state.story.cover,alt:state.story.coverAlt||"Front cover",quiz:state.story.coverQuiz||[]};
    if (state.index >= state.story.pages.length) return state.story.rearCover || {title:"",heading:"",text:"",image:"",alt:"Rear cover",quiz:[]};
    return state.story.pages[state.index];
  }

  function renderPage() {
    const front = state.index < 0;
    const rear = state.index >= state.story.pages.length;
    const cover = front || rear;
    const page = currentPage();
    const imageSource = page.image || (rear ? "" : "images/placeholder.png");
    if (imageSource) {
      ui.image.src = imageSource;
      ui.image.hidden = false;
    } else {
      ui.image.removeAttribute("src");
      ui.image.hidden = true;
    }
    ui.image.alt = page.alt || page.heading || "Story illustration";
    ui.heading.textContent = front ? (page.title ?? page.heading ?? (state.story.frontCover ? "" : state.story.title || "Storybook")) : rear ? (page.title ?? page.heading ?? "") : (page.heading || `Page ${state.index+1}`);
    ui.heading.hidden = cover && !ui.heading.textContent.trim();
    ui.eyebrow.textContent = front ? (page.subtitle || (state.story.author ? `A story by ${state.story.author}` : "An interactive storybook")) : rear ? "" : `Page ${state.index+1}`;
    ui.subtitle.textContent = cover ? "" : (state.story.subtitle || state.story.description || "An interactive storybook");
    ui.subtitle.hidden = cover;
    ui.count.textContent = front ? "Front cover" : rear ? "Back cover" : `Page ${state.index+1} of ${state.story.pages.length}`;
    ui.text.replaceChildren();
    if ((page.text || "").trim()) {
      const paragraph = document.createElement("p");
      paragraph.textContent = page.text;
      ui.text.appendChild(paragraph);
    }
    ui.activity.replaceChildren();
    ui.activity.classList.add("hidden");
    if (page.quiz && page.quiz.length) {
      renderQuestions(page.quiz);
      ui.activity.classList.add("activity-collapsed");
      ui.activityToggle.hidden = false;
      ui.activityToggle.setAttribute("aria-expanded", "false");
      ui.activityToggle.innerHTML = 'Show activity questions <span aria-hidden="true">▾</span>';
    } else {
      ui.activityToggle.hidden = true;
      ui.activity.classList.remove("activity-collapsed");
    }
    ui.previous.disabled = front;
    ui.progress.style.width = front ? "0%" : rear ? "100%" : `${((state.index+1)/state.story.pages.length)*100}%`;
    stopNarration(false);
  }

  function speakFeedback(message) {
    if (!("speechSynthesis" in window) || !message) return;
    window.speechSynthesis.cancel();
    const feedback = new SpeechSynthesisUtterance(message);
    feedback.lang = "en-US"; feedback.rate = .9; feedback.pitch = 1.05;
    window.speechSynthesis.speak(feedback);
  }

  function renderQuestions(questions) {
    ui.activity.classList.remove("hidden");
    const title = document.createElement("h3");
    title.textContent = "Your turn! Choose an answer";
    ui.activity.appendChild(title);
    questions.forEach((question, questionIndex) => {
      const wrap = document.createElement("section"); wrap.className = "quiz-question-wrap";
      const prompt = document.createElement("p"); prompt.className = "quiz-question";
      prompt.textContent = `${questionIndex+1}. ${question.q}`;
      const options = document.createElement("div"); options.className = "quiz-options";
      const feedback = document.createElement("p"); feedback.className = "quiz-feedback";
      feedback.setAttribute("role","status"); feedback.setAttribute("aria-live","polite");
      feedback.textContent = "Tap an answer to try it.";
      let attempts = 0, solved = false;
      (question.options || []).forEach((choice, choiceIndex) => {
        const button = document.createElement("button");
        button.type = "button"; button.className = "quiz-option"; button.textContent = choice;
        button.addEventListener("click", () => {
          if (solved) return;
          attempts++;
          if (choiceIndex === question.answer) {
            solved = true; button.classList.add("correct");
            const message = question.correctFeedback || (attempts === 1 ? "Correct! Great job!" : "You got it! Great job trying again!");
            feedback.textContent = `${message} 🌟`; speakFeedback(message);
            options.querySelectorAll("button").forEach(option => option.disabled = true);
          } else {
            button.classList.add("incorrect");
            const message = question.incorrectFeedback || "Good try! Not quite. Choose another answer and try again.";
            feedback.textContent = message; speakFeedback(message);
            button.setAttribute("aria-label", `${choice}. Not quite; you can try again.`);
          }
        });
        options.appendChild(button);
      });
      wrap.append(prompt, options, feedback); ui.activity.appendChild(wrap);
    });
  }

  function stopNarration(cancel = true) {
    if ("speechSynthesis" in window && cancel) window.speechSynthesis.cancel();
    state.utterance = null;
    state.wordSpans.forEach(span => span.classList.remove("active"));
    state.wordSpans = [];
    ui.listen.querySelector(".listen-button-label").textContent = "▶ Listen";
  }

  function speak() {
    if (!("speechSynthesis" in window)) {
      alert("Read aloud is not supported in this browser. Try a recent version of Safari or Chrome.");
      return;
    }
    if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
      window.speechSynthesis.resume(); ui.listen.querySelector(".listen-button-label").textContent = "Ⅱ Pause"; return;
    }
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause(); ui.listen.querySelector(".listen-button-label").textContent = "▶ Resume"; return;
    }
    stopNarration();
    const text = currentPage().text || "";
    if (!text.trim()) { nextPage(); return; }
    ui.text.replaceChildren();
    const paragraph = document.createElement("p");
    const tokens = text.match(/\S+\s*/g) || [];
    state.wordSpans = tokens.map(token => {
      const span = document.createElement("span"); span.className = "word"; span.textContent = token;
      paragraph.appendChild(span); return span;
    });
    ui.text.appendChild(paragraph);
    state.utterance = new SpeechSynthesisUtterance(text);
    state.utterance.lang = "en-US"; state.utterance.rate = .88; state.utterance.pitch = 1.02;
    state.utterance.onboundary = event => {
      if (typeof event.charIndex !== "number") return;
      let offset = 0, index = 0;
      for (let i=0; i<tokens.length; i++) {
        const end = offset + tokens[i].length;
        if (event.charIndex >= offset && event.charIndex < end) { index = i; break; }
        offset = end;
      }
      state.wordSpans.forEach((span, i) => span.classList.toggle("active", i === index));
      if (state.wordSpans[index]) state.wordSpans[index].scrollIntoView({block:"nearest",behavior:"smooth"});
    };
    state.utterance.onend = () => stopNarration(false);
    state.utterance.onerror = () => { ui.listen.querySelector(".listen-button-label").textContent = "▶ Listen"; };
    window.speechSynthesis.speak(state.utterance);
    ui.listen.querySelector(".listen-button-label").textContent = "Ⅱ Pause";
  }

  function nextPage() {
    stopNarration();
    state.index = state.index < state.story.pages.length ? state.index+1 : -1;
    renderPage();
  }
  function previousPage() {
    if (state.index > -1) { stopNarration(); state.index--; renderPage(); }
  }
  function showCover() { stopNarration(); state.index = -1; renderPage(); }

  function buildPrintableBook() {
    ui.printRoot.replaceChildren();
    const appendPrintPage = (heading, text, image, alt, questions, isCover) => {
      const section = document.createElement("section"); section.className = `print-page${isCover ? " cover-print" : ""}`;
      if (image || !isCover) {
        const art = document.createElement("img"); art.className = "print-art"; art.src = image || "images/placeholder.png"; art.alt = alt || heading || "Story illustration";
        section.appendChild(art);
      }
      const title = document.createElement(isCover ? "h1" : "h2"); title.textContent = heading || ""; section.appendChild(title);
      if (text) { const paragraph = document.createElement("p"); paragraph.className = "print-copy"; paragraph.textContent = text; section.appendChild(paragraph); }
      (questions || []).forEach((question, index) => {
        const box = document.createElement("div"); box.className = "print-question";
        const prompt = document.createElement("strong"); prompt.textContent = `Question${questions.length > 1 ? " "+(index+1) : ""}: ${question.q}`;
        box.appendChild(prompt);
        (question.options || []).forEach((option, optionIndex) => {
          const line = document.createElement("div"); line.className = "print-option";
          line.textContent = `${String.fromCharCode(65+optionIndex)}. ${option}`; box.appendChild(line);
        });
        const answer = document.createElement("p"); answer.className = "print-answer-line"; answer.textContent = "My answer: __________________________";
        box.appendChild(answer); section.appendChild(box);
      });
      ui.printRoot.appendChild(section);
    };
    const story = state.story;
    const front = story.frontCover || {title:story.title,text:story.coverText||story.subtitle||"",image:story.cover,alt:story.coverAlt,quiz:story.coverQuiz||[]};
    const rear = story.rearCover || {title:null,text:null,image:"",alt:"Rear cover illustration",quiz:[]};
    appendPrintPage(front.title||story.title, [front.subtitle,front.text].filter(Boolean).join("\n\n"), front.image||story.cover, front.alt||story.coverAlt, front.quiz||[], true);
    story.pages.forEach((page, index) => appendPrintPage(`${index+1}. ${page.heading}`, page.text, page.image, page.alt, page.quiz || [], false));
    appendPrintPage(rear.title||"", rear.text||"", rear.image, rear.alt||"Rear cover illustration", rear.quiz||[], true);
  }

  async function printBook() {
    stopNarration(); buildPrintableBook();
    const images = [...ui.printRoot.querySelectorAll("img")];
    await Promise.all(images.map(image => image.complete && image.naturalWidth > 0 ? Promise.resolve() : new Promise(resolve => { image.onload = resolve; image.onerror = resolve; })));
    window.print();
  }

  
  function positionControlsForMobileActivity() {
    const controls = document.querySelector(".reader-controls.icon-bar");
    const pageLayout = document.getElementById("pageLayout");
    const pageCopy = document.querySelector(".page-copy");
    const toggle = document.getElementById("activityToggle");
    if (!controls || !pageLayout || !pageCopy || !toggle) return;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    if (mobile) {
      if (controls.parentElement !== pageCopy) pageCopy.insertBefore(controls, toggle);
    } else {
      if (controls.parentElement !== pageLayout.parentElement) {
        pageLayout.insertAdjacentElement("afterend", controls);
      }
    }
  }

  function bindEvents() {
    positionControlsForMobileActivity();
    window.addEventListener("resize", positionControlsForMobileActivity);
    const menuToggle = byId("readerMenuToggle");
    const readerMenu = byId("readerMenu");
    const closeReaderMenu = () => {
      if (!menuToggle || !readerMenu) return;
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open reader menu");
      readerMenu.classList.remove("menu-open");
    };
    if (menuToggle && readerMenu) {
      menuToggle.addEventListener("click", () => {
        const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
        menuToggle.setAttribute("aria-expanded", String(!isOpen));
        menuToggle.setAttribute("aria-label", isOpen ? "Open reader menu" : "Close reader menu");
        readerMenu.classList.toggle("menu-open", !isOpen);
      });
      readerMenu.addEventListener("click", event => {
        if (event.target.closest("button")) closeReaderMenu();
      });
      document.addEventListener("click", event => {
        if (!event.target.closest(".topbar")) closeReaderMenu();
      });
      document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeReaderMenu();
      });
      window.addEventListener("resize", () => {
        if (window.matchMedia("(min-width: 761px)").matches) closeReaderMenu();
      });
    }

    ui.activityToggle.addEventListener("click", () => {
      const expanded = ui.activityToggle.getAttribute("aria-expanded") !== "true";
      ui.activityToggle.setAttribute("aria-expanded", String(expanded));
      ui.activity.classList.toggle("activity-collapsed", !expanded);
      ui.activityToggle.innerHTML = `${expanded ? "Hide" : "Show"} activity questions <span aria-hidden="true">▾</span>`;
      if (expanded) {
        requestAnimationFrame(() => {
          window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
        });
      }
    });
    ui.next.addEventListener("click", nextPage);
    ui.previous.addEventListener("click", previousPage);
    ui.listen.addEventListener("click", speak);
    ui.stop.addEventListener("click", () => stopNarration());
    ui.print.addEventListener("click", printBook);
    byId("homeLink").addEventListener("click", event => { event.preventDefault(); showCover(); });
    document.addEventListener("keydown", event => {
      if (event.target.matches("input,textarea,select")) return;
      if (event.key === "ArrowRight") nextPage();
      if (event.key === "ArrowLeft") previousPage();
      if (event.key === " " && !event.target.matches("button,a")) { event.preventDefault(); speak(); }
    });
    let startX = null, startY = null;
    byId("reader").addEventListener("touchstart", event => {
      if (event.touches.length === 1) { startX = event.touches[0].clientX; startY = event.touches[0].clientY; }
    }, {passive:true});
    byId("reader").addEventListener("touchend", event => {
      if (startX === null) return;
      const dx = event.changedTouches[0].clientX-startX, dy = event.changedTouches[0].clientY-startY;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)*1.25) { if (dx < 0) nextPage(); else previousPage(); }
      startX = null; startY = null;
    }, {passive:true});
    window.addEventListener("beforeunload", () => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); });
    window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); state.pendingInstall = event; byId("installBtn").classList.remove("hidden"); });
    byId("installBtn").addEventListener("click", async () => {
      if (!state.pendingInstall) return;
      state.pendingInstall.prompt(); await state.pendingInstall.userChoice; state.pendingInstall = null;
      byId("installBtn").classList.add("hidden");
    });
  }

  async function registerServiceWorker() {
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      try { await navigator.serviceWorker.register("service-worker.js"); }
      catch (error) { console.warn("Reader service worker registration failed", error); }
    }
  }

  async function initReader() {
    bindEvents();
    try { await loadStory(); await registerServiceWorker(); }
    catch (error) {
      ui.heading.textContent = "Story could not be loaded";
      ui.text.textContent = `${error.message}. Re-publish the Reader App from Author mode.`;
      console.error(error);
    }
  }

  initReader();
})();



/* Shared visual/accessibility normalization for Author and Reader control bars. */
function normalizeReaderControlBar() {
  document.querySelectorAll(".reader-controls.icon-bar, .reader-controls.icon-toolbar").forEach((bar) => {
    bar.classList.add("icon-bar");
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Story navigation and narration controls");
    const labels = {
      prevBtn: "Previous page",
      nextBtn: "Next page",
      listenBtn: "Listen to story",
      stopBtn: "Stop narration"
    };
    Object.entries(labels).forEach(([id, label]) => {
      const button = bar.querySelector("#" + id);
      if (button) {
        button.setAttribute("aria-label", label);
        button.setAttribute("type", "button");
      }
    });
  });
}
document.addEventListener("DOMContentLoaded", normalizeReaderControlBar);
