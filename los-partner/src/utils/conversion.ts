export class Conversion {
    static formatCurrency(amount: number | string, currency: "BHD" | "INR" = "BHD"): string {
        let num = typeof amount === "string" ? Number.parseFloat(amount) : amount;

        // If input is in INR and we want to display in BHD, convert it
        if (currency === "BHD") {
            // Convert from INR to BHD (1 BHD = ₹242)
            const INR_TO_BHD_RATE = 242;
            num = num / INR_TO_BHD_RATE;
        }

        if (currency === "BHD") {
            const absNum = Math.abs(num || 0);

            if (absNum >= 1000000) {
                // Uses "M" for Million, "B" for Billion, "T" for Trillion
                return new Intl.NumberFormat("en-BH", {
                    style: "currency",
                    currency: "BHD",
                    notation: "compact",
                    compactDisplay: "short",
                    maximumFractionDigits: 2,
                }).format(num || 0);
            }

            return new Intl.NumberFormat("en-BH", {
                style: "currency",
                currency: "BHD",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(num || 0);
        }

        // For INR, use Indian numbering system with lakhs/crores
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(num || 0);
    }

    // Format INR with Lakh/Crore/Billion/Trillion notation
    static formatINRCurrency(amount: number | string): string {
        const num = typeof amount === "string" ? Number.parseFloat(amount) : amount;
        if (num === 0) return "₹0";
        if (!num || isNaN(num)) return "₹0";

        const absNum = Math.abs(num);

        // Trillions (10^12)
        if (absNum >= 1000000000000) {
            return `₹${(num / 1000000000000).toFixed(2)} T`;
        }

        // Billions (10^9)
        if (absNum >= 1000000000) {
            return `₹${(num / 1000000000).toFixed(2)} B`;
        }

        // Crores (10^7)
        if (absNum >= 10000000) {
            return `₹${(num / 10000000).toFixed(1)} Cr`;
        }

        // Lakhs (10^5)
        if (absNum >= 100000) {
            return `₹${(num / 100000).toFixed(1)} L`;
        }

        // Otherwise use regular formatting
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(num);
    }

    // Generic compact number formatter with support for K, M, B, T
    static formatCompactNumber(amount: number | string): string {
        const num = typeof amount === "string" ? Number.parseFloat(amount) : amount;
        return new Intl.NumberFormat("en-US", {
            notation: "compact",
            compactDisplay: "short",
            maximumFractionDigits: 2,
        }).format(num || 0);
    }

    // Format number with commas (Standard/Indian)
    static formatNumber(amount: number | string, locale: "en-IN" | "en-US" = "en-IN"): string {
        const num = typeof amount === "string" ? Number.parseFloat(amount) : amount;
        return new Intl.NumberFormat(locale).format(num || 0);
    }

    static isValidAadhaar = (name: string): string => {
        const upperName = name?.toUpperCase() || "";
        if (upperName.includes("AADHAAR")) {
            return "CPR";
        }
        if (upperName.includes("PAN")) { 
            return "CPR Validation";
        }
        return name;
    };
}

