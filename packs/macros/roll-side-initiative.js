// Roll Side Initiative macro for Witch Iron
if (!game.combat) {
  ui.notifications.warn("No active combat encounter!");
  return;
}

if (!game.settings.get("witch-iron", "useSideInitiative")) {
  ui.notifications.warn("Side initiative is not enabled in system settings!");
  return;
}

game.witchIron.rollSideInitiative(game.combat).then(message => {
  ChatMessage.create({
    content: message,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    speaker: ChatMessage.getSpeaker({alias: game.i18n.localize("WITCHIRON.Combat.RollForInitiative")})
  });
}); 