export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { runBootCleanup } = await import('./instrumentation-node');
      await runBootCleanup();
    } catch (error) {
      console.error('[retention] boot hook skipped:', error);
    }
  }
}
