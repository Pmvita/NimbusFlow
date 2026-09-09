/**
 * Env access. Read at invoke time (not module load) so a missing variable fails the
 * request with a clear message instead of a cold-start init error.
 */
export const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const optionalEnv = (name: string, fallback: string): string =>
  process.env[name] ?? fallback;
