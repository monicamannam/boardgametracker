import { siteUrl } from "/navigation.js";

const imageHost = "https://sw-zone.com/images";
const gateArtwork = "https://summonerwars.plaidhatgames.com/static/media/PH3600-Cards-Gate.121d8aff.jpg";
const gates = [
  { name: "Gate (5 life)", life: 5, count: 3 },
  { name: "Starting Gate (10 life)", life: 10, count: 1, starting: 1 },
];
const monthFormat = new Intl.DateTimeFormat("en-US", {
  month: "long", year: "numeric", timeZone: "UTC",
});

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function cardSource(card) {
  return card.life ? gateArtwork : `${imageHost}/cards/${card.art}.jpg`;
}

function createDeckTile(deck) {
  const item = element("li", "deck-tile");
  const portrait = element("img", "deck-portrait");
  portrait.alt = deck.summoner.name;
  portrait.width = 525;
  portrait.height = 375;
  portrait.loading = "lazy";
  portrait.decoding = "async";
  portrait.src = cardSource(deck.summoner);
  item.append(element("h2", "deck-name", deck.title), portrait);

  if (deck.releaseDate) {
    const month = monthFormat.format(new Date(`${deck.releaseDate}-01T00:00:00Z`));
    const release = element("time", "deck-release-date", `Released ${month}`);
    release.dateTime = deck.releaseDate;
    item.append(release);
  }

  const actions = element("div", "deck-tile-actions");
  for (const [label, page] of [["Card view", "cards.html"], ["Deck view", "deck.html"]]) {
    const link = element("a", "deck-view-action", label);
    link.href = siteUrl(`/summoner-wars/${page}?id=${deck.id}`);
    link.setAttribute("aria-label", `${label} for ${deck.title}`);
    actions.append(link);
  }
  item.append(actions);
  return item;
}

function createCardFace(card, lazy = false) {
  const face = element("span", "sw-card-face");
  const image = element("img", "card-image");
  image.alt = card.name;
  if (lazy) image.loading = "lazy";
  image.src = cardSource(card);
  face.append(image);

  // The publisher's online Gate artwork leaves room for the title and stats.
  if (card.life) {
    const stats = element("span", "gate-stats");
    stats.setAttribute("aria-hidden", "true");
    stats.append(
      element("span", "gate-name", "Gate"),
      element("span", "gate-type", "Structure"),
      element("span", "gate-cost", "0"),
      element("span", "gate-life", card.life),
    );
    face.append(stats);
  }
  return face;
}

function drawPileCount(card) {
  return card.count - (card.starting ?? 0);
}

function createGalleryCard(card) {
  const item = element("li");
  const entry = element(card.life ? "div" : "a", "card-link");
  if (!card.life) entry.href = cardSource(card);
  const art = element("span", "card-art");
  const face = createCardFace(card, true);
  const image = face.querySelector("img");
  image.alt = "";

  image.addEventListener("error", () => {
    face.replaceWith(element("span", "card-image-fallback", "Image unavailable"));
  }, { once: true });
  art.append(face);

  const caption = element("span", "card-caption");
  let quantity = `×${card.count}`;
  if (card.starting) {
    const drawCount = drawPileCount(card);
    quantity = drawCount ? `×${drawCount} + ${card.starting} starting` : `×${card.starting} starting`;
  }
  caption.append(
    element("span", "card-title", card.name),
    element("span", "card-quantity", quantity),
  );
  entry.append(art, caption);
  item.append(entry);
  return item;
}

function createCardGroup(title, cards) {
  const section = element("section", "card-group");
  const list = element("ul", "card-gallery");
  list.append(...cards.map(createGalleryCard));
  section.append(element("h2", "card-group-title", title), list);
  return section;
}

function createSetupDiagram(deck, cards) {
  const item = element("li", "setup-diagram");
  const image = element("img");
  image.width = 500;
  image.height = 234;
  image.alt = `${deck.title} starting positions: ${[deck.summoner.name, "10-life Gate",
    ...cards.filter(card => card.starting && !card.life).map(card => card.name)].join(", ")}`;
  image.src = `${imageHost}/starting_setups/${deck.id}.jpg`;
  item.append(image, element("p", "card-caption", "Starting setup"));
  return item;
}

