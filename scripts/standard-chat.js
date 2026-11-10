/* Evil Delta Green Card — standard Foundry chat messages (Foundry v14).
 * Presentation only. No roll/content/Actor data are inspected or changed.
 * The native chat HTML, event handlers and visibility remain untouched.
 */
(() => {
  Hooks.on("renderChatMessageHTML", (message, element) => {
    if (game.system?.id !== "deltagreen") return;
    if (!(element instanceof HTMLElement)) return;
    // Exclude every native Delta Green card, including its existing styles.
    if (element.classList.contains("dg-chat-card-message") ||
        element.querySelector(".dg-chat-card")) return;
    // Style only the regular Foundry message shell, never a foreign card.
    if (!element.classList.contains("chat-message") ||
        !element.querySelector(".message-content")) return;
    if (element.querySelector(".chat-card")) return;

    // Foundry's access rules remain authoritative. Metadata only is used to
    // select a background; in particular never read rolls or hidden content.
    const isPrivate = message.blind === true ||
      (Array.isArray(message.whisper) && message.whisper.length > 0);
    element.classList.add("evil-standard-chat");
    element.classList.toggle("evil-standard-chat--private", isPrivate);
  });
})();
