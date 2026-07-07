/**
 * Race a promise against a timeout. If `ms` elapses first, rejects with the
 * error returned by `onTimeout`. The timer is always cleared so a settled race
 * never leaves a dangling rejection (which would crash Node on
 * `--unhandled-rejections=throw`).
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  onTimeout: () => Error
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(onTimeout()), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
