type AlbumLike = {
  id: string;
  title: string;
};

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

function uniqueLetters(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (!LETTERS.includes(value) || seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

function splitWords(name: string): string[] {
  return name
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter(Boolean);
}

export function getShortcutCandidates(name: string): string[] {
  const words = splitWords(name);
  const allLetters = words.join('').split('');
  const initials = words.map((word) => word[0]);
  const otherLetters = allLetters.filter((_, index) => {
    let offset = 0;
    return !words.some((word) => {
      const isInitial = index === offset;
      offset += word.length;
      return isInitial;
    });
  });

  const consonantInitials = initials.filter((letter) => !VOWELS.has(letter));
  const consonantOthers = otherLetters.filter((letter) => !VOWELS.has(letter));
  const vowelInitials = initials.filter((letter) => VOWELS.has(letter));
  const vowelOthers = otherLetters.filter((letter) => VOWELS.has(letter));

  return uniqueLetters([
    ...consonantInitials,
    ...consonantOthers,
    ...vowelInitials,
    ...vowelOthers,
    ...LETTERS.split(''),
  ]);
}

export function assignAlbumShortcuts(albums: AlbumLike[]): Map<string, string> {
  const assignments = new Map<string, string>();
  const used = new Set<string>();

  for (const album of albums) {
    const shortcut =
      getShortcutCandidates(album.title).find((candidate) => !used.has(candidate)) ?? '?';
    assignments.set(album.id, shortcut);
    used.add(shortcut);
  }

  return assignments;
}
