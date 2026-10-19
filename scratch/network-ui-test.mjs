// asset:../gfx/assets/frontend/operations-console-hd.png?url
var operations_console_hd_default = "../gfx/assets/frontend/operations-console-hd.png?url";

// asset:../gfx/assets/frontend/house-crests-modern.png?url
var house_crests_modern_default = "../gfx/assets/frontend/house-crests-modern.png?url";

// web/src/ui/network.ts
var nextChoicePopupId = 0;
var node = (tag, className = "", text = "") => {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
};
function choice(label, options, value) {
  const select = node("select");
  select.setAttribute("aria-label", label);
  options.forEach(([id, text]) => {
    const option = node("option", "", text);
    option.value = id;
    select.append(option);
  });
  if (value !== void 0) select.value = value;
  return select;
}
function field(label, input) {
  const root = node("label", "network-field");
  root.append(node("span", "", label), input);
  return root;
}
var NetworkMenu = class {
  constructor(host) {
    this.host = host;
    this.root.hidden = true;
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-modal", "true");
    this.root.setAttribute("aria-label", "\u0421\u0435\u0442\u0435\u0432\u0430\u044F \u0438\u0433\u0440\u0430");
    this.dialog.style.setProperty("--network-console", `url("${operations_console_hd_default}")`);
    this.root.style.setProperty("--network-crests", `url("${house_crests_modern_default}")`);
    const header = node("header", "network-heading");
    header.append(node("div", "network-eyebrow", "ARRAKIS \xB7 \u041A\u041E\u041C\u0410\u041D\u0414\u041D\u042B\u0419 \u0426\u0415\u041D\u0422\u0420"), node("h1", "", "\u0421\u0415\u0422\u0415\u0412\u0410\u042F \u0418\u0413\u0420\u0410"), node("span", "network-capacity", "4 \xD7 4 / 8 \u041C\u0415\u0421\u0422"));
    const back = node("button", "network-back", "\u041D\u0430\u0437\u0430\u0434");
    back.type = "button";
    back.addEventListener("click", () => this.back());
    header.append(back);
    this.name.maxLength = 24;
    this.name.value = "\u041A\u043E\u043C\u0430\u043D\u0434\u0438\u0440";
    this.name.setAttribute("autocomplete", "nickname");
    this.roomName.maxLength = 48;
    this.roomName.value = "\u0411\u0438\u0442\u0432\u0430 \u0437\u0430 \u0410\u0440\u0440\u0430\u043A\u0438\u0441";
    this.roomField = field("\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u043E\u043C\u043D\u0430\u0442\u044B", this.roomName);
    this.roomField.hidden = true;
    this.roomPassword.type = "password";
    this.roomPassword.maxLength = 32;
    this.roomPassword.autocomplete = "new-password";
    for (const input of [this.name, this.roomName]) {
      input.readOnly = true;
      input.addEventListener("pointerdown", () => {
        input.readOnly = false;
      });
      input.addEventListener("blur", () => {
        input.readOnly = true;
      });
    }
    const connection = this.connection;
    connection.append(field("\u0418\u043C\u044F \u0438\u0433\u0440\u043E\u043A\u0430", this.name), field("\u0412\u0430\u0448 \u0434\u043E\u043C", this.playerHouse), this.roomField, this.status);
    this.status.setAttribute("role", "status");
    this.playerHouse.addEventListener("change", () => {
      if (this.slots[0]) this.slots[0].house.value = this.playerHouse.value;
    });
    const layout = node("div", "network-layout"), sidebar = node("aside", "network-map-panel");
    this.preview.alt = "\u0421\u0445\u0435\u043C\u0430 \u043A\u0430\u0440\u0442\u044B \u0438 \u0441\u0442\u0430\u0440\u0442\u043E\u0432\u044B\u0435 \u043F\u043E\u0437\u0438\u0446\u0438\u0438";
    this.preview.width = this.preview.height = 768;
    this.preview.tabIndex = 0;
    this.preview.draggable = false;
    this.preview.setAttribute("role", "button");
    this.preview.setAttribute("aria-label", "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u043A\u0430\u0440\u0442\u0443");
    this.preview.addEventListener("click", () => void this.openMap());
    this.map.addEventListener("change", () => this.updateMap());
    this.format.addEventListener("change", () => this.applyFormat());
    sidebar.append(field("\u0424\u043E\u0440\u043C\u0430\u0442 \u043C\u0430\u0442\u0447\u0430", this.format), field("\u0422\u0435\u0430\u0442\u0440 \u0432\u043E\u0435\u043D\u043D\u044B\u0445 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439", this.map), this.preview, this.description);
    this.random.type = "checkbox";
    this.random.checked = true;
    this.random.addEventListener("change", () => {
      if (this.random.checked) this.spawnAssignments.clear();
    });
    const random = node("label", "network-random");
    random.append(this.random, node("span", "", "\u0421\u043B\u0443\u0447\u0430\u0439\u043D\u044B\u0435 \u043F\u043E\u0437\u0438\u0446\u0438\u0438 \u0432\u043D\u0443\u0442\u0440\u0438 \u043A\u043E\u043C\u0430\u043D\u0434"));
    sidebar.append(random);
    const rules = node("div", "network-rules");
    rules.append(field("\u041A\u0440\u0435\u0434\u0438\u0442\u044B", this.resources), field("\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C", this.speed), field("\u041F\u0430\u0440\u043E\u043B\u044C \u043A\u043E\u043C\u043D\u0430\u0442\u044B", this.roomPassword));
    sidebar.append(rules);
    sidebar.append(node("p", "network-friendly-fire", "\u041E\u0433\u043E\u043D\u044C \u043F\u043E \u0441\u043E\u044E\u0437\u043D\u0438\u043A\u0430\u043C \u0437\u0430\u043F\u0440\u0435\u0449\u0451\u043D"));
    const teams = node("div", "network-teams");
    for (let team = 0; team < 2; team++) {
      const section = node("section", `network-team team-${team}`);
      section.append(node("h2", "", team ? "\u041A\u041E\u041C\u0410\u041D\u0414\u0410 2 \xB7 \u041F\u0420\u041E\u0422\u0418\u0412\u041D\u0418\u041A\u0418" : "\u041A\u041E\u041C\u0410\u041D\u0414\u0410 1 \xB7 \u0421\u041E\u042E\u0417\u041D\u0418\u041A\u0418"));
      const labels = node("div", "network-slot-labels");
      ["\u041C\u0435\u0441\u0442\u043E", "\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A", "\u0414\u043E\u043C", "\u0418\u0418", ""].forEach((label) => labels.append(node("span", "", label)));
      section.append(labels);
      const add = node("button", "network-add", "+ \u0418\u0433\u0440\u043E\u043A");
      add.type = "button";
      add.setAttribute("aria-label", `\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0438\u0433\u0440\u043E\u043A\u0430 \u0432 \u043A\u043E\u043C\u0430\u043D\u0434\u0443 ${team + 1}`);
      for (let index = 0; index < 4; index++) {
        const id = team * 4 + index, row = node("div", "network-slot");
        const controller = choice(`\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A ${id + 1}`, [["open", "\u041E\u0442\u043A\u0440\u044B\u0442\u043E"], ["human", "\u0418\u0433\u0440\u043E\u043A"], ["ai", team ? "\u0418\u0418 \xB7 \u0432\u0440\u0430\u0433" : "\u0418\u0418 \xB7 \u0441\u043E\u044E\u0437\u043D\u0438\u043A"], ["closed", "\u0417\u0430\u043A\u0440\u044B\u0442\u043E"]], id === 0 ? "human" : team && index === 0 ? "ai" : "open");
        const house = choice(`\u0414\u043E\u043C \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430 ${id + 1}`, [["random", "\u0421\u043B\u0443\u0447\u0430\u0439\u043D\u044B\u0439"], ["A", "\u0410\u0442\u0440\u0435\u0439\u0434\u0435\u0441\u044B"], ["H", "\u0425\u0430\u0440\u043A\u043E\u043D\u043D\u0435\u043D\u044B"], ["O", "\u041E\u0440\u0434\u043E\u0441\u044B"]]);
        if (id === 0) {
          house.options[0].remove();
          house.value = this.playerHouse.value;
          house.addEventListener("change", () => {
            this.playerHouse.value = house.value;
          });
        }
        const difficulty = choice(`\u0421\u043B\u043E\u0436\u043D\u043E\u0441\u0442\u044C \u0418\u0418 ${id + 1}`, [["easy", "\u041B\u0435\u0433\u043A\u043E"], ["normal", "\u041D\u043E\u0440\u043C\u0430\u043B\u044C\u043D\u043E"], ["hard", "\u0421\u043B\u043E\u0436\u043D\u043E"]], "normal");
        const update = () => {
          difficulty.disabled = controller.value !== "ai";
          house.disabled = controller.value === "closed";
          row.classList.toggle("slot-closed", controller.value === "closed");
        };
        controller.addEventListener("change", update);
        update();
        const remove = node("button", "network-remove", "\xD7");
        remove.type = "button";
        remove.setAttribute("aria-label", `\u0423\u0431\u0440\u0430\u0442\u044C \u0438\u0433\u0440\u043E\u043A\u0430 ${id + 1}`);
        remove.disabled = id === 0;
        row.append(node("span", "network-slot-number", String(id + 1).padStart(2, "0")), controller, house, difficulty, remove);
        section.append(row);
        const slot = { controller, house, difficulty, row, active: index === 0 };
        this.slots.push(slot);
        row.hidden = !slot.active;
        remove.addEventListener("click", () => {
          slot.active = false;
          row.hidden = true;
          for (const [point, player] of this.spawnAssignments) if (player === id) this.spawnAssignments.delete(point);
          add.disabled = false;
          add.focus();
        });
      }
      add.addEventListener("click", () => {
        const available = this.slots.slice(team * 4, team * 4 + Number(this.format.value)).find((slot) => !slot.active);
        if (!available) return;
        available.active = true;
        available.row.hidden = false;
        available.controller.value = "human";
        available.controller.dispatchEvent(new Event("change", { bubbles: true }));
        available.controller.focus();
        add.disabled = this.slots.slice(team * 4, team * 4 + Number(this.format.value)).every((slot) => slot.active);
      });
      section.append(add);
      teams.append(section);
    }
    const roster = node("div", "network-roster"), matchRules = node("div", "network-match-rules");
    matchRules.append(random, rules, sidebar.querySelector(".network-friendly-fire"), node("p", "network-friendly-fire", "\u041C\u0435\u0441\u0442\u043E\u0440\u043E\u0436\u0434\u0435\u043D\u0438\u044F \u0441\u043F\u0430\u0439\u0441\u0430 \u043D\u0435 \u0438\u0441\u0442\u043E\u0449\u0430\u044E\u0442\u0441\u044F"));
    roster.append(teams, matchRules);
    layout.append(sidebar, roster);
    const footer = node("footer", "network-footer");
    const note = node("div");
    note.append(node("strong", "", "\u041F\u0415\u0421\u041E\u041A. \u0421\u041F\u0410\u0419\u0421. \u041F\u0420\u0415\u0412\u041E\u0421\u0425\u041E\u0414\u0421\u0422\u0412\u041E."), node("p", "", "\u2191 \u2193 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 \xB7 \u2190 \u2192 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \xB7 A / Enter \u0432\u044B\u0431\u043E\u0440 \xB7 B / Esc \u043D\u0430\u0437\u0430\u0434"));
    const actions = node("div", "network-actions");
    for (const label of ["\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0438\u0433\u0440\u0443", "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C\u0441\u044F"]) {
      const button = node("button", "", label);
      button.type = "button";
      button.disabled = true;
      button.title = "\u0421\u0435\u0442\u0435\u0432\u043E\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0435\u0449\u0451 \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043E";
      actions.append(button);
    }
    note.append(this.observerBadge);
    footer.append(note, actions);
    this.lobby.append(layout, footer);
    this.lobby.hidden = true;
    const roomsHeading = node("div", "network-rooms-heading");
    roomsHeading.append(node("h2", "", "\u041E\u0422\u041A\u0420\u042B\u0422\u042B\u0415 \u041A\u041E\u041C\u041D\u0410\u0422\u042B"), node("span", "network-room-preview-label", "\u041F\u0420\u0415\u0414\u041F\u0420\u041E\u0421\u041C\u041E\u0422\u0420"));
    const refresh = node("button", "", "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C");
    refresh.type = "button";
    refresh.addEventListener("click", () => {
      this.host.refreshRooms?.();
      this.status.textContent = "\u0421\u0435\u0440\u0432\u0435\u0440 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D \xB7 \u043C\u0430\u043A\u0435\u0442 \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0430";
    });
    const create = node("button", "network-create", "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043A\u043E\u043C\u043D\u0430\u0442\u0443");
    create.type = "button";
    create.addEventListener("click", () => this.openCreateRoom());
    roomsHeading.append(refresh, create);
    const columns = node("div", "network-room-columns");
    ["\u041A\u043E\u043C\u043D\u0430\u0442\u0430", "\u041A\u0430\u0440\u0442\u0430", "\u0418\u0433\u0440\u043E\u043A\u0438", "\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435"].forEach((text) => columns.append(node("span", "", text)));
    const roomFooter = node("div", "network-rooms-footer");
    roomFooter.append(node("p", "", "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043A\u043E\u043C\u043D\u0430\u0442\u0443 \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 A / Enter, \u0447\u0442\u043E\u0431\u044B \u0432\u043E\u0439\u0442\u0438. \u2191 \u2193 \u0432\u044B\u0431\u043E\u0440 \xB7 B / Esc \u043D\u0430\u0437\u0430\u0434"));
    const join = node("button", "network-join", "\u0412\u043E\u0439\u0442\u0438 \u0432 \u043A\u043E\u043C\u043D\u0430\u0442\u0443");
    join.type = "button";
    join.addEventListener("click", () => this.joinSelected());
    roomFooter.append(join);
    const observe = node("button", "network-observe", "\u0412\u043E\u0439\u0442\u0438 \u043D\u0430\u0431\u043B\u044E\u0434\u0430\u0442\u0435\u043B\u0435\u043C");
    observe.type = "button";
    observe.addEventListener("click", () => this.joinSelected(true));
    roomFooter.append(observe);
    this.roomSection.append(roomsHeading, columns, this.roomList, roomFooter);
    this.dialog.append(header, connection, this.roomSection, this.lobby);
    this.root.append(this.dialog);
    this.setRooms([
      { id: "preview-1", name: "\u0411\u0438\u0442\u0432\u0430 \u0437\u0430 \u0441\u043F\u0430\u0439\u0441", map: "rift-valley", players: 3, capacity: 8, state: "waiting" },
      { id: "preview-2", name: "\u0411\u043E\u043B\u044C\u0448\u0430\u044F \u0432\u043E\u0439\u043D\u0430 \xB7 4 \xD7 4", map: "imperial-frontier", players: 8, capacity: 8, state: "playing" },
      { id: "preview-3", name: "\u0421\u043E\u0432\u043C\u0435\u0441\u0442\u043D\u0430\u044F \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u044F", map: "worm-ring", players: 4, capacity: 8, state: "waiting" }
    ], true);
    this.viewer.hidden = true;
    this.viewer.setAttribute("role", "dialog");
    this.viewer.setAttribute("aria-label", "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 \u043A\u0430\u0440\u0442\u044B");
    this.viewer.setAttribute("aria-modal", "true");
    const viewerToolbar = node("header", "network-map-toolbar");
    this.viewerStage.append(this.viewerImage, this.markers);
    this.viewerViewport.append(this.viewerStage);
    this.viewerImage.alt = "\u0411\u043E\u043B\u044C\u0448\u0430\u044F \u043A\u0430\u0440\u0442\u0430 \u0441\u043E \u0441\u0442\u0430\u0440\u0442\u043E\u0432\u044B\u043C\u0438 \u043F\u043E\u0437\u0438\u0446\u0438\u044F\u043C\u0438 \u0434\u0432\u0443\u0445 \u043A\u043E\u043C\u0430\u043D\u0434";
    this.viewerImage.draggable = false;
    this.viewer.addEventListener("dragstart", (event) => event.preventDefault());
    viewerToolbar.append(this.viewerTitle);
    for (const [label, action] of [["\u2212", () => this.zoomMap(-0.5)], ["+", () => this.zoomMap(0.5)], ["\u0417\u0430\u043A\u0440\u044B\u0442\u044C", () => this.closeMap()]]) {
      const button = node("button", "", label);
      button.type = "button";
      button.setAttribute("aria-label", label === "\u2212" ? "\u0423\u043C\u0435\u043D\u044C\u0448\u0438\u0442\u044C \u043A\u0430\u0440\u0442\u0443" : label === "+" ? "\u0423\u0432\u0435\u043B\u0438\u0447\u0438\u0442\u044C \u043A\u0430\u0440\u0442\u0443" : label);
      button.addEventListener("click", action);
      viewerToolbar.append(button);
    }
    this.viewer.append(viewerToolbar, this.viewerViewport, this.spawnMessage);
    this.root.append(this.viewer);
    this.passwordDialog.hidden = true;
    this.passwordDialog.setAttribute("role", "dialog");
    this.passwordDialog.setAttribute("aria-modal", "true");
    this.passwordDialog.setAttribute("aria-label", "\u041F\u0430\u0440\u043E\u043B\u044C \u043A\u043E\u043C\u043D\u0430\u0442\u044B");
    this.passwordInput.type = "password";
    this.passwordInput.maxLength = 32;
    this.passwordInput.autocomplete = "current-password";
    this.passwordInput.setAttribute("aria-label", "\u041F\u0430\u0440\u043E\u043B\u044C \u043A\u043E\u043C\u043D\u0430\u0442\u044B");
    const passwordActions = node("div", "network-actions"), passwordEnter = node("button", "", "\u0412\u043E\u0439\u0442\u0438"), passwordCancel = node("button", "", "\u041E\u0442\u043C\u0435\u043D\u0430");
    passwordEnter.type = passwordCancel.type = "button";
    passwordEnter.addEventListener("click", () => this.confirmRoomPassword());
    passwordCancel.addEventListener("click", () => this.cancelRoomPassword());
    passwordActions.append(passwordEnter, passwordCancel);
    this.createName.maxLength = 48;
    this.createNameField.hidden = true;
    this.passwordMessage.setAttribute("role", "status");
    this.passwordDialog.append(node("h2", "", "\u041F\u0410\u0420\u041E\u041B\u042C \u041A\u041E\u041C\u041D\u0410\u0422\u042B"), this.passwordMessage, this.createNameField, field("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043F\u0430\u0440\u043E\u043B\u044C", this.passwordInput), passwordActions);
    this.root.append(this.passwordDialog);
    this.choicePopup.id = `network-choice-${++nextChoicePopupId}`;
    this.choicePopup.hidden = true;
    this.choicePopup.setAttribute("role", "listbox");
    this.root.append(this.choicePopup);
    this.root.querySelectorAll("select").forEach((select) => {
      select.setAttribute("aria-controls", this.choicePopup.id);
      select.setAttribute("aria-expanded", "false");
      select.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        if (select.disabled) return;
        if (this.choiceSelect === select) this.closeChoice();
        else this.openChoice(select);
      });
      select.addEventListener("mousedown", (event) => event.preventDefault());
      select.addEventListener("click", (event) => {
        event.preventDefault();
        if (event.detail === 0 && !this.choiceSelect && !select.disabled) this.openChoice(select);
      });
    });
    this.root.addEventListener("pointerdown", (event) => {
      if (this.choiceSelect && !this.choicePopup.contains(event.target) && event.target !== this.choiceSelect) this.closeChoice(false);
    }, { capture: true });
    window.addEventListener("pointerdown", (event) => {
      if (this.choiceSelect && !this.root.contains(event.target)) this.closeChoice(false);
    }, { capture: true });
    this.root.addEventListener("scroll", (event) => {
      if (this.choiceSelect && event.target !== this.choicePopup && !this.choicePopup.contains(event.target)) this.closeChoice(false);
    }, { capture: true });
    this.root.addEventListener("focusin", () => {
      if (this.isOpen) this.host.ui?.(25);
    });
    this.root.addEventListener("change", () => this.host.ui?.(40));
    this.root.addEventListener("click", (event) => {
      if (this.isOpen && event.target.closest("button")) this.host.ui?.(40);
    });
    this.root.addEventListener("keydown", (event) => {
      if (event.code === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (this.choiceSelect) this.closeChoice();
        else if (!this.passwordDialog.hidden) this.cancelRoomPassword();
        else if (!this.viewer.hidden) this.closeMap();
        else this.back();
        return;
      }
      if (event.code === "F4" && event.target.tagName === "SELECT") {
        event.preventDefault();
        event.stopPropagation();
        this.openChoice(event.target);
        return;
      }
      if ((event.code === "Enter" || event.code === "NumpadEnter") && (event.target === this.passwordInput || event.target === this.createName)) {
        event.preventDefault();
        event.stopPropagation();
        this.confirmRoomPassword();
        return;
      }
      const arrows = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", Enter: "a", NumpadEnter: "a", Space: "a", Digit1: "a", Numpad1: "a", Digit2: "b", Numpad2: "b", Digit3: "c", Numpad3: "c" };
      const button = arrows[event.code];
      if (button) {
        const target = event.target;
        if (target.tagName === "INPUT" && target.type !== "checkbox" && !target.readOnly && /^Digit|^Numpad|^Space/.test(event.code)) return;
        if ((event.code === "ArrowLeft" || event.code === "ArrowRight") && target.tagName === "INPUT" && target.type !== "checkbox" && target.type !== "number" && !target.readOnly) return;
        event.preventDefault();
        event.stopPropagation();
        this.handlePad(button);
        return;
      }
      if (event.code === "Tab") {
        this.closeChoice(false);
        const focusable = this.focusable(), first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }, { capture: true });
    window.addEventListener("resize", () => {
      this.closeChoice(false);
      if (!this.viewer.hidden) this.fitMap();
    });
  }
  host;
  root = node("section", "settings network-menu");
  dialog = node("div", "network-console");
  connection = node("div", "network-connection");
  name = node("input");
  roomName = node("input");
  roomPassword = node("input");
  passwordDialog = node("section", "network-password-dialog");
  passwordInput = node("input");
  passwordMessage = node("p");
  pendingJoin = null;
  creatingRoom = false;
  createName = node("input");
  createNameField = field("\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u043E\u043C\u043D\u0430\u0442\u044B", this.createName);
  playerHouse = choice("\u0412\u0430\u0448 \u0434\u043E\u043C", [["A", "\u0410\u0442\u0440\u0435\u0439\u0434\u0435\u0441\u044B"], ["H", "\u0425\u0430\u0440\u043A\u043E\u043D\u043D\u0435\u043D\u044B"], ["O", "\u041E\u0440\u0434\u043E\u0441\u044B"]], "A");
  roomSection = node("section", "network-room-browser");
  roomList = node("div", "network-room-list");
  lobby = node("div", "network-lobby");
  roomField = null;
  rooms = [];
  selectedRoom = "";
  mode = "rooms";
  role = "player";
  observerBadge = node("p", "network-observers");
  observedRoom = null;
  map = choice("\u041A\u0430\u0440\u0442\u0430", []);
  preview = node("img");
  format = choice("\u0424\u043E\u0440\u043C\u0430\u0442 \u043C\u0430\u0442\u0447\u0430", [["1", "1 \u043D\u0430 1"], ["2", "2 \u043D\u0430 2"], ["3", "3 \u043D\u0430 3"], ["4", "4 \u043D\u0430 4"]], "4");
  description = node("p", "network-map-description");
  random = node("input");
  seed = Math.floor(Math.random() * 4294967295) >>> 0;
  resources = choice("\u041D\u0430\u0447\u0430\u043B\u044C\u043D\u044B\u0435 \u043A\u0440\u0435\u0434\u0438\u0442\u044B", [["2000", "2 000"], ["5000", "5 000"], ["10000", "10 000"], ["20000", "20 000"], ["25000", "25 000"], ["50000", "50 000"]], "5000");
  speed = choice("\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C \u0438\u0433\u0440\u044B", [["normal", "\u041D\u043E\u0440\u043C\u0430\u043B\u044C\u043D\u043E"], ["fast", "\u0411\u044B\u0441\u0442\u0440\u043E"]], "normal");
  slots = [];
  status = node("p", "network-status", "\u0421\u0435\u0440\u0432\u0435\u0440 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D");
  mapList = [];
  previousFocus = null;
  viewer = node("section", "network-map-viewer");
  viewerImage = node("img");
  viewerTitle = node("h2");
  viewerZoom = 1;
  viewerStage = node("div", "network-map-stage");
  viewerViewport = node("div", "network-map-viewport");
  markers = node("div", "network-spawn-markers");
  choicePopup = node("div", "network-choice-popup");
  choiceSelect = null;
  choiceCursor = 0;
  spawnMessage = node("p", "network-map-legend");
  spawnPoints = [];
  spawnAssignments = /* @__PURE__ */ new Map();
  spawnMap = "";
  viewerBaseSize = 512;
  get isOpen() {
    return !this.root.hidden;
  }
  async open() {
    this.previousFocus = document.activeElement;
    this.root.hidden = false;
    this.showRooms();
    this.host.ui?.(44);
    this.root.querySelector(".network-create")?.focus();
    try {
      const previousMap = this.map.value;
      const response = await fetch("./maps/network/catalog.json", { cache: "no-store" });
      if (!response.ok) throw Error("catalog");
      this.mapList = await response.json();
      this.applyFormat(previousMap);
      this.renderRooms();
    } catch {
      this.description.textContent = "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u043A\u0430\u0440\u0442. \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u0432\u0445\u043E\u0434 \u0432 \u043B\u043E\u0431\u0431\u0438.";
    }
  }
  close() {
    this.closeChoice(false);
    if (this.observedRoom) this.host.leaveObservation?.();
    this.observedRoom = null;
    this.root.hidden = true;
    this.viewer.hidden = true;
    this.passwordDialog.hidden = true;
    this.passwordInput.value = "";
    this.pendingJoin = null;
    this.dialog.inert = false;
  }
  async openMap() {
    const map = this.mapList.find((item) => item.id === this.map.value);
    if (!map) return;
    this.viewerTitle.textContent = `${map.name} \xB7 ${map.teamSize} \u043D\u0430 ${map.teamSize} \xB7 ${map.width} \xD7 ${map.height}`;
    this.viewerImage.src = map.preview;
    this.viewerZoom = 1;
    this.viewer.hidden = false;
    this.dialog.inert = true;
    this.fitMap();
    this.viewerViewport.scrollTop = this.viewerViewport.scrollLeft = 0;
    this.host.ui?.(40);
    this.focusable()[0]?.focus();
    try {
      const response = await fetch(map.data, { cache: "no-store" });
      if (!response.ok) throw Error("map");
      const data = await response.json();
      if (this.viewer.hidden || this.map.value !== map.id) return;
      if (this.spawnMap !== map.id) {
        this.spawnMap = map.id;
        this.spawnAssignments.clear();
      }
      this.spawnPoints = data.spawns;
      this.drawSpawns();
    } catch {
      this.spawnMessage.textContent = "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0442\u043E\u0447\u043A\u0438 \u0432\u044B\u0441\u0430\u0434\u043A\u0438.";
    }
  }
  fitMap() {
    this.viewerBaseSize = Math.max(1, Math.min(this.viewerViewport.clientWidth, this.viewerViewport.clientHeight) - 2);
    this.viewerStage.style.width = `${Math.floor(this.viewerBaseSize * this.viewerZoom)}px`;
    this.viewerViewport.style.overflow = this.viewerZoom === 1 ? "hidden" : "auto";
    if (this.viewerZoom === 1) this.viewerViewport.scrollTop = this.viewerViewport.scrollLeft = 0;
  }
  zoomMap(delta) {
    this.viewerZoom = Math.max(1, Math.min(3, this.viewerZoom + delta));
    this.fitMap();
  }
  playerLabel(id) {
    return id === 0 && this.role === "player" ? this.name.value.trim() || "\u0412\u044B" : (this.slots[id]?.controller.value === "ai" ? "\u0418\u0418 " : "\u0418\u0433\u0440\u043E\u043A ") + (id + 1);
  }
  drawSpawns() {
    const map = this.mapList.find((item) => item.id === this.map.value);
    if (!map) return;
    this.markers.replaceChildren();
    const selected = 0;
    for (const point of this.spawnPoints) {
      const occupant = this.spawnAssignments.get(point.id), own = occupant === 0 && this.role === "player", button = node("button", `network-spawn-point spawn-team-${point.team}${occupant !== void 0 ? " occupied" : ""}${own ? " spawn-self" : ""}`);
      button.type = "button";
      button.style.left = `${(point.x + 0.5) / map.width * 100}%`;
      button.style.top = `${(point.y + 0.5) / map.height * 100}%`;
      button.disabled = this.role === "observer" || point.team !== 0;
      button.dataset.point = String(point.id);
      button.setAttribute("aria-label", `\u0422\u043E\u0447\u043A\u0430 ${point.id + 1}: ${occupant === void 0 ? "\u0441\u0432\u043E\u0431\u043E\u0434\u043D\u0430" : this.playerLabel(occupant)}`);
      button.append(node("span", "", String(point.id + 1)));
      if (occupant !== void 0) {
        const house = this.slots[occupant]?.house.value ?? "random", houseName = { A: "\u0410\u0442\u0440\u0435\u0439\u0434\u0435\u0441\u044B", H: "\u0425\u0430\u0440\u043A\u043E\u043D\u043D\u0435\u043D\u044B", O: "\u041E\u0440\u0434\u043E\u0441\u044B" }[house] ?? "\u0421\u043B\u0443\u0447\u0430\u0439\u043D\u044B\u0439 \u0434\u043E\u043C";
        const flag = node("span", `network-house-flag flag-house-${house}`);
        flag.setAttribute("aria-hidden", "true");
        flag.append(node("span", `network-house-crest crest-${house}`, house === "random" ? "?" : ""));
        button.append(flag, node("strong", "network-spawn-owner", `${this.playerLabel(occupant)} \xB7 ${houseName}${own ? " \xB7 \u0412\u044B" : point.team ? " \xB7 \u0432\u0440\u0430\u0433" : " \xB7 \u0441\u043E\u044E\u0437\u043D\u0438\u043A"}`));
        button.setAttribute("aria-label", `\u0422\u043E\u0447\u043A\u0430 ${point.id + 1}: ${this.playerLabel(occupant)}, ${houseName}${own ? ", \u0432\u0430\u0448\u0430 \u0432\u044B\u0441\u0430\u0434\u043A\u0430" : point.team ? ", \u043F\u0440\u043E\u0442\u0438\u0432\u043D\u0438\u043A" : ", \u0441\u043E\u044E\u0437\u043D\u0438\u043A"}`);
      }
      button.addEventListener("click", () => {
        if (this.role === "observer") {
          this.spawnMessage.textContent = "\u0420\u0435\u0436\u0438\u043C \u043D\u0430\u0431\u043B\u044E\u0434\u0430\u0442\u0435\u043B\u044F: \u0442\u043E\u0447\u043A\u0438 \u0432\u044B\u0441\u0430\u0434\u043A\u0438 \u0432\u044B\u0431\u0438\u0440\u0430\u044E\u0442 \u0438\u0433\u0440\u043E\u043A\u0438.";
          return;
        }
        if (occupant !== void 0 && occupant !== selected) {
          this.spawnMessage.textContent = `\u0422\u043E\u0447\u043A\u0430 ${point.id + 1} \u0437\u0430\u043D\u044F\u0442\u0430: ${this.playerLabel(occupant)}.`;
          this.host.ui?.(26);
          return;
        }
        if (point.team !== Math.floor(selected / 4)) {
          this.spawnMessage.textContent = "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u043E\u0447\u043A\u0443 \u043D\u0430 \u0441\u0442\u043E\u0440\u043E\u043D\u0435 \u0441\u0432\u043E\u0435\u0439 \u043A\u043E\u043C\u0430\u043D\u0434\u044B.";
          this.host.ui?.(26);
          return;
        }
        for (const [start, player] of this.spawnAssignments) if (player === selected) this.spawnAssignments.delete(start);
        if (occupant !== selected) this.spawnAssignments.set(point.id, selected);
        this.random.checked = false;
        this.drawSpawns();
        this.markers.querySelector(`[data-point="${point.id}"]`)?.focus();
        this.host.ui?.(40);
      });
      this.markers.append(button);
    }
    this.spawnMessage.textContent = this.role === "observer" ? "\u041D\u0430\u0431\u043B\u044E\u0434\u0435\u043D\u0438\u0435: \u0442\u043E\u0447\u043A\u0438 \u0432\u044B\u0441\u0430\u0434\u043A\u0438 \u0432\u044B\u0431\u0438\u0440\u0430\u044E\u0442 \u0438\u0433\u0440\u043E\u043A\u0438." : `\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u0432\u043E\u044E \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u0443\u044E \u0442\u043E\u0447\u043A\u0443 \u043D\u0430 \u0441\u0438\u043D\u0435\u0439 \u0441\u0442\u043E\u0440\u043E\u043D\u0435. \u041A\u0440\u0430\u0441\u043D\u044B\u0435 \u0442\u043E\u0447\u043A\u0438 \u2014 \u043F\u0440\u043E\u0442\u0438\u0432\u043D\u0438\u043A\u0438. \u0417\u0430\u043D\u044F\u0442\u043E: ${this.spawnAssignments.size} / ${Number(this.format.value) * 2}.`;
    this.fitMap();
  }
  closeMap() {
    this.viewer.hidden = true;
    this.dialog.inert = false;
    this.preview.focus();
    this.host.ui?.(40);
  }
  back() {
    if (this.mode === "lobby") {
      this.showRooms();
      this.focusable().find((element) => element.classList.contains("network-room"))?.focus();
      this.host.ui?.(40);
      return;
    }
    this.close();
    this.host.ui?.();
    this.host.back();
    this.previousFocus?.focus();
  }
  showRooms() {
    if (this.observedRoom) this.host.leaveObservation?.();
    this.observedRoom = null;
    this.role = "player";
    this.playerHouse.disabled = false;
    this.roomName.disabled = false;
    this.mode = "rooms";
    this.lobby.hidden = true;
    this.roomSection.hidden = false;
    this.connection.hidden = true;
    const capacity = this.root.querySelector(".network-capacity");
    if (capacity) capacity.hidden = true;
    if (this.roomField) this.roomField.hidden = true;
    this.status.textContent = "\u0415\u0434\u0438\u043D\u044B\u0439 \u0441\u0435\u0440\u0432\u0435\u0440 \xB7 \u043C\u0430\u043A\u0435\u0442 \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0430";
    this.updateRoomActions();
  }
  showLobby(room, role = "player") {
    this.mode = "lobby";
    this.lobby.hidden = false;
    this.roomSection.hidden = true;
    this.connection.hidden = false;
    const capacity = this.root.querySelector(".network-capacity");
    if (capacity) capacity.hidden = false;
    if (this.roomField) this.roomField.hidden = false;
    this.role = role;
    const observing = role === "observer";
    this.playerHouse.disabled = observing;
    this.roomName.disabled = observing;
    this.slots[0].active = !observing;
    this.slots[0].row.hidden = observing;
    if (room) {
      const map = this.mapList.find((map2) => map2.id === room.map);
      if (map) {
        this.format.value = String(map.teamSize);
        this.applyFormat(room.map);
      }
    }
    if (observing) {
      for (const [point, player] of this.spawnAssignments) if (player === 0) this.spawnAssignments.delete(point);
    }
    for (const control of [this.format, this.map, this.random, this.resources, this.speed, this.roomPassword]) control.disabled = observing || !!room;
    this.slots.forEach((slot, id) => {
      slot.controller.disabled = observing;
      slot.house.disabled = observing || slot.controller.value === "closed";
      slot.difficulty.disabled = observing || slot.controller.value !== "ai";
      const remove = slot.row.querySelector("button");
      if (remove) remove.disabled = observing || id === 0;
    });
    this.lobby.querySelectorAll(".network-add").forEach((button, index) => button.disabled = observing || this.slots.slice(index * 4, index * 4 + Number(this.format.value)).every((slot) => slot.active));
    this.observerBadge.hidden = !observing;
    this.observerBadge.textContent = observing ? `\u041D\u0410\u0411\u041B\u042E\u0414\u0410\u0422\u0415\u041B\u042C \xB7 ${this.name.value.trim() || "\u0412\u044B"} \xB7 \u0434\u043E \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u044F \u043C\u0430\u0442\u0447\u0430 \xB7 \u0438\u0433\u0440\u043E\u0432\u043E\u0435 \u043C\u0435\u0441\u0442\u043E \u043D\u0435 \u0437\u0430\u043D\u044F\u0442\u043E` : "";
    if (room) {
      this.map.value = room.map;
      this.roomName.value = room.name;
      this.updateMap();
    }
    this.status.textContent = observing ? "\u041D\u0430\u0431\u043B\u044E\u0434\u0435\u043D\u0438\u0435 \xB7 \u043C\u0430\u043A\u0435\u0442 \u043A\u043E\u043C\u043D\u0430\u0442\u044B" : room ? "\u041F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 \u043A\u043E\u043C\u043D\u0430\u0442\u044B \xB7 \u0441\u0435\u0440\u0432\u0435\u0440 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D" : "\u041D\u043E\u0432\u0430\u044F \u043A\u043E\u043C\u043D\u0430\u0442\u0430 \xB7 \u0441\u0435\u0440\u0432\u0435\u0440 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D";
    if (observing) this.preview.focus();
    else this.roomName.focus();
  }
  setRooms(rooms, preview = false) {
    this.rooms = rooms;
    if (!rooms.some((room) => room.id === this.selectedRoom)) this.selectedRoom = rooms[0]?.id ?? "";
    if (this.observedRoom && !rooms.some((room) => room.id === this.observedRoom && room.state === "playing")) {
      this.viewer.hidden = true;
      this.dialog.inert = false;
      this.showRooms();
      this.status.textContent = "\u041C\u0430\u0442\u0447 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D. \u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 \u0437\u0430\u043A\u0440\u044B\u0442.";
    }
    const label = this.root.querySelector(".network-room-preview-label");
    if (label) label.textContent = preview ? "\u041F\u0420\u0415\u0414\u041F\u0420\u041E\u0421\u041C\u041E\u0422\u0420" : "\u0415\u0414\u0418\u041D\u042B\u0419 \u0421\u0415\u0420\u0412\u0415\u0420";
    this.renderRooms();
  }
  renderRooms() {
    this.roomList.replaceChildren();
    if (!this.rooms.length) {
      this.roomList.append(node("p", "network-empty-rooms", "\u041E\u0442\u043A\u0440\u044B\u0442\u044B\u0445 \u043A\u043E\u043C\u043D\u0430\u0442 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442. \u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u0441\u0432\u043E\u044E."));
      this.updateRoomActions();
      return;
    }
    for (const room of this.rooms) {
      const button = node("button", "network-room");
      button.type = "button";
      button.dataset.roomId = room.id;
      button.setAttribute("aria-pressed", String(this.selectedRoom === room.id));
      const map = this.mapList.find((item) => item.id === room.map);
      button.append(node("strong", "", room.name), node("span", "", `${map?.name ?? "\u0410\u0440\u0440\u0430\u043A\u0438\u0441"} \xB7 ${room.capacity / 2} \xD7 ${room.capacity / 2}`), node("span", "", `${room.players} / ${room.capacity}`), node("span", "", room.state === "waiting" ? "\u041E\u0436\u0438\u0434\u0430\u043D\u0438\u0435" : room.state === "playing" ? "\u0418\u0434\u0451\u0442 \u0438\u0433\u0440\u0430" : "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430"));
      button.addEventListener("click", () => {
        this.selectedRoom = room.id;
        this.roomList.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
        this.updateRoomActions();
      });
      button.addEventListener("dblclick", () => {
        this.selectedRoom = room.id;
        this.joinSelected();
      });
      this.roomList.append(button);
    }
    this.updateRoomActions();
  }
  updateRoomActions() {
    const room = this.rooms.find((item) => item.id === this.selectedRoom), join = this.root.querySelector(".network-join"), observe = this.root.querySelector(".network-observe");
    if (join) join.disabled = !room || room.state !== "waiting" || room.players >= room.capacity;
    if (observe) {
      observe.disabled = !room || room.state !== "playing";
      observe.title = "\u041D\u0430\u0431\u043B\u044E\u0434\u0435\u043D\u0438\u0435 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043E \u0432\u0440\u0435\u043C\u044F \u043C\u0430\u0442\u0447\u0430";
    }
  }
  joinSelected(observer = false, password) {
    const room = this.rooms.find((item) => item.id === this.selectedRoom);
    if (!room || (observer ? room.state !== "playing" : room.state !== "waiting" || room.players >= room.capacity)) return;
    if (room.passwordRequired !== false && password === void 0) {
      this.creatingRoom = false;
      this.createNameField.hidden = true;
      this.passwordInput.autocomplete = "current-password";
      this.passwordDialog.querySelector("h2").textContent = "\u041F\u0410\u0420\u041E\u041B\u042C \u041A\u041E\u041C\u041D\u0410\u0422\u042B";
      this.passwordDialog.querySelector("button").textContent = "\u0412\u043E\u0439\u0442\u0438";
      this.passwordDialog.querySelector("button").classList.remove("network-create");
      this.pendingJoin = { id: room.id, observer };
      this.passwordDialog.hidden = false;
      this.dialog.inert = true;
      this.passwordInput.value = "";
      this.passwordInput.readOnly = false;
      this.passwordMessage.textContent = room.name;
      this.passwordInput.focus();
      return;
    }
    const role = observer ? "observer" : "player";
    this.role = role;
    this.observedRoom = observer ? room.id : null;
    if (this.host.joinRoom) this.host.joinRoom(room.id, role, password);
    else this.showLobby(room, role);
  }
  openCreateRoom() {
    this.creatingRoom = true;
    this.pendingJoin = null;
    this.createNameField.hidden = false;
    this.createName.value = this.roomName.value;
    this.createName.readOnly = false;
    this.passwordInput.value = "";
    this.passwordInput.readOnly = false;
    this.passwordInput.autocomplete = "new-password";
    this.passwordDialog.querySelector("h2").textContent = "\u0421\u041E\u0417\u0414\u0410\u0422\u042C \u041A\u041E\u041C\u041D\u0410\u0422\u0423";
    this.passwordDialog.querySelector("button").textContent = "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043A\u043E\u043C\u043D\u0430\u0442\u0443";
    this.passwordDialog.querySelector("button").classList.add("network-create");
    this.passwordMessage.textContent = "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438 \u043F\u0430\u0440\u043E\u043B\u044C \u0434\u043B\u044F \u0432\u0445\u043E\u0434\u0430 \u0438\u0433\u0440\u043E\u043A\u043E\u0432 \u0438 \u043D\u0430\u0431\u043B\u044E\u0434\u0430\u0442\u0435\u043B\u0435\u0439.";
    this.passwordDialog.hidden = false;
    this.dialog.inert = true;
    this.createName.focus();
    this.createName.select();
  }
  confirmRoomPassword() {
    const pending = this.pendingJoin;
    if (!pending && !this.creatingRoom) return;
    if (this.creatingRoom && !this.createName.value.trim()) {
      this.passwordMessage.textContent = "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u043E\u043C\u043D\u0430\u0442\u044B.";
      this.createName.focus();
      return;
    }
    if (!this.passwordInput.value) {
      this.passwordMessage.textContent = "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043F\u0430\u0440\u043E\u043B\u044C \u043A\u043E\u043C\u043D\u0430\u0442\u044B.";
      this.passwordInput.focus();
      this.host.ui?.(26);
      return;
    }
    const password = this.passwordInput.value;
    this.passwordDialog.hidden = true;
    this.passwordInput.value = "";
    this.pendingJoin = null;
    this.dialog.inert = false;
    if (this.creatingRoom) {
      this.creatingRoom = false;
      this.roomName.value = this.createName.value.trim();
      this.roomPassword.value = password;
      this.seed = Math.floor(Math.random() * 4294967295) >>> 0;
      this.showLobby();
      return;
    }
    this.selectedRoom = pending.id;
    this.joinSelected(pending.observer, password);
  }
  cancelRoomPassword() {
    this.creatingRoom = false;
    this.passwordDialog.hidden = true;
    this.passwordInput.value = "";
    this.pendingJoin = null;
    this.dialog.inert = false;
    this.roomList.querySelector('[aria-pressed="true"]')?.focus();
  }
  applyFormat(preferred = this.map.value) {
    const size = Number(this.format.value), maps = this.mapList.filter((map) => map.teamSize === size);
    this.map.replaceChildren();
    for (const map of maps) {
      const option = node("option", "", `${map.name} \xB7 ${map.width} \xD7 ${map.height}`);
      option.value = map.id;
      this.map.append(option);
    }
    if (maps.some((map) => map.id === preferred)) this.map.value = preferred;
    this.slots.forEach((slot, id) => {
      if (id % 4 >= size) {
        slot.active = false;
        slot.row.hidden = true;
      }
    });
    this.lobby.querySelectorAll(".network-add").forEach((button, index) => button.disabled = this.role === "observer" || this.slots.slice(index * 4, index * 4 + size).every((slot) => slot.active));
    const capacity = this.root.querySelector(".network-capacity");
    if (capacity) capacity.textContent = `${size} \xD7 ${size} / ${size * 2} \u041C\u0415\u0421\u0422`;
    this.updateMap();
  }
  updateMap() {
    const map = this.mapList.find((item) => item.id === this.map.value);
    if (!map) return;
    if (this.spawnMap !== map.id) {
      this.spawnMap = map.id;
      this.spawnAssignments.clear();
      this.spawnPoints = [];
    }
    this.map.value = map.id;
    this.preview.src = map.preview;
    this.description.textContent = `${map.description}. ${map.teamSize} \u043D\u0430 ${map.teamSize} \xB7 ${map.capacity} \u0441\u0442\u0430\u0440\u0442\u043E\u0432 \xB7 ${map.width} \xD7 ${map.height} \u043A\u043B\u0435\u0442\u043E\u043A.`;
  }
  openChoice(select) {
    if (select.disabled || !select.options.length) return;
    this.closeChoice(false);
    this.choiceSelect = select;
    this.choiceCursor = Math.max(0, select.selectedIndex);
    this.choicePopup.hidden = false;
    this.choicePopup.setAttribute("aria-label", select.getAttribute("aria-label") ?? "\u0412\u044B\u0431\u043E\u0440");
    select.setAttribute("aria-expanded", "true");
    select.focus();
    const rect = select.getBoundingClientRect(), height = Math.min(248, select.options.length * 42 + 8, (window.innerHeight || 800) - 24), width = Math.min(Math.max(rect.width, 180), (window.innerWidth || 1e3) - 24);
    this.choicePopup.style.width = `${width}px`;
    this.choicePopup.style.maxHeight = `${height}px`;
    this.choicePopup.style.left = `${Math.max(12, Math.min(rect.left, (window.innerWidth || 1e3) - width - 12))}px`;
    this.choicePopup.style.top = `${rect.bottom + height + 6 <= (window.innerHeight || 800) ? rect.bottom + 6 : Math.max(12, rect.top - height - 6)}px`;
    this.drawChoice();
  }
  drawChoice() {
    const select = this.choiceSelect;
    if (!select) return;
    this.choicePopup.replaceChildren();
    Array.from(select.options).forEach((option, index) => {
      const item = node("button", "network-choice-option", option.textContent ?? "");
      item.id = `${this.choicePopup.id}-${index}`;
      item.type = "button";
      item.tabIndex = -1;
      item.disabled = option.disabled;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(index === select.selectedIndex));
      item.classList.toggle("choice-cursor", index === this.choiceCursor);
      item.addEventListener("pointerdown", (event) => event.preventDefault());
      item.addEventListener("pointerenter", () => {
        this.choiceCursor = index;
        Array.from(this.choicePopup.children).forEach((child, i) => child.classList.toggle("choice-cursor", i === index));
        select.setAttribute("aria-activedescendant", item.id);
      });
      item.addEventListener("click", (event) => {
        event.stopPropagation();
        this.chooseOption(index);
      });
      this.choicePopup.append(item);
    });
    select.setAttribute("aria-activedescendant", `${this.choicePopup.id}-${this.choiceCursor}`);
    this.choicePopup.children[this.choiceCursor]?.scrollIntoView?.({ block: "nearest" });
  }
  chooseOption(index) {
    const select = this.choiceSelect;
    if (!select || select.options[index]?.disabled) return;
    select.selectedIndex = index;
    this.closeChoice();
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }
  closeChoice(focus = true) {
    const select = this.choiceSelect;
    this.choiceSelect = null;
    this.choicePopup.hidden = true;
    if (select) {
      select.setAttribute("aria-expanded", "false");
      select.removeAttribute("aria-activedescendant");
      if (focus) select.focus();
    }
  }
  focusable() {
    const scope = this.choiceSelect ? this.choicePopup : !this.passwordDialog.hidden ? this.passwordDialog : this.viewer.hidden ? this.root : this.viewer;
    return [...scope.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),[role="button"]')].filter((element) => !element.closest("[hidden]"));
  }
  handlePad(button) {
    if (!this.isOpen) return false;
    if (this.choiceSelect) {
      if (button === "b" || button === "start") this.closeChoice();
      else if (button === "a" || button === "c") this.chooseOption(this.choiceCursor);
      else {
        const select = this.choiceSelect, direction = button === "up" || button === "left" ? -1 : 1;
        for (let i = 0; i < select.options.length; i++) {
          this.choiceCursor = (this.choiceCursor + direction + select.options.length) % select.options.length;
          if (!select.options[this.choiceCursor].disabled) break;
        }
        this.drawChoice();
        this.host.ui?.(25);
      }
      return true;
    }
    if (button === "b" || button === "start") {
      if (!this.passwordDialog.hidden) this.cancelRoomPassword();
      else if (!this.viewer.hidden) this.closeMap();
      else this.back();
      return true;
    }
    const items = this.focusable(), current = items.indexOf(document.activeElement);
    const focused = document.activeElement;
    if (button === "left" || button === "right") {
      const direction = button === "left" ? -1 : 1;
      if (focused?.tagName === "SELECT") {
        const select = focused;
        select.selectedIndex = (select.selectedIndex + direction + select.options.length) % select.options.length;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      } else if (focused?.tagName === "INPUT" && focused.type === "checkbox") {
        const input = focused;
        input.checked = !input.checked;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      } else if (focused?.tagName === "INPUT" && focused.type === "number") {
        const input = focused;
        input.value = String(Math.max(1, (Number(input.value) || 1) + direction));
      } else items[(current + direction + items.length) % items.length]?.focus();
    } else if (button === "up" || button === "down") items[(current + (button === "up" ? -1 : 1) + items.length) % items.length]?.focus();
    else if (button === "a" || button === "c") {
      if (focused?.classList.contains("network-room")) {
        this.selectedRoom = focused.dataset.roomId ?? "";
        this.joinSelected();
      } else if (focused?.tagName === "SELECT") this.handlePad("right");
      else if (focused?.tagName === "INPUT" && focused.type !== "checkbox") {
        const input = focused;
        if (input.type !== "number" && input.readOnly) {
          input.readOnly = false;
          input.focus();
          input.select();
        } else {
          input.readOnly = true;
          items[(current + 1) % items.length]?.focus();
        }
      } else focused?.click();
    }
    return true;
  }
  snapshot() {
    const size = Number(this.format.value);
    return { version: 1, server: this.host.endpoint ?? "", name: this.name.value.trim(), roomName: this.roomName.value.trim(), password: this.roomPassword.value, teamSize: size, map: this.map.value, randomStarts: this.random.checked, seed: this.seed, resources: Number(this.resources.value), speed: this.speed.value, friendlyFire: false, infiniteSpice: true, role: this.role, slots: this.slots.flatMap((slot, id) => id % 4 >= size ? [] : [{ id: Math.floor(id / 4) * size + id % 4, team: Math.floor(id / 4), controller: slot.active ? slot.controller.value : "closed", house: slot.house.value, difficulty: slot.difficulty.value, spawn: [...this.spawnAssignments].find(([, player]) => player === id)?.[0] ?? null }]) };
  }
};
export {
  NetworkMenu
};
