import { useLayoutEffect, useMemo } from "react";
import { useAppSelector } from "../redux/store";

// Default brand configuration type
interface DefaultBrandConfig {
  name: string;
  logoUrl: string;
  description: string;
  title: string;
  themeColor: string;
}

// Default brand configurations
const DEFAULT_BRANDS: Record<string, DefaultBrandConfig> = {
  "minutesloan.com": {
    name: "Minutes Loan",
    logoUrl:
      "https://8byte-public-minutesloan-prod.s3.ap-south-1.amazonaws.com/minutesloan_loan_agg_header.png",
    description:
      "Best instant Personal Loan Solutions .Apply for a personal loan online with Minutes Loan and get quick approval and disbursal. Experience hassle-free borrowing with our user-friendly platform and competitive interest rates. Whether you need funds for emergencies, education, or travel, Minutes Loan is your trusted partner for fast and reliable personal loans.",
    title: "Minutes Loan - Quick Loan Solutions",
    themeColor: "#1e40af",
  },
  "paisapop.com": {
    name: "PaisaPop",
    logoUrl:
      "https://s3-qa-8byte.s3.ap-south-1.amazonaws.com/production/165a2d32-d1bd-4287-b2db-104a7feee308/system/other-documents/affb1d7c-b08d-4fc0-b585-8b95d3c18e42-1757740643790.jpeg",
    description:
      "Best instant Personal Loan Solutions .Apply for a personal loan online with PaisaPop and get quick approval and disbursal. Experience hassle-free borrowing with our user-friendly platform and competitive interest rates. Whether you need funds for emergencies, education, or travel, PaisaPop is your trusted partner for fast and reliable personal loans.",
    title: "PaisaPop - Quick Loan Solutions",
    themeColor: "#059669",
  },
  "qualoan.com": {
    name: "QuaLoan",
    logoUrl:
      "https://8byte-public.s3.ap-south-1.amazonaws.com/images/qualoans.webp",
    title: "Best Personal Loans - QuaLoan",
    description:
      "Best instant Personal Loan Solutions.Apply for a personal loan online with QuaLoan and get quick approval and disbursal. Experience hassle-free borrowing with our user-friendly platform and competitive interest rates. Whether you need funds for emergencies, education, or travel, QuaLoan is your trusted partner for fast and reliable personal loans.",
    themeColor: "#dc2626",
  },
  "zeptofinance.com": {
    name: "Zepto Finance",
    logoUrl:
      "https://prod-zepoto-bucket.s3.ap-south-1.amazonaws.com/zepto_logo.png",
    title: "Zepto Finance - Personal Loans Made Easy",
    description:
      "Best instant Personal Loan Solutions .Apply for a personal loan online with Zepto Finance and get quick approval and disbursal. Experience hassle-free borrowing with our user-friendly platform and competitive interest rates. Whether you need funds for emergencies, education, or travel, Zepto Finance is your trusted partner for fast and reliable personal loans.",
    themeColor: "#f26a3e",
  },
};

// Function to get main domain (ignoring subdomains)
function getMainDomain(): string {
  const hostname = window.location.hostname;
  const parts = hostname.split(".");

  // If it has more than 2 parts (e.g., web.minutesloan.com), take the last 2
  if (parts.length > 2) {
    return parts.slice(-2).join(".");
  }

  return hostname;
}

// Function to get default brand config based on domain
function getDefaultBrandConfig(): DefaultBrandConfig | null {
  const mainDomain = getMainDomain();
  return DEFAULT_BRANDS[mainDomain] || null;
}

export function useBrandMeta() {
  const brand = useAppSelector((state) => state.index);
  const defaultBrand = getDefaultBrandConfig();

  const band = useMemo(
    () => ({
      name: brand.name || defaultBrand?.name || "",
      logoUrl: brand.logoUrl || defaultBrand?.logoUrl || "",
      description:
        brand.brandDetails.description || defaultBrand?.description || "",
      title: brand.brandDetails.title || defaultBrand?.title || "",
      themeColor:
        brand.brand_themes?.primaryColor ||
        defaultBrand?.themeColor ||
        "#ffffff",
    }),
    [brand, defaultBrand]
  );

  const meta = useMemo(
    () => ({
      title: band?.title || "",
      logo: band?.logoUrl || "/favicon.ico",
      description: band?.description || "",
      themeColor: band?.themeColor || "#ffffff",
    }),
    [band]
  );

  useLayoutEffect(() => {
    if (!meta) return;
    // Allow default brand config to work even without brand.id
    if (!brand.id && !defaultBrand) return;

    // Update <title>
    document.title = meta.title || "Personal Loans";

    // chang icon
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (link) {
      link.href = meta.logo || "";
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
  }, [meta, brand.id, defaultBrand]);
}
