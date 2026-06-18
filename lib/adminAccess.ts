export function configuredAdminUserIds(): Set<string> {
  const raw = [process.env.ADMIN_USER_IDS, process.env.ADMIN_USER_ID]
    .filter(Boolean)
    .join(',');

  return new Set(
    raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

export function isAdminUser(userId: string | null | undefined): boolean {
  return Boolean(userId && configuredAdminUserIds().has(userId));
}
