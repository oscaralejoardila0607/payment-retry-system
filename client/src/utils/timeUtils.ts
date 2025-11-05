/**
 * Utility functions for time formatting
 */

/**
 * Calculate relative time from now
 */
export function getRelativeTime(dateString: string): string {
  const now = new Date();
  const target = new Date(dateString);
  const diffMs = target.getTime() - now.getTime();

  if (diffMs < 0) {
    return 'Now';
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `In ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
  }
  if (diffHours > 0) {
    return `In ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'}`;
  }
  if (diffMinutes > 0) {
    return `In ${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'}`;
  }
  if (diffSeconds > 0) {
    return `In ${diffSeconds} ${diffSeconds === 1 ? 'second' : 'seconds'}`;
  }

  return 'Now';
}

/**
 * Format time remaining for rate limit
 */
export function formatTimeRemaining(resetDate: string): string {
  const now = new Date();
  const reset = new Date(resetDate);
  const diffMs = reset.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Reset now';
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m`;
  }
  return `${diffMinutes}m`;
}

/**
 * Get processor fee label
 */
export function getProcessorFeeLabel(processor: string, fee: number): string {
  if (fee === 0) {
    return `${processor.toUpperCase()} (No additional fee)`;
  }
  return `${processor.toUpperCase()} (${fee.toLocaleString()} COP per retry)`;
}

/**
 * Format interval seconds to human readable
 */
export function formatInterval(seconds: number): string {
  if (seconds === 0) return 'Immediate';
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  return `${days}d`;
}
