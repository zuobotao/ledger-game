import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface GameProfile {
  id: string
  name: string
  emoji: string
  createdAt: number
}

const STORAGE_KEY = 'ledger101-profiles'
const CURRENT_KEY = 'ledger101-current-profile'

export const DEFAULT_PROFILE_ID = 'default'

function loadProfiles(): GameProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as GameProfile[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (e) {
    console.error('Failed to load profiles:', e)
  }
  return [{ id: DEFAULT_PROFILE_ID, name: '我', emoji: '🧑', createdAt: Date.now() }]
}

function loadCurrentProfileId(profiles: GameProfile[]): string {
  try {
    const id = localStorage.getItem(CURRENT_KEY)
    if (id && profiles.some((p) => p.id === id)) return id
  } catch (e) {
    console.error('Failed to load current profile:', e)
  }
  return profiles[0]?.id ?? DEFAULT_PROFILE_ID
}

export const useProfileStore = defineStore('profile', () => {
  const profiles = ref<GameProfile[]>(loadProfiles())
  const currentProfileId = ref<string>(loadCurrentProfileId(profiles.value))

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles.value))
    localStorage.setItem(CURRENT_KEY, currentProfileId.value)
  }

  function findProfile(id: string): GameProfile | undefined {
    return profiles.value.find((p) => p.id === id)
  }

  const currentProfile = (): GameProfile | undefined =>
    findProfile(currentProfileId.value) ?? profiles.value[0]

  function setCurrent(id: string) {
    if (findProfile(id)) {
      currentProfileId.value = id
      persist()
    }
  }

  function addProfile(name: string, emoji = '🙂'): GameProfile | null {
    const trimmed = name.trim()
    if (!trimmed) return null
    const profile: GameProfile = {
      id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      emoji,
      createdAt: Date.now(),
    }
    profiles.value.push(profile)
    currentProfileId.value = profile.id
    persist()
    return profile
  }

  function removeProfile(id: string) {
    if (id === DEFAULT_PROFILE_ID) return
    profiles.value = profiles.value.filter((p) => p.id !== id)
    if (currentProfileId.value === id) {
      currentProfileId.value = profiles.value[0]?.id ?? DEFAULT_PROFILE_ID
    }
    persist()
  }

  function renameProfile(id: string, name: string) {
    const profile = findProfile(id)
    if (!profile) return
    const trimmed = name.trim()
    if (!trimmed) return
    profile.name = trimmed
    persist()
  }

  return {
    profiles,
    currentProfileId,
    currentProfile,
    findProfile,
    setCurrent,
    addProfile,
    removeProfile,
    renameProfile,
  }
})