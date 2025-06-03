export function createItem(actor, type, {name, img, system} = {}) {
  if (!actor) throw new Error('Actor is required to create an item');
  const capitalized = type.charAt(0).toUpperCase() + type.slice(1);
  const itemData = {
    name: name || `New ${capitalized}`,
    type,
    system: system || {}
  };
  if (img) itemData.img = img;
  return actor.createEmbeddedDocuments('Item', [itemData]);
}
