export function generateExamCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < length; index += 1) {
    const random = Math.floor(Math.random() * chars.length);
    code += chars[random];
  }

  return code;
}

export function formatDuration(minutes: number) {
  if (minutes <= 0) {
    return "Không giới hạn";
  }

  if (minutes < 60) {
    return `${minutes} phút`;
  }

  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;

  if (remainMinutes === 0) {
    return `${hours} giờ`;
  }

  return `${hours} giờ ${remainMinutes} phút`;
}
