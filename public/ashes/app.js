import { siteUrl } from "/navigation.js";

const ashesUrl = "https://ashes.live";
const cardImageUrl = "https://cdn.ashes.live/images/cards";
const releaseMonthFormat = new Intl.DateTimeFormat("en-US", {
  month: "long", year: "numeric", timeZone: "UTC",
});
const releaseDayFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium", timeZone: "UTC",
});
// Product images hosted by the Ashes publisher, Plaid Hat Games.
const diceImageBase = "https://media.plaidhatgames.com/filer_public";
const diceImages = {
  artifice: "5d/9e/5d9eb21b-12d4-47de-8156-8cf301d26114/ashes_add_on-artifice_dice.png",
  astral: "fd/52/fd52466d-990f-46f0-94df-4c5a0e37f2a3/ashes_add_on-astral_dice.png",
  ceremonial: "01/1e/011ed743-2927-4032-b59c-600eccbd05e3/ashes_add_on-ceremonial_dice.png",
  charm: "0e/5e/0e5e218c-a633-40c2-9943-ea41ddfb8cbc/ashes_add_on-charm_dice.png",
  divine: "6b/7f/6b7f6419-8ba6-480d-a769-74f1fe883e93/ashes_add_on-divine_dice.png",
  illusion: "ec/ee/eceea163-4e99-4583-a6e6-0a013989b624/ashes_add_on-illusion_dice.png",
  natural: "19/6b/196b16e9-76d2-45cd-ac7f-215cb8a31cbf/ashes_add_on-natural_dice.png",
  sympathy: "97/58/975879cd-b42c-42e6-92ab-4c930d44eaf4/ashes_add_on-sympathy_dice.png",
  time: "f2/20/f2209e41-c4bd-426a-8915-29507e41cbf0/ashes_add_on-time_dice.png",
};
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

function cardImageSource(card) {
  return `${cardImageUrl}/${encodeURIComponent(card.stub)}.jpg`;
}

function createDeckTile(deck) {
  const item = element("li", "deck-tile");
  const artwork = element("img", "deck-portrait");
  artwork.alt = deck.phoenixborn.name;
  artwork.width = 300;
  artwork.height = 420;
  artwork.loading = "lazy";
  artwork.decoding = "async";
  artwork.src = cardImageSource(deck.phoenixborn);

  item.append(element("h2", "deck-name", deck.title), artwork);
  if (deck.releaseDate) {
    const exactDate = deck.releaseDate.length === 10;
    const day = exactDate ? deck.releaseDate : `${deck.releaseDate}-01`;
    const formatter = exactDate ? releaseDayFormat : releaseMonthFormat;
    const label = formatter.format(new Date(`${day}T00:00:00Z`));
    const release = element("time", "deck-release-date", `Released ${label}`);
    release.dateTime = deck.releaseDate;
    item.append(release);
  }

  const actions = element("div", "deck-tile-actions");
  for (const [label, page] of [["Card view", "cards.html"], ["Deck view", "deck.html"]]) {
    const link = element("a", "deck-view-action", label);
    link.href = siteUrl(`/ashes/${page}?id=${deck.id}`);
    link.setAttribute("aria-label", `${label} for ${deck.title}`);
    actions.append(link);
  }
  item.append(actions);
  return item;
}

function renderLibrary(ashesDecks) {
  const list = document.getElementById("deck-list");
  list.append(...ashesDecks.map(createDeckTile));
}

function totalCopies(cards) {
  return cards.reduce((total, card) => total + card.count, 0);
}

