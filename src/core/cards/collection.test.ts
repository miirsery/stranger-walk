import { describe, expect, it } from 'vitest';
import { CardCollection } from './collection';

const rules = { minSize: 2, maxSize: 4, maxCopies: 2 };

describe('CardCollection', () => {
  it('стартовые карты попадают и в инвентарь, и в колоду', () => {
    const collection = new CardCollection(rules, ['a', 'a', 'b']);
    expect(collection.total).toBe(3);
    expect(collection.count('a')).toBe(2);
    expect(collection.deck).toEqual(['a', 'a', 'b']);
    expect(collection.list()).toEqual([
      { cardId: 'a', count: 2 },
      { cardId: 'b', count: 1 },
    ]);
  });

  it('новая карта добавляется в колоду, пока есть место и не превышен лимит копий', () => {
    const collection = new CardCollection(rules, ['a', 'a']);
    collection.add('a');
    expect(collection.count('a')).toBe(3);
    expect(collection.deck).toEqual(['a', 'a']);
    collection.add('b');
    collection.add('c');
    collection.add('d');
    expect(collection.deck).toEqual(['a', 'a', 'b', 'c']);
    expect(collection.count('d')).toBe(1);
  });

  it('проверяет правила колоды', () => {
    const collection = new CardCollection(rules, ['a', 'a', 'b']);
    expect(collection.validateDeck(['a'])).toHaveLength(1);
    expect(collection.validateDeck(['a', 'b', 'a', 'b', 'a'])).not.toHaveLength(0);
    expect(collection.validateDeck(['a', 'a', 'a'])).not.toHaveLength(0);
    expect(collection.validateDeck(['a', 'z'])).not.toHaveLength(0);
    expect(collection.validateDeck(['a', 'b'])).toEqual([]);
  });

  it('setDeck меняет колоду только на допустимую', () => {
    const collection = new CardCollection(rules, ['a', 'a', 'b']);
    expect(collection.setDeck(['b', 'b'])).not.toHaveLength(0);
    expect(collection.deck).toEqual(['a', 'a', 'b']);
    expect(collection.setDeck(['b', 'a'])).toEqual([]);
    expect(collection.deck).toEqual(['b', 'a']);
  });
});
