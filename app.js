"use strict";

const ashesUrl = "https://ashes.live";
const cardTypes = [
  "Ready Spell",
  "Ally",
  "Alteration Spell",
  "Action Spell",
  "Reaction Spell",
  "Conjuration",
  "Conjured Alteration Spell",
];

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function diceLabel(die) {
  return `${die.count} ${die.name[0].toUpperCase()}${die.name.slice(1)}`;
}

function cardUrl(card) {
  return `${ashesUrl}/cards/${encodeURIComponent(card.stub)}/`;
}

function createDeckTile(deck) {
  const item = element("li");
  const link = element("a", "deck-link");
  link.href = `./deck.html?id=${deck.id}`;
  link.append(
    element("h2", "deck-name", deck.title),
    element("p", "deck-phoenixborn", deck.phoenixborn.name),
  );

  const dice = element("ul", "dice-tags");
  dice.setAttribute("aria-label", "Dice pool");
  for (const die of deck.dice) {
    const tag = element("li", "dice-tag", diceLabel(die));
    tag.dataset.magic = die.name;
    dice.append(tag);
  }
  link.append(dice);
  item.append(link);
  return item;
}

function renderLibrary() {
  const search = document.getElementById("deck-search");
  const list = document.getElementById("deck-list");
  const count = document.getElementById("result-count");
  const empty = document.getElementById("no-results");
  const entries = ashesDecks.map(deck => ({
    searchText: `${deck.title} ${deck.phoenixborn.name}`.toLowerCase(),
    tile: createDeckTile(deck),
  }));
  list.append(...entries.map(entry => entry.tile));

  function updateResults() {
    const terms = search.value.trim().toLowerCase().split(/\s+/);
    let visible = 0;
    for (const entry of entries) {
      const matches = terms.every(term => entry.searchText.includes(term));
      entry.tile.hidden = !matches;
      if (matches) visible += 1;
    }
    count.textContent = `${visible} ${visible === 1 ? "deck" : "decks"}`;
    empty.hidden = visible > 0;
  }

  search.addEventListener("input", updateResults);
  window.addEventListener("pageshow", updateResults);
  updateResults();
}

function totalCopies(cards) {
  return cards.reduce((total, card) => total + card.count, 0);
}

function createCardGroup(title, cards) {
  const section = element("section", "card-group");
  const total = totalCopies(cards);
  const heading = element("h2", "card-group-title", title);
  heading.append(element("span", "group-total", `${total} ${total === 1 ? "card" : "cards"}`));
  section.append(heading);

  const list = element("ul", "card-list");
  for (const type of cardTypes) {
    const matching = cards.filter(card => card.type === type);
    for (const card of matching) {
      const row = element("li", "card-row");
      const quantity = element("span", "card-quantity", `${card.count}×`);
      quantity.setAttribute("aria-label", `${card.count} ${card.count === 1 ? "copy" : "copies"}`);
      const link = element("a", "card-link", card.name);
      link.href = cardUrl(card);
      if (card.phoenixborn) {
        link.append(element("span", "card-unique", ` (${card.phoenixborn})`));
      }
      const cardType = element("span", "card-type", type);
      row.append(quantity, link, cardType);
      list.append(row);
    }
  }
  section.append(list);
  return section;
}

function renderDeck() {
  const id = new URLSearchParams(window.location.search).get("id");
  const deck = ashesDecks.find(candidate => String(candidate.id) === id);
  const heading = document.getElementById("deck-title");
  if (!deck) {
    heading.textContent = "Deck not found";
    document.title = "Deck not found | Board Game Tracker";
    document.getElementById("deck-message").hidden = false;
    return;
  }

  heading.textContent = deck.title;
  document.title = `${deck.title} | Board Game Tracker`;

  const sourceLink = document.getElementById("source-link");
  sourceLink.href = `${ashesUrl}/decks/${deck.id}/`;
  sourceLink.hidden = false;

  const phoenixbornLink = document.getElementById("phoenixborn-link");
  phoenixbornLink.textContent = deck.phoenixborn.name;
  phoenixbornLink.href = cardUrl(deck.phoenixborn);

  const dice = document.getElementById("dice-pool");
  for (const die of deck.dice) {
    const item = element("li", "dice-tag", diceLabel(die));
    item.dataset.magic = die.name;
    dice.append(item);
  }
  const cardLists = document.getElementById("card-lists");
  cardLists.append(createCardGroup("Main deck", deck.cards));
  if (deck.conjurations.length) {
    cardLists.append(createCardGroup("Conjuration pile", deck.conjurations));
  }
  document.getElementById("deck-content").hidden = false;
}

if (document.getElementById("library")) renderLibrary();
if (document.getElementById("deck-detail")) renderDeck();
