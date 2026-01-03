export const isPhone = (value: string) => /^\+?[0-9]{8,15}$/.test(value);
export const isPositive = (value: number) =>
  Number.isFinite(value) && value > 0;
