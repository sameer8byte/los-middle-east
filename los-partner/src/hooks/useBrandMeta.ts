import { useLayoutEffect, useMemo } from "react";
import { useAppSelector } from "../shared/redux/store";

export function useBrandMeta() {
  const brand = useAppSelector((state) => state.brand);
  const band = useMemo(
    () => ({
      name: brand.name || "Payday loan",
      logoUrl: brand.logoUrl || "",
      description: brand.brandDetails.description || "CMS-driven Tawarruq App",
      title: brand.brandDetails.title || "PaydayLoan - Best Instant Tawarruq App | Apply Online Now",
      themeColor: brand.brand_themes?.primaryColor || "#ffffff",
    }),
    [brand]
  );
  

  const meta = useMemo(
    () => ({
      title: band?.title,
      logo: band?.logoUrl || "/favicon.ico",
      description:
        band?.description,
      themeColor: band?.themeColor,
    }),
    [band]
  );

  useLayoutEffect(() => {
    if (!meta) return;
    if (!brand.id) return;

    // Update <title>
    document.title = meta.title ;

    // chang icon
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (link) {
      link.href = meta.logo ;
    }

    // ? Update <meta name="description">
    let descTag = document.querySelector('meta[name="description"]');

    if (!descTag) {
      descTag = document.createElement("meta");
      descTag.setAttribute("name", "description");
      document.head.appendChild(descTag);
    }

    descTag.setAttribute("content", meta.description || "");

    // ? Update <meta name="theme-color">
    let themeColorTag = document.querySelector('meta[name="theme-color"]');

    if (!themeColorTag) {
      themeColorTag = document.createElement("meta");
      themeColorTag.setAttribute("name", "theme-color");
      document.head.appendChild(themeColorTag);
    }

    themeColorTag.setAttribute("content", meta.themeColor || "");
  }, [meta, brand.id]);
}
