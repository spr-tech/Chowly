import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { MenuOrderFlow } from "@/components/MenuOrderFlow";

// "Pounded Yam & Egusi Soup" -> "pounded-yam-egusi-soup"
// "Suya (Beef Skewers)" -> "suya-beef-skewers"
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// Maps slug -> actual filename found on disk, whatever extension it has.
// Reading the real directory (not guessing an extension) is the whole point:
// no client-side onError fallback, no assuming .jpg.
function buildPhotoMap(folder: string): Map<string, string> {
  const dirPath = path.join(process.cwd(), "public", folder);
  const map = new Map<string, string>();
  let files: string[];
  try {
    files = fs.readdirSync(dirPath);
  } catch {
    return map;
  }
  for (const file of files) {
    const slug = file.slice(0, file.length - path.extname(file).length);
    map.set(slug, file);
  }
  return map;
}

export default async function MenuPage() {
  const menuItems = await prisma.menuItem.findMany({
    where: { isAvailable: true },
    orderBy: { name: "asc" },
  });

  const photosByFolder = {
    FOOD: { folder: "food-pics", map: buildPhotoMap("food-pics") },
    DRINK: { folder: "drink-pics", map: buildPhotoMap("drink-pics") },
  } as const;

  const menuItemsWithPhotos = menuItems.map((item) => {
    const { folder, map } = photosByFolder[item.category];
    const filename = map.get(slugify(item.name));
    return {
      ...item,
      photoUrl: filename ? `/${folder}/${filename}` : null,
    };
  });

  return <MenuOrderFlow menuItems={menuItemsWithPhotos} />;
}
