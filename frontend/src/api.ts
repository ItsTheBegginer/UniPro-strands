const BASE = import.meta.env.VITE_API_URL

export type ApplicationStatus = {
    application_id: string
    university: string
    program: string
    state: string
    pending: { field_label: string; question: string; reason: string; proposed_answer: string; risk: string } | null
    filled: string[]
    uploaded: string[]
    failure: string | null
    agent_message?: string
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    })
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
    return res.json()
}

export const api = {
    list: () => request<{ applications: ApplicationStatus[] }>('/applications'),
    start: (university: string, program: string) =>
        request<ApplicationStatus>('/applications', {
            method: 'POST',
            body: JSON.stringify({ university, program }),
        }),
    status: (id: string) => request<ApplicationStatus>(`/applications/${id}`),
    activity: (id: string) => request<{ timeline: string[] }>(`/applications/${id}/activity`),
    answer: (id: string, answer: string) =>
        request<ApplicationStatus>(`/applications/${id}/answer`, {
            method: 'POST',
            body: JSON.stringify({ answer }),
        }),
    submit: (id: string) => request<ApplicationStatus>(`/applications/${id}/submit`, { method: 'POST' }),
    requestChanges: (id: string, note: string) =>
        request<ApplicationStatus>(`/applications/${id}/request-changes`, {
            method: 'POST',
            body: JSON.stringify({ note }),
        }),
    retry: (id: string) => request<ApplicationStatus>(`/applications/${id}/retry`, { method: 'POST' }),
    continueRun: (id: string) => request<ApplicationStatus>(`/applications/${id}/continue`, { method: 'POST' }),
}