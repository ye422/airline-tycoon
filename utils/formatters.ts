
export const formatCurrency = (amount: number): string => {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const ONE_JO = 1_000_000_000_000;
  const ONE_EOK = 100_000_000;
  const ONE_MAN = 10_000;
  
  let formattedString: string;

  if (absAmount >= ONE_JO) {
    const jo = Math.floor(absAmount / ONE_JO);
    const eok = Math.floor((absAmount % ONE_JO) / ONE_EOK);
    if (eok > 0) {
      formattedString = `${jo.toLocaleString()}조 ${eok.toLocaleString()}억`;
    } else {
      formattedString = `${jo.toLocaleString()}조`;
    }
  } else if (absAmount >= ONE_EOK) {
    const eok = Math.floor(absAmount / ONE_EOK);
    const man = Math.floor((absAmount % ONE_EOK) / ONE_MAN);
    if (man > 0) {
      formattedString = `${eok.toLocaleString()}억 ${man.toLocaleString()}만`;
    } else {
      formattedString = `${eok.toLocaleString()}억`;
    }
  } else if (absAmount >= ONE_MAN) {
    const man = Math.floor(absAmount / ONE_MAN);
    formattedString = `${man.toLocaleString()}만`;
  } else {
    formattedString = `${Math.round(absAmount).toLocaleString()}`;
  }
  
  return (isNegative ? `-${formattedString}` : formattedString) + '원';
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

export const formatModifier = (modifier: number): string => {
  const percentage = Math.round((modifier - 1) * 100);
  if (percentage > 0) {
    return `+${percentage}%`;
  }
  if (percentage < 0) {
    return `${percentage}%`;
  }
  return '±0%';
};

export const getAirportCode = (name: string): string | null => {
  const match = name.match(/\(([^)]+)\)/);
  return match ? match[1] : null;
};