function createCardLink(card, { lazy = true } = {}) {
  const link = element("a", "card-link");
  link.href = cardUrl(card);

  const art = element("span", "card-art");
  const image = element("img", "card-image");
  const fallback = element("span", "card-image-fallback", "Image unavailable");
  fallback.hidden = true;
  image.alt = "";
  image.decoding = "async";
  if (lazy) image.loading = "lazy";
  image.addEventListener("error", () => {
    image.hidden = true;
    fallback.hidden = false;
  }, { once: true });
  image.src = cardImageSource(card);
  art.append(image, fallback);

  const caption = element("span", "card-caption");
  const name = element("span", "card-title", card.name);
  if (card.phoenixborn) {
    name.append(element("span", "card-unique", ` (${card.phoenixborn})`));
  }
  caption.append(name);
  if (card.count !== undefined) {
    caption.append(element("span", "card-quantity", `×${card.count}`));
  }
  link.append(art, caption);
  return link;
}

function createCardGroup(title, cards) {
  const section = element("section", "card-group");
  const total = totalCopies(cards);
  const heading = element("h2", "card-group-title", title);
  heading.append(element("span", "group-total", `${total} ${total === 1 ? "card" : "cards"}`));
  section.append(heading);

  const list = element("ul", "card-gallery");
  for (const type of cardTypes) {
    const matching = cards.filter(card => card.type === type);
    for (const card of matching) {
      const item = element("li");
      item.append(createCardLink(card));
      list.append(item);
    }
  }
  section.append(list);
  return section;
}

function renderDeckPage(ashesDecks, showDeck) {
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
  showDeck(deck);
}

function renderGallery(deck) {
  const phoenixbornCard = document.getElementById("phoenixborn-card");
  phoenixbornCard.append(createCardLink(deck.phoenixborn, { lazy: false }));

  const dice = document.getElementById("dice-pool");
  for (const die of deck.dice) {
    const item = element("li", "dice-pool-item");
    const imagePath = diceImages[die.name];
    if (imagePath) {
      const image = element("img", "dice-photo");
      image.alt = "";
      image.decoding = "async";
      image.addEventListener("error", () => { image.hidden = true; }, { once: true });
      image.src = `${diceImageBase}/${imagePath}`;
      item.append(image);
    }
    item.append(element("span", null, diceLabel(die)));
    dice.append(item);
  }
  const cardLists = document.getElementById("card-lists");
  cardLists.append(createCardGroup("Main deck", deck.cards));
  if (deck.conjurations.length) {
    cardLists.append(createCardGroup("Conjuration pile", deck.conjurations));
  }
  document.getElementById("deck-content").hidden = false;
}

async function renderPrintDeck(deck) {
  const cards = [deck.phoenixborn];
  for (const card of [...deck.cards, ...deck.conjurations]) {
    for (let copy = 0; copy < card.count; copy += 1) cards.push(card);
  }

  const cardsPerSheet = 9;
  const sheetCount = Math.ceil(cards.length / cardsPerSheet);
  const sheets = document.getElementById("print-sheets");
  const images = [];
  for (let start = 0; start < cards.length; start += cardsPerSheet) {
    const sheet = element("section", "print-sheet");
    sheet.setAttribute("aria-label", `Sheet ${start / cardsPerSheet + 1} of ${sheetCount}`);
    for (const card of cards.slice(start, start + cardsPerSheet)) {
      const slot = element("div", "print-card");
      const image = element("img");
      image.alt = card.name;
      image.src = cardImageSource(card);
      slot.append(image);
      sheet.append(slot);
      images.push(image);
    }
    sheets.append(sheet);
  }

  const status = document.getElementById("print-status");
  status.hidden = false;
  try {
    await Promise.all(images.map(image => image.decode()));
    status.hidden = true;
  } catch {
    status.textContent = "Some card images couldn’t load. Reload this page to try again.";
  }
}

try {
  const { ashesDecks } = await import(siteUrl("/ashes/decks.js"));
  if (document.getElementById("library")) renderLibrary(ashesDecks);
  if (document.getElementById("deck-detail")) renderDeckPage(ashesDecks, renderGallery);
  if (document.getElementById("print-deck")) renderDeckPage(ashesDecks, renderPrintDeck);
} catch {
  const message = element("p", "empty-state", "Couldn’t load the deck data. Reload this page to try again.");
  message.setAttribute("role", "alert");
  document.querySelector("main").prepend(message);
}