function renderGallery(deck) {
  const summary = createCardGroup("Summoner", [deck.summoner]);
  summary.querySelector("ul").append(createSetupDiagram(deck, [...deck.champions, ...deck.commons]));
  document.getElementById("card-lists").append(
    summary,
    createCardGroup("Champions", deck.champions),
    createCardGroup("Commons", deck.commons),
    createCardGroup("Events", deck.events),
    createCardGroup("Gates", gates),
  );
}

function packCardGroups(groups, capacities) {
  const sheets = capacities.map(() => []);

  function placeGroup(index) {
    if (index === groups.length) return true;

    const group = groups[index];
    const triedCapacities = new Set();
    for (const [sheetIndex, sheet] of sheets.entries()) {
      const available = capacities[sheetIndex] - sheet.length;
      if (available < group.length || triedCapacities.has(available)) continue;
      triedCapacities.add(available);

      sheet.push(...group);
      if (placeGroup(index + 1)) return true;
      sheet.length -= group.length;
    }
    return false;
  }

  return placeGroup(0) ? sheets : null;
}

function arrangePrintSheets(deck) {
  const cardsPerSheet = 9;
  const firstSheet = [
    deck.summoner,
    ...deck.events.flatMap(card => Array(card.count).fill(card)),
  ];
  const groups = [];
  for (const card of [...deck.commons, ...deck.champions]) {
    // Keep every copy together, including any copy used in setup.
    for (let remaining = card.count; remaining > 0; remaining -= cardsPerSheet) {
      groups.push(Array(Math.min(remaining, cardsPerSheet)).fill(card));
    }
  }
  groups.sort((a, b) => b.length - a.length);

  const cardCount = groups.reduce((total, group) => total + group.length, 0);
  if (!cardCount) return [firstSheet];
  const minSheets = Math.ceil(cardCount / cardsPerSheet);
  const capacities = Array(minSheets).fill(cardsPerSheet);
  capacities[minSheets - 1] = cardCount % cardsPerSheet || cardsPerSheet;
  let sheets = packCardGroups(groups, capacities);

  // If full sheets are impossible, allow blank slots before adding another sheet.
  for (let sheetCount = minSheets; !sheets; sheetCount += 1) {
    sheets = packCardGroups(groups, Array(sheetCount).fill(cardsPerSheet));
  }

  return [firstSheet, ...sheets];
}

async function renderPrintDeck(deck) {
  const layout = arrangePrintSheets(deck);
  const sheets = document.getElementById("print-sheets");
  const images = [];

  for (const [index, cards] of layout.entries()) {
    const sheet = element("section", "print-sheet");
    sheet.setAttribute("aria-label", `Sheet ${index + 1} of ${layout.length}`);
    for (const card of cards) {
      const slot = element("div", "print-card");
      const face = createCardFace(card);
      images.push(face.querySelector("img"));
      slot.append(face);
      sheet.append(slot);
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

function renderPage(factionDecks) {
  const list = document.getElementById("deck-list");
  if (list) {
    list.append(...factionDecks.map(createDeckTile));
    return;
  }

  const id = new URLSearchParams(window.location.search).get("id");
  const deck = factionDecks.find(candidate => candidate.id === id);
  const heading = document.getElementById("deck-title");
  if (!deck) {
    heading.textContent = "Deck not found";
    document.title = "Deck not found | Board Game Tracker";
    document.getElementById("deck-message").hidden = false;
    return;
  }

  heading.textContent = deck.title;
  document.title = `${deck.title} | Summoner Wars | Board Game Tracker`;
  if (document.getElementById("print-deck")) renderPrintDeck(deck);
  else renderGallery(deck);
}

try {
  const { factionDecks } = await import(siteUrl("/summoner-wars/decks.js"));
  renderPage(factionDecks);
} catch {
  const message = element("p", "empty-state", "Couldn’t load the deck data. Reload this page to try again.");
  message.setAttribute("role", "alert");
  document.querySelector("main").prepend(message);
}
