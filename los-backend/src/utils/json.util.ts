export const safeStringify = (data: any): string => {
  return JSON.stringify(
    data,
    (_, value) =>
      typeof value === "bigint" ? value.toString() : value
  );
};