// Dates must carry an explicit offset ("Z" or "+05:30"). Without one,
// "2027-01-10T10:00:00" is read in the server's own timezone, so the same
// request would mean different moments on a laptop and on EC2.
const ISO_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export const parseIsoDate = (value) => {
  if (typeof value !== "string" || !ISO_WITH_OFFSET.test(value)) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};