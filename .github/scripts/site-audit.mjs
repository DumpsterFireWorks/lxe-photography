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
const privateRoutePrefixes = ["/studio", "/gallery", "/api"];
const expectedLcpImages = new Map([
  ["index.html", "/public/images/portfolio/family-beach-lift.jpg"],
  ["portfolio/index.html", "/public/images/portfolio/family-beach-lift.jpg"],
  ["portfolio/families/index.html", "/public/images/portfolio/family-beach-lift.jpg"],
  ["portfolio/couples-engagements/index.html", "/public/images/portfolio/couples-beach-shore-kiss.jpg"],
  ["portfolio/portraits-seniors/index.html", "/portfolio/04-seated-blue-dress-portrait.jpeg"],
  ["portfolio/motherhood-newborns/index.html", "/portfolio/motherhood-newborns/IMG_8924.jpeg"],
  ["about/index.html", "/public/images/DEEDF45C-371D-4B9C-AA58-03638A48D338.png"]
]);
const publicImageTemplateFiles = ["payment-ready.js", "portfolio-additions.js"];

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

async function imageDimensions(file) {
  const buffer = await readFile(file);

  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    const startOfFrameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
    let offset = 2;
    while (offset + 8 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      while (buffer[offset] === 0xff) offset += 1;
      const marker = buffer[offset];
      offset += 1;
      if (marker === 0xd8 || marker === 0xd9) continue;
      if (offset + 2 > buffer.length) break;
      const length = buffer.readUInt16BE(offset);
      if (length < 2 || offset + length > buffer.length) break;
      if (startOfFrameMarkers.has(marker)) {
        return { width: buffer.readUInt16BE(offset + 5), height: buffer.readUInt16BE(offset + 3) };
      }
      offset += length;
    }
  }

  if (buffer.length >= 30 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    const format = buffer.toString("ascii", 12, 16);
    if (format === "VP8X") {
      return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
    }
    if (format === "VP8L" && buffer[20] === 0x2f) {
      const bits = buffer.readUInt32LE(21);
      return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) };
    }
    const signature = buffer.indexOf(Buffer.from([0x9d, 0x01, 0x2a]), 20);
    if (format === "VP8 " && signature >= 0 && signature + 7 <= buffer.length) {
      return {
        width: buffer.readUInt16LE(signature + 3) & 0x3fff,
        height: buffer.readUInt16LE(signature + 5) & 0x3fff
      };
    }
  }

  return null;
}

