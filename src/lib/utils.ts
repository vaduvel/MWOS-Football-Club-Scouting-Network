import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getServerFunctionsBaseUrl() {
  return (
    import.meta.env.VITE_SERVERLESS_FUNCTIONS_BASE_URL ||
    import.meta.env.VITE_NETLIFY_FUNCTIONS_BASE_URL ||
    '/.netlify/functions'
  ).replace(/\/$/, '')
}
