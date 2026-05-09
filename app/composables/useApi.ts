export function useApi() {
  const { apiBase } = useRuntimeConfig().public

  async function $fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${apiBase}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error((err as { error: string }).error ?? res.statusText)
    }
    return res.json() as Promise<T>
  }

  function useSSE(path: string, onEvent: (data: Record<string, unknown>) => void): () => void {
    const es = new EventSource(`${apiBase}${path}`)
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data as string) as Record<string, unknown>
        onEvent(data)
      } catch { /* ignore parse errors */ }
    }
    return () => es.close()
  }

  return { $fetch, useSSE }
}
