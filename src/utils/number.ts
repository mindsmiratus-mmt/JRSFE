export const formatWeight = (value: number | string | null | undefined) => {
  const num = Number(value);
  return isNaN(num) ? "0.000" : num.toFixed(3);
};