const files = await walk(root);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const allRelative = new Set(files.map(relative));
const sitemapPath = path.join(root, "sitemap.xml");
const sitemap = allRelative.has("sitemap.xml") ? await readFile(sitemapPath, "utf8") : "";
const publicPageNames = new Set();
for (const match of sitemap.matchAll(/<loc>https:\/\/lxephotography\.com([^<]*)<\/loc>/g)) {
  const route = match[1] || "/";
  const targetFile = await resolveTargetFile(path.join(root, "index.html"), route);
  if (targetFile) publicPageNames.add(relative(targetFile));
}
const publicImageReferences = new Set();
const dimensionCache = new Map();

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

  if (publicPageNames.has(name)) {
    const expectedLcpImage = expectedLcpImages.get(name) || "";
    const imageSourceCounts = new Map();
    let highPriorityImages = 0;
    let foundExpectedLcpImage = false;

    for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
      const tag = match[0];
      const src = attributeValue(tag, "src");
      const loading = attributeValue(tag, "loading").toLowerCase();
      const fetchpriority = attributeValue(tag, "fetchpriority").toLowerCase();
      const decoding = attributeValue(tag, "decoding").toLowerCase();
      const width = attributeValue(tag, "width");
      const height = attributeValue(tag, "height");
      const isExpectedLcpImage = src === expectedLcpImage && !foundExpectedLcpImage;
      const target = localTarget(src);
      const targetFile = target ? await resolveTargetFile(file, target) : null;

      imageSourceCounts.set(src, (imageSourceCounts.get(src) || 0) + 1);
      if (loading !== "eager" && loading !== "lazy") errors.push(`${name}: image ${src} has missing or invalid loading value`);
      if (fetchpriority && !["high", "low", "auto"].includes(fetchpriority)) {
        errors.push(`${name}: image ${src} has invalid fetchpriority value`);
      }
      if (decoding && !["async", "sync", "auto"].includes(decoding)) errors.push(`${name}: image ${src} has invalid decoding value`);
      if (decoding !== "async") errors.push(`${name}: image ${src} should use asynchronous decoding`);
      if (!/^[1-9]\d*$/.test(width) || !/^[1-9]\d*$/.test(height)) {
        errors.push(`${name}: image ${src} must have positive integer width and height attributes`);
      }

      if (fetchpriority === "high") highPriorityImages += 1;
      if (isExpectedLcpImage) {
        foundExpectedLcpImage = true;
        if (loading !== "eager") errors.push(`${name}: likely LCP image ${src} must load eagerly`);
        if (fetchpriority !== "high") errors.push(`${name}: likely LCP image ${src} must have high fetch priority`);
      } else {
        if (loading === "eager") errors.push(`${name}: below-the-fold image ${src} must not load eagerly`);
        if (fetchpriority === "high") errors.push(`${name}: only the likely LCP image may have high fetch priority`);
      }

      if (targetFile) {
        const targetName = relative(targetFile);
        publicImageReferences.add(targetName);
        if (!dimensionCache.has(targetName)) dimensionCache.set(targetName, await imageDimensions(targetFile));
        const intrinsic = dimensionCache.get(targetName);
        if (!intrinsic) {
          errors.push(`${name}: unable to validate intrinsic dimensions for ${src}`);
        } else if (Number(width) !== intrinsic.width || Number(height) !== intrinsic.height) {
          errors.push(`${name}: image ${src} dimensions must match ${intrinsic.width}x${intrinsic.height}`);
        }
      }
    }

    if (highPriorityImages > 1) errors.push(`${name}: expected at most one high-priority image; found ${highPriorityImages}`);
    if (expectedLcpImage && !foundExpectedLcpImage) errors.push(`${name}: missing expected LCP image ${expectedLcpImage}`);
    for (const [src, count] of imageSourceCounts) {
      if (count > 1) warnings.push(`${name}: image source ${src} appears ${count} times; verify reuse is intentional and cached`);
    }

    for (const match of html.matchAll(/<(?:img|source)\b[^>]*\bsrcset=["'][^"']+["'][^>]*>/gi)) {
      const srcset = attributeValue(match[0], "srcset");
      for (const candidate of srcset.split(",")) {
        const [url, descriptor = ""] = candidate.trim().split(/\s+/, 2);
        if (!url) {
          errors.push(`${name}: empty responsive image candidate`);
          continue;
        }
        if (descriptor && !/^(?:[1-9]\d*w|(?:\d+(?:\.\d+)?|\.\d+)x)$/.test(descriptor)) {
          errors.push(`${name}: invalid responsive image descriptor ${descriptor}`);
        }
        const target = localTarget(url);
        if (target && !(await targetExists(file, target))) errors.push(`${name}: missing responsive image target ${target}`);
      }
    }
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

for (const name of publicImageTemplateFiles) {
  const file = path.join(root, name);
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const src = attributeValue(tag, "src");
    const loading = attributeValue(tag, "loading").toLowerCase();
    const decoding = attributeValue(tag, "decoding").toLowerCase();
    const width = attributeValue(tag, "width");
    const height = attributeValue(tag, "height");
    const target = localTarget(src);
    const targetFile = target ? await resolveTargetFile(file, target) : null;

    if (loading !== "lazy") errors.push(`${name}: injected image ${src} must load lazily`);
    if (decoding !== "async") errors.push(`${name}: injected image ${src} should use asynchronous decoding`);
    if (!/^[1-9]\d*$/.test(width) || !/^[1-9]\d*$/.test(height)) {
      errors.push(`${name}: injected image ${src} must have positive integer width and height attributes`);
    }
    if (!targetFile) continue;

    const targetName = relative(targetFile);
    publicImageReferences.add(targetName);
    if (!dimensionCache.has(targetName)) dimensionCache.set(targetName, await imageDimensions(targetFile));
    const intrinsic = dimensionCache.get(targetName);
    if (!intrinsic) {
      errors.push(`${name}: unable to validate intrinsic dimensions for ${src}`);
    } else if (Number(width) !== intrinsic.width || Number(height) !== intrinsic.height) {
      errors.push(`${name}: injected image ${src} dimensions must match ${intrinsic.width}x${intrinsic.height}`);
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

if (allRelative.has("sitemap.xml")) {
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
  if (size > 2 * 1024 * 1024) {
    const name = relative(file);
    const classification = publicImageReferences.has(name)
      ? "referenced by a public page; byte reduction requires approved future asset processing"
      : "not referenced by a public page; no current public-page delivery cost";
    warnings.push(`${name}: ${(size / 1024 / 1024).toFixed(1)} MB; ${classification}`);
  }
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
