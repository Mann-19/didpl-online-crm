export const formatNumber = (num: number | string): string => {
  if (num === null || num === undefined || isNaN(Number(num))) return "0.00";
  
  const numStr = Number(num).toFixed(2);
  const parts = numStr.split('.');
  
  let integerPart = parts[0];
  const decimalPart = '.' + parts[1];
  
  // Format integer part with commas (Indian numbering system)
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
  
  return formattedInteger + decimalPart;
};
