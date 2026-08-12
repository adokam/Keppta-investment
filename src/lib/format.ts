export const NGN = (n: number) =>
  "₦" +
  Number(n ?? 0).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export const lagosToday = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
