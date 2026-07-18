export function dateStrToISO(date: string, sep = "-") {
  const [year, month, day] = date.split(sep).map(Number);
  const localDate = new Date(year!, month! - 1, day);
  return localDate;
}

function getDDMMYYYY(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();

  return `${year}-${month}-${day}`;
}

export function createJournalDates() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const formattedToday = getDDMMYYYY(today);
  const _formattedTomorrow = getDDMMYYYY(tomorrow);
  return {
    today: formattedToday,
    // tomorrow: formattedTomorrow,
    tomorrow: formattedToday,
  };
}
export function createReportDates() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const formattedToday = getDDMMYYYY(today);
  const formattedStartOfMonth = getDDMMYYYY(startOfMonth);

  return {
    startOfMonth: formattedStartOfMonth,
    today: formattedToday,
  };
}

export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function dateToSakh(
  d: Date | null | undefined,
  timezone?: string,
  reversed: boolean = false
) {
  if (!d) return { date: "", time: "" };

  let date;
  if (timezone) {
    date = new Date(
      d.toLocaleString("en-US", {
        timeZone: timezone,
      })
    );
  } else {
    date = new Date(d);
  }

  // Check if the date is valid
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date provided");
  }

  return dateToStr(date, reversed);
}
export function dateToStr(date: Date, reversed: boolean = false) {
  // Format date as DD/MM/YYYY
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Months are 0-indexed
  const year = date.getFullYear();

  // Format time as HH:MM
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  if (!reversed) {
    return {
      date: `${day}.${month}.${year}`,
      time: `${hours}:${minutes}:${seconds}`,
    };
  } else {
    return {
      date: `${year}.${month}.${day}`,
      time: `${hours}:${minutes}:${seconds}`,
    };
  }
}
