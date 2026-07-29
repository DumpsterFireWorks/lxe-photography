import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const ignoredDirectories = new Set([".git", ".wrangler", "node_modules"]);
const errors = [];
const warnings = [];

async function walk(directory, files = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(fullPath, files);
    else files.push(fullPath);
  }
  return files;
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function localTarget(value) {
  if (!value || value.startsWith("#") || value.startsWith("mailto:") || value.startsWith("tel:") || value.startsWith("data:") || value.startsWith("blob:")) return "";
  if (/^[a-z]+:/i.test(value) || value.startsWith("//")) return "";
  const withoutQuery = value.split(/[?#]/, 1)[0];
  if (!withoutQuery) return "";
  return withoutQuery;
}

async function targetExists(sourceFile, target) {
  const decoded = decodeURIComponent(target);
  const base = decoded.startsWith("/") ? root : path.dirname(sourceFile);
  const candidate = path.resolve(base, decoded.replace(/^\/+/, ""));
  const possibilities = [candidate];
  if (decoded.endsWith("/")) possibilities.push(path.join(candidate, "index.html"));
  else if (!path.extname(candidate)) {
    possibilities.push(`${candidate}.html`, path.join(candidate, "index.html"));
  }

  for (const possibility of possibilities) {
    try {
      const info = await stat(possibility);
      if (info.isFile()) return true;
      if (info.isDirectory()) {
        const indexInfo = await stat(path.join(possibility, "index.html"));
        if (indexInfo.isFile()) return true;
      }
    } catch {}
  }
  return false;
}

function matches(content, expression) {
  return expression.test(content);
}

const files = await walk(root);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const allRelative = new Set(files.map(relative));

for (const file of htmlFiles) {
  const name = relative(file);
  const html = await readFile(file, "utf8");

  if (!matches(html, /<meta\s+name=["']viewport["']/i)) errors.push(`${name}: missing viewport meta tag`);
  if (!matches(html, /<title>[^<]+<\/title>/i)) errors.push(`${name}: missing non-empty title`);
  if (!matches(html, /<h1(?:\s|>)/i)) errors.push(`${name}: missing H1`);
  if (name !== "404.html" && !matches(html, /<meta\s+name=["']description["']/i)) warnings.push(`${name}: missing meta description`);
  if (!["404.html", "studio/index.html"].includes(name) && !matches(html, /<link\s+rel=["']canonical["']/i)) warnings.push(`${name}: missing canonical link`);

  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/gi)].map((match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  for (const id of new Set(duplicates)) errors.push(`${name}: duplicate id "${id}"`);

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\salt=["'][^"']*["']/i.test(match[0])) errors.push(`${name}: image missing alt attribute`);
  }

  for (const match of html.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/gi)) {
    if (!/\srel=["'][^"']*noopener[^"']*["']/i.test(match[0])) errors.push(`${name}: target=_blank link missing rel=noopener`);
  }

  for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
    const target = localTarget(match[1]);
    if (!target) continue;
    if (!(await targetExists(file, target))) errors.push(`${name}: missing local target ${target}`);
  }
}

const sitemapPath = path.join(root, "sitemap.xml");
if (allRelative.has("sitemap.xml")) {
  const sitemap = await readFile(sitemapPath, "utf8");
  for (const match of sitemap.matchAll(/<loc>https:\/\/lxephotography\.com([^<]*)<\/loc>/g)) {
    const route = match[1] || "/";
    if (["/studio/", "/gallery/"].some((privateRoute) => route.startsWith(privateRoute))) {
      errors.push(`sitemap.xml: private route must not be indexed: ${route}`);
      continue;
    }
    if (!(await targetExists(path.join(root, "index.html"), route))) errors.push(`sitemap.xml: route has no matching page: ${route}`);
  }
}

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
for (const file of files.filter((candidate) => imageExtensions.has(path.extname(candidate).toLowerCase()))) {
  const size = (await stat(file)).size;
  if (size > 2 * 1024 * 1024) warnings.push(`${relative(file)}: ${(size / 1024 / 1024).toFixed(1)} MB; consider a smaller web copy`);
}

if (warnings.length) {
  console.log("\nSite audit warnings:");
  for (const warning of warnings) console.log(`  - ${warning}`);
}

if (errors.length) {
  console.error("\nSite audit failed:");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`\nSite audit passed: ${htmlFiles.length} HTML files and ${files.length} repository files checked.`);
