function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0),
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // Deletion
        matrix[i][j - 1] + 1, // Insertion
        matrix[i - 1][j - 1] + cost, // Substitution
      );
    }
  }

  return matrix[a.length][b.length];
}

function getSimilarityPercentage(a: string, b: string): number {
  const normalizedA = normalizeName(a);
  const normalizedB = normalizeName(b);
  const distance = levenshtein(normalizedA, normalizedB);
  const maxLength = Math.max(normalizedA.length, normalizedB.length);
  return maxLength === 0 ? 100 : Math.round((1 - distance / maxLength) * 100);
}

export function getNameMatchingPercentage({
  panName,
  aadhaarName,
  pennyBeneficiaryName,
}: {
  panName?: string;
  aadhaarName?: string;
  pennyBeneficiaryName?: string;
}): number {
  const names = [panName, aadhaarName, pennyBeneficiaryName].filter(
    Boolean,
  ) as string[];

  if (names.length < 2) return 0;

  const combinations: [string, string][] = [];

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      combinations.push([names[i], names[j]]);
    }
  }

  const percentages = combinations.map(([a, b]) =>
    getSimilarityPercentage(a, b),
  );
  const average = percentages.reduce((a, b) => a + b, 0) / percentages.length;

  return Math.round(average);
}
