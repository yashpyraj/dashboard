export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export async function processInChunks<T, R>(
  items: T[],
  chunkSize: number,
  processor: (chunk: T[]) => Promise<R[]>,
  onProgress?: (processed: number, total: number) => void
): Promise<R[]> {
  const chunks = chunk(items, chunkSize);
  const results: R[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunkResults = await processor(chunks[i]);
    results.push(...chunkResults);
    
    if (onProgress) {
      onProgress((i + 1) * chunkSize, items.length);
    }
  }
  
  return results;
}