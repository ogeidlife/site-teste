// InventorySystem.js — FASE 7 (a implementar)
// project.items[i]: { id, name, assetId, icon, quantity, position, collectable }.
// Mantém um inventário simples (ex.: SPRAY 3/3) e emite "inventory:changed"
// pro HUD (parte inferior — inventário horizontal, item 15 do spec).
export class InventorySystem {
  constructor(items = []) {
    this.stacks = new Map(); // itemId -> quantidade atual
    items.forEach((i) => this.stacks.set(i.id, i.quantity));
  }
  add(itemId, amount = 1) {
    this.stacks.set(itemId, (this.stacks.get(itemId) || 0) + amount);
  }
  has(itemId, amount = 1) {
    return (this.stacks.get(itemId) || 0) >= amount;
  }
}
