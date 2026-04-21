import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

export const formatTime = (timestamp: number, format = 'YYYY-MM-DD HH:mm:ss') => {
  return dayjs.utc(timestamp).local().format(format);
};

export const formatTimeStr = (utcStr: string, format = 'YYYY-MM-DD HH:mm:ss') => {
  return dayjs(utcStr).format(format);
};
