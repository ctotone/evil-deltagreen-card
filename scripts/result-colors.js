/* Delta Green card — état visuel uniquement (Foundry 14 / DG 2.0.1).
 * Lit UNIQUEMENT le verdict déjà rendu et visible dans le DOM.
 * Ne lit ni rolls, ni flags, ni acteurs ; aucune modification des interactions.
 */
(() => {
  const outcomes = [
    ["CriticalSuccess", "critical-success"],
    ["CriticalFailure", "critical-failure"],
    ["Success", "success"],
    ["Failure", "failure"],
    ["Lethal", "lethal"],
  ];

  // Mise en page de la carte DÉGÂTS, à partir des seuls nœuds visibles.
  // Les liens natifs, tooltips et données de jet restent inchangés.
  function formatDamageCard(card, label, diceRoll) {
    if (!label || !diceRoll || card.classList.contains("evil-card--damage-layout")) return;
    const result = diceRoll.querySelector(".dice-result");
    const formula = result?.querySelector(".dice-formula");
    if (!result || !formula) return;

    // En-tête standard Delta Green : <b>DÉGÂTS</b> ... <b>Nom de l'arme</b>.
    // En cas de template différent, on préfère laisser intact le libellé natif.
    const bolds = [...label.children].filter(node => node.tagName === "B");
    if (bolds.length < 2) return;
    const itemName = bolds[1];
    const piercing = label.querySelector(".dg-chat-card__armor-piercing");

    // Le titre visuel suit le total déjà présent dans le DOM autorisé.
    // 0 ou 1 dégât => singulier ; 2 et plus => pluriel.
    const total = result.querySelector(".dice-total");
    if (!total) return;
    const isOneDamage = /^(?:0|1)$/.test(total.textContent.trim());
    const heading = document.createElement("span");
    heading.className = "evil-damage-heading";
    const key = isOneDamage
      ? "EVIL_DG_CARD.Cards.DamageSingular"
      : "EVIL_DG_CARD.Cards.DamagePlural";
    const localized = game.i18n.localize(key);
    heading.textContent = localized !== key ? localized : "Damage";

    const itemLine = document.createElement("span");
    itemLine.className = "evil-damage-item";
    itemLine.appendChild(itemName); // Nœud natif, nom non reconstruit.

    const meta = document.createElement("div");
    meta.className = "evil-damage-meta";

    // Conserver la formule visible et la placer à la suite du nom de l'arme.
    const formulaText = formula.textContent.trim();
    formula.textContent = `[${formulaText}]`;
    formula.classList.add("evil-damage-formula-inline");
    itemLine.append(document.createTextNode(" "), formula);

    // Ligne dédiée à la perforation, sans parenthèses autour de l'information.
    if (piercing) {
      piercing.classList.add("evil-damage-piercing-line");
      for (const node of [...piercing.childNodes]) {
        if (node.nodeType === Node.TEXT_NODE) {
          node.nodeValue = node.nodeValue.replace(/[()]/g, "").trim();
        }
      }
      meta.appendChild(piercing); // Icône / tooltip natifs conservés.
    }

    label.replaceChildren(itemLine, meta);
    result.appendChild(heading);
    card.classList.add("evil-card--damage-layout");
  }

  // Mise en page de létalité : uniquement les textes rendus et visibles.
  // On garde le même élément dice-roll, ses data-action, et le tooltip natif.
  function formatLethalityCard(card, label, diceRoll) {
    if (!label || !diceRoll || card.classList.contains("evil-card--lethality-layout")) return;
    const result = diceRoll.querySelector(".dice-result");
    const total = result?.querySelector(".dice-total");
    const verdict = result?.querySelector(".dice-formula");
    if (!result || !total || !verdict) return;

    // Le total natif est de la forme « 79 (16 Dégâts) ».
    const fullResult = total.textContent.trim();
    const match = fullResult.match(/^(\d{1,3})\s*\((.+)\)$/u);
    const bolds = [...label.querySelectorAll(":scope > b")];
    if (!match || bolds.length < 2) return; // Ne jamais perdre une donnée inconnue.

    const item = bolds[1];
    const heading = document.createElement("span");
    heading.className = "evil-lethality-heading";
    const key = "EVIL_DG_CARD.Cards.Lethality";
    const localized = game.i18n.localize(key);
    heading.textContent = localized !== key ? localized : "Lethality Roll";

    const subtitle = document.createElement("span");
    subtitle.className = "evil-lethality-item";
    // Capturer les nœuds après le nom AVANT de déplacer le <b> natif.
    const tail = [];
    for (let node = item.nextSibling; node; node = node.nextSibling) tail.push(node);
    subtitle.appendChild(item);
    for (const node of tail) subtitle.appendChild(node);
    // Si le DOM a d'autres nœuds entre le nom et les données, l'extraction
    // ci-dessus n'intervient qu'après contrôle des deux balises <b> natives.
    for (const node of [...subtitle.childNodes]) {
      if (node.nodeType === Node.TEXT_NODE) {
        node.nodeValue = node.nodeValue.replace(/^\s*:\s*/u, " ");
      }
    }

    const extraDamage = document.createElement("span");
    extraDamage.className = "evil-lethality-damage";
    extraDamage.textContent = `(${match[2]})`;
    total.textContent = match[1];
    result.appendChild(extraDamage);
    label.replaceChildren(heading, subtitle);
    card.classList.add("evil-card--lethality-layout", "evil-card--consequence");
  }

  // Carte de perte de SAN : on réorganise les éléments natifs déjà visibles.
  // Les deux résultats et la formule restent ceux du système, sans aucun calcul.
  function formatSanDamageCard(card, label, diceRoll) {
    if (!label || !diceRoll || card.classList.contains("evil-card--san-layout")) return;
    const result = diceRoll.querySelector(".dice-result");
    const formula = result?.querySelector(":scope > .dice-formula");
    const total = result?.querySelector(":scope > .dice-total");
    if (!result || !formula || !total) return;

    const heading = document.createElement("span");
    heading.className = "evil-san-heading";
    const key = "EVIL_DG_CARD.Cards.SanDamage";
    const translated = game.i18n.localize(key);
    heading.textContent = translated !== key ? translated : "SAN Damage";

    // Déplacer la formule native sans la recréer ; la mettre sous le titre.
    formula.classList.add("evil-san-formula");
    label.replaceChildren(heading, formula);
    card.classList.add("evil-card--san-layout");
  }


  // Cartes d'amélioration : le système fournit un texte de compétences
  // suivi des gains en <b>. Regrouper deux couples nom/gain par ligne,
  // sans modifier les valeurs et sans intervenir sur les autres messages.
  // Ajuster au besoin les entrées sur une ligne, avec une borne de lisibilité.
  // La largeur réellement disponible est mesurée, donc les noms longs ne
  // débordent pas silencieusement dans la seconde colonne.
  function fitImprovementEntries(grid) {
    for (const entry of grid.querySelectorAll(".evil-improvements-entry")) {
      entry.style.fontSize = "13px";
      entry.classList.remove("evil-improvements-entry--wrap");
      if (entry.clientWidth <= 0) continue;
      for (let size = 13; size >= 9 && entry.scrollWidth > entry.clientWidth + 1; size -= 0.5) {
        entry.style.fontSize = `${size}px`;
      }
      // Pour les cas extrêmes, conserver l'ensemble du texte lisible.
      if (entry.scrollWidth > entry.clientWidth + 1) {
        entry.classList.add("evil-improvements-entry--wrap");
      }
    }
  }

  function formatSkillImprovementCard(card) {
    if (card.classList.contains("evil-card--skill-improvements")) return;
    const label = card.querySelector(":scope > .dg-chat-card__roll-label");
    const body = card.querySelector(":scope > .dg-chat-card__body");
    if (!label || !body || body.querySelector(".dice-roll")) return;
    const title = label.textContent.trim();
    const nativeFlavor = [
      game.i18n.localize("DG.Skills.ApplySkillImprovements.ChatFlavor"),
      game.i18n.localize("DG.Skills.ApplySkillImprovementsChatFlavor"),
    ].filter(value => !value.startsWith("DG.Skills.") && value);
    const localizedPrefix = nativeFlavor.some(value => {
      const prefix = value.replace(/<[^>]*>/gu, "").split("{formula}")[0].trim();
      return prefix && title.toLocaleLowerCase().startsWith(prefix.toLocaleLowerCase());
    });
    if (!localizedPrefix && !/^Improved the following skills by\s*/iu.test(title) &&
        !/^Amélioration de compétences(?: de)?\s*/iu.test(title)) return;

    // Format natif connu : « Compétence: <b>+x%</b>, Compétence: <b>+y%</b> ».
    // Ne pas toucher aux contenus inattendus : cela évite de perdre des données.
    const nodes = [...body.childNodes].filter(node =>
      node.nodeType !== Node.TEXT_NODE || node.nodeValue.trim() !== "");
    if (!nodes.length || nodes.length % 2 !== 0) return;
    const entries = [];
    for (let i = 0; i < nodes.length; i += 2) {
      const nameNode = nodes[i];
      const gainNode = nodes[i + 1];
      if (nameNode.nodeType !== Node.TEXT_NODE ||
          gainNode.nodeType !== Node.ELEMENT_NODE || gainNode.tagName !== "B") return;
      const name = nameNode.nodeValue.replace(/^\s*,\s*/u, "").trim();
      if (!name.endsWith(":") || !gainNode.textContent.trim()) return;
      entries.push({ name, gainNode });
    }
    if (!entries.length) return;

    const grid = document.createElement("div");
    grid.className = "evil-improvements-grid";
    for (const { name, gainNode } of entries) {
      const entry = document.createElement("div");
      entry.className = "evil-improvements-entry";
      entry.append(document.createTextNode(name.replace(/:\s*$/u, "") + " "), gainNode);
      grid.appendChild(entry);
    }
    body.replaceChildren(grid);

    const formula = label.querySelector("b")?.textContent.trim() ||
      title.match(/\b\d+d\d+(?:[+-]\d+)?%/iu)?.[0];
    const key = "EVIL_DG_CARD.Cards.SkillImprovements";
    if (formula && game.i18n.localize(key) !== key) {
      label.textContent = game.i18n.format(key, { formula });
    }
    card.classList.add("evil-card--skill-improvements");

    // Mesurer après insertion dans le chat, lorsque les dimensions existent.
    requestAnimationFrame(() => {
      if (!grid.isConnected) return;
      fitImprovementEntries(grid);
      if (typeof ResizeObserver !== "undefined") {
        const observer = new ResizeObserver(() => {
          if (grid.isConnected) fitImprovementEntries(grid);
          else observer.disconnect();
        });
        observer.observe(grid);
      }
    });
  }

  Hooks.on("renderChatMessageHTML", (message, element) => {
    // Foundry doit avoir autorisé le contenu pour cet utilisateur.
    if (message.isContentVisible === false) return;
    const card = element.querySelector(".dg-chat-card");
    if (!card) return;
    // Taille bornée du nom visible du lanceur, sans remplacer l’alias natif
    // (un token peut volontairement porter un nom différent de son acteur).
    const speaker = card.querySelector(".dg-chat-card__speaker");
    if (speaker) {
      const length = [...speaker.textContent.trim()].length;
      const fontSize = length > 38 ? 11 : length > 28 ? 12 : length > 20 ? 13 : length > 14 ? 15 : 17;
      speaker.style.setProperty("--evil-speaker-font-size", `${fontSize}px`);
    }

    // Traduction uniquement des libellés visibles, via les fichiers lang du module.
    // Langue non fournie : on conserve intégralement le libellé natif du système.
    // Les boutons, leurs attributs data-action et leurs écouteurs restent intacts.
    const actionLabels = {
      "roll-damage": { pattern: /Damage Roll/giu, key: "EVIL_DG_CARD.Actions.DamageRoll" },
      "roll-lethality": { pattern: /Lethality Roll/giu, key: "EVIL_DG_CARD.Actions.LethalityRoll" },
    };
    for (const [action, { pattern, key }] of Object.entries(actionLabels)) {
      const replacement = game.i18n.localize(key);
      if (!replacement || replacement === key) continue;
      const nativeKey = action === "roll-damage" ? "DG.Messages.RollDamage" : "DG.Messages.RollLethality";
      const nativeLabel = game.i18n.localize(nativeKey);
      for (const button of card.querySelectorAll(`button[data-action="${action}"]`)) {
        const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        for (const node of nodes) {
          node.nodeValue = node.nodeValue.replace(pattern, replacement);
          if (nativeLabel !== nativeKey && nativeLabel !== replacement) {
            node.nodeValue = node.nodeValue.replace(nativeLabel, replacement);
          }
        }
      }
    }

    formatSkillImprovementCard(card);

    const diceRoll = card.querySelector(".dg-chat-card__body .dice-roll");
    const verdict = diceRoll?.querySelector(".dice-formula");
    if (!verdict || !diceRoll) return;

    // Séparation du nom d'arme en conservant les éléments de bonus/malus.
    // Ne s'applique qu'aux libellés d'attaque clairement identifiés.
    const label = card.querySelector('.dg-chat-card__roll-label');
    const bold = label?.querySelector('b');
    if (bold && !label.classList.contains('evil-weapon-label')) {
      const m = bold.textContent.trim().match(/^(.+?)\s+\(([^()]+)\)$/u);
      const actions = card.querySelector('[data-action="roll-damage"], [data-action="roll-lethality"]');
      const knownSkill = /^(?:armes? à feu|firearms?|armes? de mêlée|melee weapons?|combat à mains nues|unarmed combat)/iu.test(m?.[1] || '');
      if (m && (actions || knownSkill)) {
        const skill = document.createElement('span');
        const item = document.createElement('span');
        skill.className = 'evil-weapon-label__skill';
        item.className = 'evil-weapon-label__item';
        // Garder les descendants du libellé (notamment info-bulles de modificateurs).
        bold.textContent = m[1];
        skill.appendChild(bold);
        while (label.firstChild) skill.appendChild(label.firstChild);
        // Le texte final de cible reste présent dans 'skill' avec ses icônes.
        item.textContent = m[2];
        label.append(skill, item);
        label.classList.add('evil-weapon-label');
      }
    }

    // Habillage des signes % déjà visibles, sans changer la valeur ni les nœuds
    // interactifs natifs. Idempotent à chaque re-render Foundry.
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    const percentageNodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.nodeValue?.includes("%")) continue;
      const parent = node.parentElement;
      if (parent?.closest('.evil-percent-sign, .dice-tooltip, button, a, [data-action]')) continue;
      percentageNodes.push(node);
    }
    for (const node of percentageNodes) {
      const fragment = document.createDocumentFragment();
      const pieces = node.nodeValue.split('%');
      pieces.forEach((piece, index) => {
        if (piece) fragment.appendChild(document.createTextNode(piece));
        if (index < pieces.length - 1) {
          const sign = document.createElement('span');
          sign.className = 'evil-percent-sign';
          sign.textContent = '%';
          fragment.appendChild(sign);
        }
      });
      node.replaceWith(fragment);
    }

    // Cartes de dégâts directs (et non dégâts de SAN / létalité) : le titre
    // visible est la seule source utilisée. Aucune lecture des rolls ou flags.
    const nativeLabel = label?.textContent?.trim() || "";
    const nativeDamageLabel = game.i18n.localize("DG.Roll.RollingDamageFor");
    const localizedDamageStart = nativeDamageLabel !== "DG.Roll.RollingDamageFor" &&
      nativeLabel.toLocaleLowerCase().startsWith(nativeDamageLabel.toLocaleLowerCase());
    const isDamage = /^jet de dés\s+dégâts\b/iu.test(nativeLabel) ||
      /^(?:damage roll|roll damage|roll for damage)\b/iu.test(nativeLabel) ||
      localizedDamageStart;
    // En JS, \b n'identifie pas une frontière après « é » (hors \w ASCII) :
    // utiliser un séparateur explicite pour « LÉTALITÉ Pour ... ».
    const nativeLethality = game.i18n.localize("DG.Roll.Lethality");
    const localizedLethality = nativeLethality !== "DG.Roll.Lethality" &&
      nativeLabel.toLocaleLowerCase().includes(nativeLethality.toLocaleLowerCase()) &&
      Boolean(label?.querySelectorAll(":scope > b").length >= 2);
    const isLethality = /^(?:jet de dés\s+)?(?:létalité|lethality)(?=\s|:|$)/iu.test(nativeLabel) ||
      localizedLethality;
    const nativeSanDamage = game.i18n.localize("DG.Generic.SanDamage");
    const localizedSanDamage = nativeSanDamage !== "DG.Generic.SanDamage" &&
      nativeLabel.toLocaleLowerCase().includes(nativeSanDamage.toLocaleLowerCase()) &&
      Boolean(verdict?.textContent.includes("/"));
    const isSanDamage = /^(?:jet de dés\s+)?perte de san\b/iu.test(nativeLabel) ||
      /^(?:jet de dés\s+)?sanity damage\b/iu.test(nativeLabel) ||
      /^(?:san damage|san loss|sanity loss)\b/iu.test(nativeLabel) ||
      localizedSanDamage;

    // Priorité aux cartes représentant une conséquence négative : dégâts,
    // létalité et perte de SAN ont toujours le fond orange, quel que soit
    // leur verdict natif. Identification uniquement depuis le titre visible.
    if (isDamage || isLethality || isSanDamage) {
      card.classList.add("evil-card--consequence");
      if (isDamage) diceRoll.classList.add("evil-result--damage");
    }
    if (isDamage) formatDamageCard(card, label, diceRoll);
    if (isLethality) formatLethalityCard(card, label, diceRoll);
    if (isSanDamage) formatSanDamageCard(card, label, diceRoll);

    const visibleText = verdict.textContent.trim().toLocaleUpperCase();
    for (const [key, classSuffix] of outcomes) {
      const translated = game.i18n.localize(`DG.Roll.${key}`);
      if (visibleText === translated.trim().toLocaleUpperCase()) {
        diceRoll.classList.add(`evil-result--${classSuffix}`);
        break;
      }
    }
  });
})();
