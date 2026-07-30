import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const ignoredDirectories = new Set([".git", ".wrangler", "node_modules"]);
const errors = [];
const warnings = [];
const siteOrigin = "https://lxephotography.com";
const majorPublicPages = new Map([
  ["index.html", `${siteOrigin}/`],
  ["portfolio/index.html", `${siteOrigin}/portfolio/`],
  ["portfolio/families/index.html", `${siteOrigin}/portfolio/families/`],
  ["portfolio/couples-engagements/index.html", `${siteOrigin}/portfolio/couples-engagements/`],
  ["portfolio/portraits-seniors/index.html", `${siteOrigin}/portfolio/portraits-seniors/`],
  ["portfolio/motherhood-newborns/index.html", `${siteOrigin}/portfolio/motherhood-newborns/`],
  ["sessions/index.html", `${siteOrigin}/sessions/`],
  ["about/index.html", `${siteOrigin}/about/`],
  ["contact/index.html", `${siteOrigin}/contact/`],
  ["client-galleries/index.html", `${siteOrigin}/client-galleries/`],
  ["policies.html", `${siteOrigin}/policies.html`],
  ["privacy.html", `${siteOrigin}/privacy.html`]
]);
const portfolioCategoryPages = new Map([
  ["portfolio/families/index.html", { canonical: `${siteOrigin}/portfolio/families/`, label: "Families" }],
  ["portfolio/couples-engagements/index.html", { canonical: `${siteOrigin}/portfolio/couples-engagements/`, label: "Couples & Engagements" }],
  ["portfolio/portraits-seniors/index.html", { canonical: `${siteOrigin}/portfolio/portraits-seniors/`, label: "Portraits & Seniors" }],
  ["portfolio/children-lifestyle/index.html", { canonical: `${siteOrigin}/portfolio/children-lifestyle/`, label: "Children & Lifestyle" }],
  ["portfolio/motherhood-newborns/index.html", { canonical: `${siteOrigin}/portfolio/motherhood-newborns/`, label: "Motherhood & Newborns" }],
  ["portfolio/minis-seasonal/index.html", { canonical: `${siteOrigin}/portfolio/minis-seasonal/`, label: "Minis & Seasonal" }],
  ["portfolio/pets-lifestyle/index.html", { canonical: `${siteOrigin}/portfolio/pets-lifestyle/`, label: "Pets & Lifestyle" }]
]);
const privateRoutePrefixes = ["/studio", "/gallery", "/api"];

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
  return Boolean(await resolveTargetFile(sourceFile, target));
}

async function resolveTargetFile(sourceFile, target) {
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
      if (info.isFile()) return possibility;
      if (info.isDirectory()) {
        const indexPath = path.join(possibility, "index.html");
        const indexInfo = await stat(indexPath);
        if (indexInfo.isFile()) return indexPath;
      }
    } catch {}
  }
  return null;
}

function matches(content, expression) {
  return expression.test(content);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function attributeValue(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"));
  return match ? decodeHtml(match[1].trim()) : "";
}

function metaValue(html, attribute, key) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (attributeValue(match[0], attribute).toLowerCase() === key.toLowerCase()) {
      return attributeValue(match[0], "content");
    }
  }
  return "";
}

function canonicalValue(html) {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    if (attributeValue(match[0], "rel").toLowerCase() === "canonical") {
      return attributeValue(match[0], "href");
    }
  }
  return "";
}

function titleValue(html) {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match ? decodeHtml(match[1].trim()) : "";
}

function textValue(html) {
  return decodeHtml(html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
}

function jsonLdBlocks(html, name) {
  const blocks = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch {
      errors.push(`${name}: invalid JSON-LD`);
    }
  }
  return blocks;
}

const files = await walk(root);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const allRelative = new Set(files.map(relative));

