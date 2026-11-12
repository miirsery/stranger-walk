import type { CardId, DeckRules } from '../content/types';

export interface OwnedCard {
  cardId: CardId;
  count: number;
}

/** Инвентарь карт игрока и его активная колода. */
export class CardCollection {
  private readonly owned = new Map<CardId, number>();
  private deckCards: CardId[] = [];

  constructor(
    readonly rules: DeckRules,
    starterDeck: readonly CardId[] = [],
  ) {
    for (const cardId of starterDeck) this.add(cardId);
  }

  get deck(): readonly CardId[] {
    return this.deckCards;
  }

  get total(): number {
    let sum = 0;
    for (const count of this.owned.values()) sum += count;
    return sum;
  }

  count(cardId: CardId): number {
    return this.owned.get(cardId) ?? 0;
  }

  list(): OwnedCard[] {
    return [...this.owned.entries()].map(([cardId, count]) => ({ cardId, count }));
  }

  /**
   * Добавляет карту в инвентарь. Пока в колоде есть место и не превышен лимит копий,
   * карта сразу попадает и в колоду (редактора колод в MVP нет).
   */
  add(cardId: CardId): void {
    this.owned.set(cardId, this.count(cardId) + 1);
    const inDeck = this.deckCards.filter((id) => id === cardId).length;
    if (this.deckCards.length < this.rules.maxSize && inDeck < this.rules.maxCopies) {
      this.deckCards.push(cardId);
    }
  }

  /**
   * Восстанавливает инвентарь и колоду из сохранения. Если сохранённая колода больше
   * не проходит правила (например, изменился контент), колода собирается заново из инвентаря.
   */
  restore(owned: Readonly<Record<CardId, number>>, deck: readonly CardId[]): void {
    this.owned.clear();
    this.deckCards = [];
    for (const [cardId, count] of Object.entries(owned)) {
      if (count > 0) this.owned.set(cardId, count);
    }
    if (this.setDeck(deck).length === 0) return;
    for (const [cardId, count] of this.owned) {
      const copies = Math.min(count, this.rules.maxCopies, this.rules.maxSize - this.deckCards.length);
      for (let i = 0; i < copies; i++) this.deckCards.push(cardId);
    }
  }

  /** Список нарушений правил колоды; пустой — колода допустима. */
  validateDeck(deck: readonly CardId[]): string[] {
    const errors: string[] = [];
    const { minSize, maxSize, maxCopies } = this.rules;
    if (deck.length < minSize) errors.push(`В колоде должно быть не меньше ${minSize} карт`);
    if (deck.length > maxSize) errors.push(`В колоде должно быть не больше ${maxSize} карт`);
    const counts = new Map<CardId, number>();
    for (const cardId of deck) counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
    for (const [cardId, count] of counts) {
      if (count > maxCopies) errors.push(`Карта «${cardId}»: не больше ${maxCopies} копий`);
      if (count > this.count(cardId)) errors.push(`Карта «${cardId}»: в инвентаре меньше копий, чем в колоде`);
    }
    return errors;
  }

  /** Заменяет колоду, если она проходит проверку. Возвращает список ошибок. */
  setDeck(deck: readonly CardId[]): string[] {
    const errors = this.validateDeck(deck);
    if (errors.length === 0) this.deckCards = [...deck];
    return errors;
  }
}
