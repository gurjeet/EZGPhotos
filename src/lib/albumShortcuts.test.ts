import { assignAlbumShortcuts, getShortcutCandidates } from './albumShortcuts';

describe('album shortcuts', () => {
  it('prefers name-derived letters in the expected order', () => {
    expect(getShortcutCandidates('Family').at(0)).toBe('F');
    expect(getShortcutCandidates('Maple').at(0)).toBe('M');
    expect(getShortcutCandidates('Office').at(0)).toBe('F');
    expect(getShortcutCandidates('London Trip').at(0)).toBe('L');
    expect(getShortcutCandidates('Love').slice(0, 2)).toEqual(['L', 'V']);
    expect(getShortcutCandidates('Baby').at(0)).toBe('B');
    expect(getShortcutCandidates('Baby Shower').slice(0, 2)).toEqual(['B', 'S']);
  });

  it('keeps the assigned letters unique across the visible album set', () => {
    const shortcuts = assignAlbumShortcuts([
      { id: 'family', title: 'Family' },
      { id: 'friendship', title: 'Friendship' },
      { id: 'france', title: 'France' },
    ]);

    const values = [...shortcuts.values()];
    expect(new Set(values).size).toBe(values.length);
    expect(shortcuts.get('family')).toBe('F');
    expect(shortcuts.get('friendship')).not.toBe('F');
  });

  it('falls through to a later name-derived letter when the first choice is already taken', () => {
    const shortcuts = assignAlbumShortcuts([
      { id: 'london-trip', title: 'London Trip' },
      { id: 'love', title: 'Love' },
    ]);

    expect(shortcuts.get('london-trip')).toBe('L');
    expect(shortcuts.get('love')).toBe('V');
  });
});
