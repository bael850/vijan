// Satu-satunya tempat yang menentukan siapa "penulis" (pemilik situs).
export function isAuthorEmail(email: string | null | undefined): boolean {
  const author = process.env.AUTHOR_EMAIL?.trim().toLowerCase();
  return !!author && email?.trim().toLowerCase() === author;
}