for (const file of htmlFiles) {
  const name = relative(file);
  const html = await readFile(file, "utf8");

  if (!matches(html, /<meta\s+name=["']viewport["']/i)) errors.push(`${name}: missing viewport meta tag`);
  if (!matches(html, /<title>[^<]+<\/title>/i)) errors.push(`${name}: missing non-empty title`);
  const h1Count = [...html.matchAll(/<h1(?:\s|>)/gi)].length;
  if (name === "studio/index.html" && h1Count < 1) errors.push(`${name}: missing H1`);
  else if (name !== "studio/index.html" && h1Count !== 1) errors.push(`${name}: expected exactly one H1; found ${h1Count}`);
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

  for (const match of html.matchAll(/\bhref=["']([^"']+)["']/gi)) {
    const value = match[1];
    if (/^[a-z]+:/i.test(value) || value.startsWith("//")) continue;
    const hashIndex = value.indexOf("#");
    if (hashIndex < 0) continue;
    const fragment = decodeURIComponent(value.slice(hashIndex + 1));
    if (!fragment) continue;

    const target = localTarget(value);
    const targetFile = target ? await resolveTargetFile(file, target) : file;
    if (!targetFile) continue;
    const targetHtml = targetFile === file ? html : await readFile(targetFile, "utf8");
    if (!new RegExp(`\\bid=["']${escapeRegExp(fragment)}["']`, "i").test(targetHtml)) {
      errors.push(`${name}: missing fragment target #${fragment} in ${relative(targetFile)}`);
    }
  }
}

const titles = new Map();
const descriptions = new Map();
const canonicals = new Map();

for (const [name, expectedCanonical] of majorPublicPages) {
  const file = path.join(root, ...name.split("/"));
  const html = await readFile(file, "utf8");
  const title = titleValue(html);
  const description = metaValue(html, "name", "description");
  const canonical = canonicalValue(html);
  const metadata = {
    "og:title": metaValue(html, "property", "og:title"),
    "og:description": metaValue(html, "property", "og:description"),
    "og:url": metaValue(html, "property", "og:url"),
    "og:type": metaValue(html, "property", "og:type"),
    "og:image": metaValue(html, "property", "og:image"),
    "twitter:card": metaValue(html, "name", "twitter:card"),
    "twitter:title": metaValue(html, "name", "twitter:title"),
    "twitter:description": metaValue(html, "name", "twitter:description"),
    "twitter:image": metaValue(html, "name", "twitter:image")
  };

  if (!title) errors.push(`${name}: missing page title`);
  if (!description) errors.push(`${name}: missing meta description`);
  if (canonical !== expectedCanonical) errors.push(`${name}: canonical must be ${expectedCanonical}`);

  for (const [key, value] of Object.entries(metadata)) {
    if (!value) errors.push(`${name}: missing ${key} metadata`);
  }

  if (metadata["og:title"] !== title) errors.push(`${name}: og:title must match the page title`);
  if (metadata["twitter:title"] !== title) errors.push(`${name}: twitter:title must match the page title`);
  if (metadata["og:description"] !== description) errors.push(`${name}: og:description must match the meta description`);
  if (metadata["twitter:description"] !== description) errors.push(`${name}: twitter:description must match the meta description`);
  if (metadata["og:url"] !== canonical) errors.push(`${name}: og:url must match the canonical URL`);
  if (metadata["og:type"] !== "website") errors.push(`${name}: og:type must be website`);
  if (metadata["twitter:card"] !== "summary_large_image") errors.push(`${name}: twitter:card must be summary_large_image`);
  if (metadata["twitter:image"] !== metadata["og:image"]) errors.push(`${name}: Twitter and Open Graph images must match`);

  for (const key of ["og:image", "twitter:image"]) {
    const value = metadata[key];
    if (!value.startsWith(`${siteOrigin}/`)) {
      errors.push(`${name}: ${key} must use an absolute lxephotography.com URL`);
      continue;
    }
    if (!(await targetExists(file, new URL(value).pathname))) errors.push(`${name}: ${key} target does not exist`);
  }

  const robots = metaValue(html, "name", "robots").toLowerCase();
  if (robots.includes("noindex")) errors.push(`${name}: major public page must remain indexable`);

  for (const [values, label, value] of [
    [titles, "title", title],
    [descriptions, "meta description", description],
    [canonicals, "canonical URL", canonical]
  ]) {
    if (values.has(value)) errors.push(`${name}: duplicate ${label} also used by ${values.get(value)}`);
    else values.set(value, name);
  }
}

for (const [name, expected] of portfolioCategoryPages) {
  const file = path.join(root, ...name.split("/"));
  const html = await readFile(file, "utf8");
  const breadcrumbMatches = [...html.matchAll(/<nav\b[^>]*aria-label=["']Breadcrumb["'][^>]*>([\s\S]*?)<\/nav>/gi)];

  if (breadcrumbMatches.length !== 1) {
    errors.push(`${name}: expected exactly one visible breadcrumb navigation`);
    continue;
  }

  const breadcrumbHtml = breadcrumbMatches[0][1];
  const links = [...breadcrumbHtml.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => ({ href: match[1], label: textValue(match[2]) }));
  const expectedLinks = [
    { href: "/", label: "Home" },
    { href: "/portfolio/", label: "Portfolio" }
  ];

  if (JSON.stringify(links) !== JSON.stringify(expectedLinks)) {
    errors.push(`${name}: breadcrumb links must be Home then Portfolio`);
  }

  const currentMatch = breadcrumbHtml.match(/<([a-z0-9]+)\b[^>]*aria-current=["']page["'][^>]*>([\s\S]*?)<\/\1>/i);
  if (!currentMatch || textValue(currentMatch[2]) !== expected.label) {
    errors.push(`${name}: breadcrumb current page must be marked as ${expected.label}`);
  }

  const canonical = canonicalValue(html);
  if (canonical !== expected.canonical) errors.push(`${name}: breadcrumb page canonical must be ${expected.canonical}`);

  const breadcrumbData = jsonLdBlocks(html, name).filter((block) => block?.["@type"] === "BreadcrumbList");
  if (breadcrumbData.length !== 1) {
    errors.push(`${name}: expected exactly one BreadcrumbList JSON-LD block`);
    continue;
  }

  const expectedItems = [
    { position: 1, name: "Home", item: `${siteOrigin}/` },
    { position: 2, name: "Portfolio", item: `${siteOrigin}/portfolio/` },
    { position: 3, name: expected.label, item: expected.canonical }
  ];
  const structured = breadcrumbData[0];
  if (structured["@context"] !== "https://schema.org") errors.push(`${name}: BreadcrumbList must use the schema.org context`);
  if (!Array.isArray(structured.itemListElement) || structured.itemListElement.length !== expectedItems.length) {
    errors.push(`${name}: BreadcrumbList must contain three items`);
    continue;
  }

  structured.itemListElement.forEach((item, index) => {
    const expectedItem = expectedItems[index];
    if (
      item?.["@type"] !== "ListItem" ||
      item.position !== expectedItem.position ||
      item.name !== expectedItem.name ||
      item.item !== expectedItem.item
    ) {
      errors.push(`${name}: invalid BreadcrumbList item at position ${index + 1}`);
    }
  });
}

for (const file of htmlFiles) {
  const name = relative(file);
  if (portfolioCategoryPages.has(name)) continue;
  const html = await readFile(file, "utf8");
  if (/<nav\b[^>]*aria-label=["']Breadcrumb["']/i.test(html)) {
    errors.push(`${name}: breadcrumb navigation is limited to public portfolio categories`);
  }
  if (jsonLdBlocks(html, name).some((block) => block?.["@type"] === "BreadcrumbList")) {
    errors.push(`${name}: BreadcrumbList JSON-LD is limited to public portfolio categories`);
  }
}

const sitemapPath = path.join(root, "sitemap.xml");
if (allRelative.has("sitemap.xml")) {
  const sitemap = await readFile(sitemapPath, "utf8");
  const sitemapRoutes = [];
  for (const match of sitemap.matchAll(/<loc>https:\/\/lxephotography\.com([^<]*)<\/loc>/g)) {
    const route = match[1] || "/";
    sitemapRoutes.push(route);
    if (privateRoutePrefixes.some((privateRoute) => route === privateRoute || route.startsWith(`${privateRoute}/`))) {
      errors.push(`sitemap.xml: private route must not be indexed: ${route}`);
      continue;
    }
    const targetFile = await resolveTargetFile(path.join(root, "index.html"), route);
    if (!targetFile) {
      errors.push(`sitemap.xml: route has no matching page: ${route}`);
      continue;
    }
    const targetHtml = await readFile(targetFile, "utf8");
    if (metaValue(targetHtml, "name", "robots").toLowerCase().includes("noindex")) {
      errors.push(`sitemap.xml: noindex page must not be listed: ${route}`);
    }
  }

  for (const route of new Set(sitemapRoutes.filter((value, index) => sitemapRoutes.indexOf(value) !== index))) {
    errors.push(`sitemap.xml: duplicate route: ${route}`);
  }

  for (const canonical of majorPublicPages.values()) {
    const route = new URL(canonical).pathname;
    if (!sitemapRoutes.includes(route)) errors.push(`sitemap.xml: missing major public route: ${route}`);
  }
}

const robotsPath = path.join(root, "robots.txt");
if (allRelative.has("robots.txt")) {
  const robots = await readFile(robotsPath, "utf8");
  for (const route of ["/studio/", "/gallery/", "/api/"]) {
    if (!new RegExp(`^Disallow:\\s*${escapeRegExp(route)}\\s*$`, "im").test(robots)) {
      errors.push(`robots.txt: missing Disallow: ${route}`);
    }
  }
  if (!/^Sitemap:\s*https:\/\/lxephotography\.com\/sitemap\.xml\s*$/im.test(robots)) {
    errors.push("robots.txt: missing production sitemap declaration");
  }
}

const studioHtml = await readFile(path.join(root, "studio", "index.html"), "utf8");
if (!metaValue(studioHtml, "name", "robots").toLowerCase().includes("noindex")) {
  errors.push("studio/index.html: private studio must include a noindex robots directive");
}

const galleryPortalSource = await readFile(path.join(root, "src", "gallery-portal.js"), "utf8");
if (!metaValue(galleryPortalSource, "name", "robots").toLowerCase().includes("noindex")) {
  errors.push("src/gallery-portal.js: private gallery template must include a noindex robots directive");
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
