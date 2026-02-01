export function formatPrice(price: number): string {
  const fixedPrice = price.toFixed(2);
  const [integerPart, decimalPart] = fixedPrice.split('.');
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${formattedInteger}.${decimalPart}`;
}
