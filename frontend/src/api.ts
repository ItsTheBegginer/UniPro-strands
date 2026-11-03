const BASE = import.meta.env.VITE_API_URL

export type ApplicationStatus = {
    application_id: string
    university: string
    program: string
    state: string
    pending: {
        field_label: string
        question: string
        reason: string
        proposed_answer: string
        risk: string
        field_type?: string      // "text" | "radio" | "select" | "checkbox"
        options?: string[]       // selectable choices for radio/select fields
    } | null
    filled: string[]
    uploaded: string[]
    failure: string | null
    agent_message?: string
}

export type ProfileField = {
    value: unknown
    verified: boolean
    state: 'verified' | 'unverified' | 'missing'
}

export type StudentProfile = {
    fields: Record<string, ProfileField>
    documents: Record<string, string>   // doc_type -> relative path
}

export type ProfileSummary = {
    id: string
    name: string
    active: boolean
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

    // Profile
    getProfile: () => request<StudentProfile>('/profile'),
    saveProfile: (fields: Record<string, unknown>) =>
        request<{ status: string; updated: string[] }>('/profile', {
            method: 'PUT',
            body: JSON.stringify({ fields }),
        }),
    uploadDocument: (docType: string, file: File) => {
        const form = new FormData()
        form.append('file', file)
        return fetch(`${BASE}/profile/documents/${docType}`, {
            method: 'POST',
            body: form,
        }).then(async (res) => {
            if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
            return res.json() as Promise<{ status: string; doc_type: string; path: string }>
        })
    },
    deleteDocument: (docType: string) =>
        request<{ status: string; doc_type: string }>(`/profile/documents/${docType}`, { method: 'DELETE' }),

    // Multi-profile
    listProfiles: () => request<{ profiles: ProfileSummary[]; active: string | null }>('/profiles'),
    createProfile: (name: string, profile_id?: string) =>
        request<{ status: string; profile_id: string; name: string }>('/profiles', {
            method: 'POST',
            body: JSON.stringify({ name, profile_id }),
        }),
    activateProfile: (profileId: string) =>
        request<{ status: string; profile_id: string }>(`/profiles/${profileId}/activate`, { method: 'POST' }),
    deleteProfile: (profileId: string) =>
        request<{ status: string; profile_id: string }>(`/profiles/${profileId}`, { method: 'DELETE' }),

    // Server health
    serverStatus: () => request<{ api: boolean; demo_portal: boolean; frontend: boolean }>('/server/status'),
}