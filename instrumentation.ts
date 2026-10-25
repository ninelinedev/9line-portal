export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.info('Portal runtime Node', process.version);
  }
}
