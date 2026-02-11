/**
 * Helper to perform fetch with exponential backoff retry logic.
 */
export async function fetchWithRetry(
    url: string,
    options: RequestInit = {},
    maxRetries: number = 5,
    onRetry?: (nextRetryInSeconds: number, attempt: number) => void,
    force429Delay?: number
): Promise<Response> {
    const delays = [2000, 5000, 10000, 15000, 20000];
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);

            // Retry on 503 (Service Unavailable) or 429 (Too Many Requests)
            if (response.status === 503 || response.status === 429) {
                if (attempt === maxRetries) return response;

                const delay = response.status === 429 && force429Delay
                    ? force429Delay
                    : (delays[attempt] || 20000);

                if (onRetry) onRetry(delay / 1000, attempt + 1);

                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            return response;
        } catch (err: any) {
            lastError = err;
            if (attempt === maxRetries) throw err;

            const delay = delays[attempt] || 20000;
            if (onRetry) onRetry(delay / 1000, attempt + 1);

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError || new Error("Fetch failed after maximum retries");
}
