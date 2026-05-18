import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolves a media path (e.g. /uploads/...) to a full URL pointing to the backend server.
 * If the path is already a full URL, it returns it as is.
 */
export function getMediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  // In many dev environments, the frontend is on 5173 and backend on 5000.
  // This logic ensures relative paths like /uploads/... are routed to the backend.
  const backendOrigin = window.location.origin.replace(':5173', ':5000');
  return `${backendOrigin}${path.startsWith('/') ? '' : '/'}${path}`;
}
