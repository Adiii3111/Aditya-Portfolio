/**
 * Prefix a file in /public with the site's base path. On GitHub Pages the site
 * lives under /Aditya-Portfolio, so "/images/a.jpg" must become
 * "/Aditya-Portfolio/images/a.jpg". Locally the base path is empty.
 */
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
